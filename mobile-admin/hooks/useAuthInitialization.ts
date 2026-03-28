import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { getValidAccessToken } from '@/lib/graphql/authSession';

/**
 * Hook to initialize authentication state on app startup
 * Restores auth from SecureStore and validates admin user access
 */
export function useAuthInitialization() {
    const router = useRouter();
    const hasInitialized = useRef(false);
    const { setToken, logout, hasHydrated, user, setAuthInitComplete } = useAuthStore();

    useEffect(() => {
        if (hasHydrated) return;

        // Fallback: if persist rehydration does not complete, do not block app navigation forever.
        const timeout = setTimeout(() => {
            if (!useAuthStore.getState().hasHydrated) {
                console.warn('[AuthInit] Hydration timeout reached, forcing hydration state');
                useAuthStore.setState({ hasHydrated: true });
            }
        }, 2000);

        return () => clearTimeout(timeout);
    }, [hasHydrated]);

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

                // No token - redirect to login
                if (!token) {
                    console.log('[AuthInit] No token found, redirecting to login');
                    await logout();
                    router.replace('/login');
                    setAuthInitComplete(true);
                    hasInitialized.current = true;
                    return;
                }

                // Has token but no user data - logout and redirect
                if (!user) {
                    console.log('[AuthInit] Token found but no user data, logging out');
                    await logout();
                    router.replace('/login');
                    setAuthInitComplete(true);
                    hasInitialized.current = true;
                    return;
                }

                // Validate admin user role
                const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'BUSINESS_OWNER', 'BUSINESS_EMPLOYEE'];
                if (!ADMIN_ROLES.includes(user.role)) {
                    console.log('[AuthInit] Invalid role for admin app, logging out');
                    await logout();
                    router.replace('/login');
                    setAuthInitComplete(true);
                    hasInitialized.current = true;
                    return;
                }

                // All good - load token into memory and navigate to main app
                console.log('[AuthInit] Auth valid, admin user:', user.email, 'role:', user.role);
                setToken(token);
                router.replace('/(tabs)/map');
                setAuthInitComplete(true);
                hasInitialized.current = true;
            } catch (err) {
                console.error('[AuthInit] Auth initialization error:', err);
                await logout();
                router.replace('/login');
                setAuthInitComplete(true);
                hasInitialized.current = true;
            }
        };

        initializeAuth();
    }, [hasHydrated, logout, router, setToken, setAuthInitComplete, user]);
}
