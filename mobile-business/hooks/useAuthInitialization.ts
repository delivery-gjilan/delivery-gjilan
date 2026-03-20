import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { getValidAccessToken } from '@/lib/authSession';

/**
 * Hook to initialize authentication state on app startup
 * Restores auth from SecureStore and validates business user access
 */
export function useAuthInitialization() {
    const router = useRouter();
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

                // No token - redirect to login
                if (!token) {
                    console.log('[AuthInit] No token found, redirecting to login');
                    await logout();
                    setTimeout(() => router.replace('/login'), 0);
                    setAuthInitComplete(true);
                    hasInitialized.current = true;
                    return;
                }

                // Has token but no user data - logout and redirect
                if (!user) {
                    console.log('[AuthInit] Token found but no user data, logging out');
                    await logout();
                    setTimeout(() => router.replace('/login'), 0);
                    setAuthInitComplete(true);
                    hasInitialized.current = true;
                    return;
                }

                // Validate business user role
                if (user.role !== 'BUSINESS_OWNER' && user.role !== 'BUSINESS_EMPLOYEE') {
                    console.log('[AuthInit] Invalid role, logging out');
                    await logout();
                    setTimeout(() => router.replace('/login'), 0);
                    setAuthInitComplete(true);
                    hasInitialized.current = true;
                    return;
                }

                // Validate business association
                if (!user.businessId || !user.business) {
                    console.log('[AuthInit] No business association, logging out');
                    await logout();
                    setTimeout(() => router.replace('/login'), 0);
                    setAuthInitComplete(true);
                    hasInitialized.current = true;
                    return;
                }

                // All good - load token into memory and navigate to main app
                console.log('[AuthInit] Auth valid, user:', user.email, 'business:', user.business.name);
                setToken(token);
                setTimeout(() => router.replace('/(tabs)'), 0);
                setAuthInitComplete(true);
                hasInitialized.current = true;
            } catch (err) {
                console.error('[AuthInit] Auth initialization error:', err);
                await logout();
                setTimeout(() => router.replace('/login'), 0);
                setAuthInitComplete(true);
                hasInitialized.current = true;
            }
        };

        initializeAuth();
    }, [hasHydrated, logout, router, setToken, setAuthInitComplete, user]);
}
