import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuthStore, AuthUser } from '@/store/authStore';
import { saveRefreshToken, saveToken } from '@/utils/secureTokenStore';

const LOGIN_MUTATION = gql`
    mutation Login($email: String!, $password: String!) {
        login(input: { email: $email, password: $password }) {
            token
            refreshToken
            user {
                id
                firstName
                lastName
                email
                role
                businessId
                permissions
            }
            message
        }
    }
`;

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'BUSINESS_OWNER', 'BUSINESS_EMPLOYEE'];

export function useAuth() {
    const [loading, setLoading] = useState(false);
    const { login: storeLogin, logout: storeLogout } = useAuthStore();
    const [loginMutation] = useMutation(LOGIN_MUTATION);

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const { data } = await loginMutation({
                variables: { email, password },
            }) as any;

            const result = data?.login;
            if (!result?.token) {
                throw new Error(result?.message || 'Login failed');
            }

            const userRole = result.user?.role;
            if (!ADMIN_ROLES.includes(userRole)) {
                throw new Error('Access denied. Only administrators can access this app.');
            }

            const user: AuthUser = {
                id: result.user.id,
                firstName: result.user.firstName,
                lastName: result.user.lastName,
                email: result.user.email,
                role: userRole,
                businessId: result.user.businessId ?? null,
                permissions: result.user.permissions ?? [],
            };

            await saveToken(result.token);
            if (result.refreshToken) {
                await saveRefreshToken(result.refreshToken);
            }
            storeLogin(result.token, user);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await storeLogout();
    };

    return { login, logout, loading };
}
