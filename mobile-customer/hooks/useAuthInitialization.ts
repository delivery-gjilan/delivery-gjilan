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
    const { setToken, setUser, logout, hasHydrated } = useAuthStore();

    const [fetchMe, { data, error, loading }] = useLazyQuery(ME_QUERY, {
        fetchPolicy: 'network-only',
    });

    useEffect(() => {
        if (hasInitialized.current) {
            return;
        }

        // Wait for Zustand to hydrate before checking auth
        if (!hasHydrated) {
            console.log('[AuthInit] Waiting for store hydration...');
            return;
        }

        const initializeAuth = async () => {
            try {
                console.log('[AuthInit] Starting auth initialization');
                
                // Load token from SecureStore (single source of truth for tokens)
                const token = await getToken();

                // No token - redirect to auth selection
                if (!token) {
                    console.log('[AuthInit] No token found, redirecting to auth');
                    await logout();
                    router.replace('/auth-selection');
                    setIsInitializing(false);
                    hasInitialized.current = true;
                    return;
                }

                // Has token - load into memory and verify
                console.log('[AuthInit] Token found in SecureStore, verifying with ME query');
                setToken(token);
                fetchMe();
            } catch (err) {
                console.error('[AuthInit] Auth initialization error:', err);
                await logout();
                router.replace('/auth-selection');
                setIsInitializing(false);
                hasInitialized.current = true;
            }
        };

        initializeAuth();
    }, [fetchMe, logout, router, setToken, hasHydrated]);

    // Handle fetchMe response
    useEffect(() => {
        if (hasInitialized.current || loading) {
            return;
        }

        // If there's an error or no user data, logout and redirect
        if (error || (data && !data.me)) {
            console.log('[AuthInit] ME query failed:', error?.message || 'No user data');
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
            console.log('[AuthInit] ME query successful, user:', data.me.email, 'step:', data.me.signupStep);
            setUser(data.me as any);

            // Redirect based on signup completion status
            if (data.me.signupStep === SignupStep.Completed) {
                console.log('[AuthInit] Signup complete, redirecting to home');
                router.replace('/(tabs)/home');
            } else {
                console.log('[AuthInit] Signup incomplete, redirecting to signup');
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
