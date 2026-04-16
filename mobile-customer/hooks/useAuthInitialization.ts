import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useLazyQuery } from '@apollo/client/react';
import { ME_QUERY } from '@/graphql/operations/auth';
import { useRouter } from 'expo-router';
import { AppLanguage, SignupStep, type User } from '@/gql/graphql';
import { useLocaleStore } from '@/store/useLocaleStore';
import { getValidAccessToken } from '@/lib/graphql/authSession';

/**
 * Hook to initialize authentication state on app startup
 * Determines initial route based on token existence and user data
 */
export function useAuthInitialization() {
    const router = useRouter();
    const hasInitialized = useRef(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const { setToken, setUser, user, logout, hasHydrated } = useAuthStore();
    const setLanguageChoice = useLocaleStore((state) => state.setLanguageChoice);

    const [fetchMe, { data, error, loading }] = useLazyQuery(ME_QUERY, {
        fetchPolicy: 'network-only',
    });

    const getInitialRoute = (candidate: User): '/auth-selection' | '/(tabs)/home' | '/signup' => {
        if (candidate.isBanned) {
            return '/auth-selection';
        }
        return candidate.signupStep === SignupStep.Completed ? '/(tabs)/home' : '/signup';
    };

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
                const token = await getValidAccessToken();

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

        // If ME query fails but we have a persisted user, keep session and proceed.
        // This prevents forced logout on temporary network or backend issues.
        if (error || (data && !data.me)) {
            console.log('[AuthInit] ME query failed:', error?.message || 'No user data');

            if (user) {
                console.log('[AuthInit] Falling back to persisted user session');
                router.replace(getInitialRoute(user));
                setIsInitializing(false);
                hasInitialized.current = true;
                return;
            }

            // No persisted user available; route to auth selection without clearing token.
            // This ensures only explicit manual logout removes credentials.
            router.replace('/auth-selection');
            setIsInitializing(false);
            hasInitialized.current = true;
            return;
        }

        // Successfully fetched user data
        if (data?.me) {
            console.log('[AuthInit] ME query successful, user:', data.me.email, 'step:', data.me.signupStep);
            setUser(data.me as User);
            if (data.me.preferredLanguage === AppLanguage.Al) {
                setLanguageChoice('al');
            } else {
                setLanguageChoice('en');
            }

            // Redirect based on signup completion status
            const targetRoute = getInitialRoute(data.me as User);
            console.log('[AuthInit] Redirecting after ME query:', targetRoute);
            router.replace(targetRoute);

            setIsInitializing(false);
            hasInitialized.current = true;
        }
    }, [data, error, loading, router, setLanguageChoice, setUser, user]);

    return {
        isInitializing,
        error,
    };
}
