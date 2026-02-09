import { useMutation } from '@apollo/client/react';
import { useAuthStore } from '@/store/authStore';
import { saveToken } from '@/utils/secureTokenStore';
import { LOGIN_MUTATION } from '@/graphql/operations/auth/login';
import { User, UserRole } from '@/gql/graphql';

export function useAuth() {
    const { login: storeLogin, logout: storeLogout } = useAuthStore();

    const [loginMutation, { loading, error }] = useMutation(LOGIN_MUTATION);

    const login = async (email: string, password: string) => {
        const result = await loginMutation({
            variables: { input: { email, password } },
        });

        const data = result.data as any;

        if (!data?.login) {
            throw new Error('Login failed');
        }

        const { token, user } = data.login;

        if (user?.role !== UserRole.Driver) {
            throw new Error('Access denied. Driver account required.');
        }

        await saveToken(token);
        storeLogin(token, user as User);

        return data.login;
    };

    const logout = async () => {
        await storeLogout();
    };

    return {
        login,
        logout,
        loading,
        error: error?.message,
    };
}
