import { useMutation } from '@apollo/client/react';
import { useAuthStore } from '@/store/authStore';
import { saveRefreshToken, saveToken } from '@/utils/secureTokenStore';
import { LOGIN_MUTATION } from '@/graphql/operations/auth/login';
import { UserRole } from '@/gql/graphql';

export function useAuth() {
    const { login: storeLogin, logout: storeLogout } = useAuthStore();

    const [loginMutation, { loading, error }] = useMutation(LOGIN_MUTATION);

    const login = async (email: string, password: string) => {
        const result = await loginMutation({
            variables: { input: { email, password } },
        });

        const loginData = result.data?.login;

        if (!loginData) {
            throw new Error('Login failed');
        }

        const { token, refreshToken, user } = loginData;

        if (user?.role !== UserRole.Driver) {
            throw new Error('Access denied. Driver account required.');
        }

        await saveToken(token);
        if (refreshToken) {
            await saveRefreshToken(refreshToken);
        }
        storeLogin(token, user);

        return loginData;
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
