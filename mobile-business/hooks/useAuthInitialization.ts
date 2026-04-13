import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getValidAccessToken } from '@/lib/authSession';
import { apolloClient } from '@/lib/apollo';
import { GET_ME } from '@/graphql/auth';

/**
 * Hook to initialize authentication state on app startup
 * Restores auth from SecureStore and validates business user access
 */
export function useAuthInitialization() {
    const hasInitialized = useRef(false);
    const { setToken, logout, hasHydrated, user, setAuthInitComplete } = useAuthStore();

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

                // No token - clear state, navigation guard will redirect to login
                if (!token) {
                    console.log('[AuthInit] No token found, redirecting to login');
                    await logout();
                    setAuthInitComplete(true);
                    hasInitialized.current = true;
                    return;
                }

                // Has token but no user data - logout, navigation guard handles redirect
                if (!user) {
                    console.log('[AuthInit] Token found but no user data, logging out');
                    await logout();
                    setAuthInitComplete(true);
                    hasInitialized.current = true;
                    return;
                }

                // Validate business user role
                if (user.role !== 'BUSINESS_OWNER' && user.role !== 'BUSINESS_EMPLOYEE') {
                    console.log('[AuthInit] Invalid role, logging out');
                    await logout();
                    setAuthInitComplete(true);
                    hasInitialized.current = true;
                    return;
                }

                // Validate business association
                if (!user.businessId || !user.business) {
                    console.log('[AuthInit] No business association, logging out');
                    await logout();
                    setAuthInitComplete(true);
                    hasInitialized.current = true;
                    return;
                }

                // Server-side verification: confirm the token is still valid and the server
                // recognises this user with the expected role/business association.
                try {
                    const { data } = await apolloClient.query({
                        query: GET_ME,
                        fetchPolicy: 'network-only',
                    });
                    const serverUser = data?.me;
                    if (
                        !serverUser ||
                        (serverUser.role !== 'BUSINESS_OWNER' && serverUser.role !== 'BUSINESS_EMPLOYEE') ||
                        !serverUser.businessId
                    ) {
                        console.log('[AuthInit] Server me query failed business check, logging out');
                        await logout();
                        setAuthInitComplete(true);
                        hasInitialized.current = true;
                        return;
                    }
                } catch (meError) {
                    // Network unavailable — allow offline startup with local token
                    console.warn('[AuthInit] me query failed (offline?), proceeding with local token', meError);
                }

                // All good - load token into memory, navigation guard will route to tabs
                console.log('[AuthInit] Auth valid, user:', user.email, 'business:', user.business.name);
                setToken(token);
                setAuthInitComplete(true);
                hasInitialized.current = true;
            } catch (err) {
                console.error('[AuthInit] Auth initialization error:', err);
                await logout();
                setAuthInitComplete(true);
                hasInitialized.current = true;
            }
        };

        initializeAuth();
    }, [hasHydrated, logout, setToken, setAuthInitComplete, user]);
}
