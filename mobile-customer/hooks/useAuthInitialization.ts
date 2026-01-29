import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getToken } from '@/utils/secureTokenStore';
import { useLazyQuery } from '@apollo/client/react';
import { ME_QUERY } from '@/graphql/operations/auth';
import { useRouter } from 'expo-router';
import { SignupStep } from '@/gql/graphql';

/**
 * Hook to initialize authentication state on app startup
 * Determines initial route based on token existence and user data
 */
export function useAuthInitialization() {
    const router = useRouter();
    const hasInitialized = useRef(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const { setToken, setUser, logout } = useAuthStore();

    const [fetchMe, { data, error, loading }] = useLazyQuery(ME_QUERY, {
        fetchPolicy: 'network-only',
    });

    useEffect(() => {
        if (hasInitialized.current) {
            return;
        }

        const initializeAuth = async () => {
            try {
                // Get token from secure storage
                const token = await getToken();

                // No token - redirect to auth selection
                if (!token) {
                    await logout();
                    router.replace('/auth-selection');
                    setIsInitializing(false);
                    hasInitialized.current = true;
                    return;
                }

                // Has token - verify it by fetching user data
                setToken(token);
                fetchMe();
            } catch (err) {
                console.error('Auth initialization error:', err);
                await logout();
                router.replace('/auth-selection');
                setIsInitializing(false);
                hasInitialized.current = true;
            }
        };

        initializeAuth();
    }, [fetchMe, logout, router, setToken]);

    // Handle fetchMe response
    useEffect(() => {
        if (hasInitialized.current || loading) {
            return;
        }

        // If there's an error or no user data, logout and redirect
        if (error || (data && !data.me)) {
            const handleAuthFailure = async () => {
                await logout();
                router.replace('/auth-selection');
                setIsInitializing(false);
                hasInitialized.current = true;
            };
            handleAuthFailure();
            return;
        }

        // Successfully fetched user data
        if (data?.me) {
            setUser(data.me);

            // Redirect based on signup completion status
            if (data.me.signupStep === SignupStep.Completed) {
                router.replace('/(tabs)/home');
            } else {
                router.replace('/signup');
            }

            setIsInitializing(false);
            hasInitialized.current = true;
        }
    }, [data, error, loading, logout, router, setUser]);

    return {
        isInitializing,
        error,
    };
}
