import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deleteTokens } from '@/utils/secureTokenStore';

/**
 * Authentication Store
 * 
 * IMPORTANT: Token is stored ONLY in SecureStore (via utils/secureTokenStore)
 * - More secure (uses iOS Keychain / Android Keystore)
 * - Single source of truth
 * - Only persists user data in AsyncStorage (via Zustand)
 * 
 * Flow:
 * 1. On login: Save token to SecureStore + update Zustand state
 * 2. On app start: Load token from SecureStore → Zustand state
 * 3. On logout: Clear SecureStore + clear Zustand state
 */

export interface Business {
    id: string;
    name: string;
    imageUrl?: string;
    businessType: string;
    isActive: boolean;
}

export interface AuthUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    businessId: string | null;
    business?: Business;
}

interface AuthStore {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    hasHydrated: boolean;
    login: (user: AuthUser, token: string) => void;
    logout: () => Promise<void>;
    updateUser: (user: Partial<AuthUser>) => void;
    setToken: (token: string | null) => void;
}

const calculateIsAuthenticated = (token: string | null, user: AuthUser | null): boolean => {
    if (!token || !user) return false;
    // Business users must have a businessId and proper role
    return !!(
        user.businessId &&
        (user.role === 'BUSINESS_OWNER' || user.role === 'BUSINESS_EMPLOYEE')
    );
};

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            hasHydrated: false,

            setToken: (token) => {
                set((state) => ({
                    token,
                    isAuthenticated: calculateIsAuthenticated(token, state.user),
                }));
            },

            login: (user, token) => {
                set({
                    user,
                    token,
                    isAuthenticated: calculateIsAuthenticated(token, user),
                });
                console.log('[AuthStore] Login:', user.email);
            },

            logout: async () => {
                console.log('[AuthStore] Logging out');
                try {
                    await deleteTokens();
                } catch (error) {
                    console.error('[AuthStore] Error deleting token:', error);
                }
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                });
            },

            updateUser: (updates) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...updates } : null,
                })),
        }),
        {
            name: 'business-auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                // Only persist user data, NOT the token
                // Token is stored securely in SecureStore
                user: state.user,
            }),
            onRehydrateStorage: () => (state) => {
                if (!state) {
                    console.log('[AuthStore] Hydration failed');
                    return;
                }

                // Token will be loaded from SecureStore separately
                state.isAuthenticated = false; // Will be set correctly after token is loaded
                state.hasHydrated = true;
                
                console.log('[AuthStore] Hydrated (user only)', {
                    hasUser: !!state.user,
                    userEmail: state.user?.email,
                    businessName: state.user?.business?.name,
                });
            },
        },
    ),
);
