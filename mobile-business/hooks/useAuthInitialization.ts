import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getValidAccessToken } from '@/lib/authSession';

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
