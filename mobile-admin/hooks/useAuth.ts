import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuthStore, AuthUser } from '@/store/authStore';
import { saveRefreshToken, saveToken } from '@/utils/secureTokenStore';
import { ADMIN_ROLES } from '@/utils/constants';

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

type LoginResult = {
    login: {
        token?: string | null;
        refreshToken?: string | null;
        message?: string | null;
        user?: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            role: string;
            businessId?: string | null;
            permissions?: string[] | null;
        } | null;
    } | null;
};

export function useAuth() {
    const [loading, setLoading] = useState(false);
    const { login: storeLogin, logout: storeLogout } = useAuthStore();
    const [loginMutation] = useMutation<LoginResult>(LOGIN_MUTATION);

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const { data } = await loginMutation({
                variables: { email, password },
            });

            const result = data?.login;
            if (!result?.token) {
                throw new Error(result?.message || 'Login failed');
            }

            const userRole = result.user?.role;
            if (!userRole || !ADMIN_ROLES.includes(userRole as (typeof ADMIN_ROLES)[number])) {
                throw new Error('Access denied. Only administrators can access this app.');
            }

            if (!result.user) {
                throw new Error('Login failed: missing user data');
            }

            const user: AuthUser = {
                id: result.user.id,
                firstName: result.user.firstName,
                lastName: result.user.lastName,
                email: result.user.email,
                role: userRole as AuthUser['role'],
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
