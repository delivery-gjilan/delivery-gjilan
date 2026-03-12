import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deleteTokens } from '@/utils/secureTokenStore';

export type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'BUSINESS_EMPLOYEE';

export interface AuthUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    businessId?: string | null;
    permissions?: string[];
}

interface AuthState {
    token: string | null;
    user: AuthUser | null;
    isLoading: boolean;
    hasHydrated: boolean;
    isAuthenticated: boolean;

    setToken: (token: string | null) => void;
    setUser: (user: AuthUser | null) => void;
    setLoading: (loading: boolean) => void;
    login: (token: string, user: AuthUser) => void;
    logout: () => void;
}

const ADMIN_ROLES: UserRole[] = ['ADMIN', 'SUPER_ADMIN', 'BUSINESS_OWNER', 'BUSINESS_EMPLOYEE'];

const calculateIsAuthenticated = (token: string | null, user: AuthUser | null): boolean => {
    return !!(token && user && ADMIN_ROLES.includes(user.role));
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isLoading: false,
            hasHydrated: false,
            isAuthenticated: false,

            setToken: (token) => {
                console.log('[AuthStore] Setting token:', token ? 'present' : 'null');
                set((state) => ({
                    token,
                    isAuthenticated: calculateIsAuthenticated(token, state.user),
                }));
            },

            setUser: (user) => {
                console.log('[AuthStore] Setting user:', user ? user.email : 'null');
                set((state) => ({
                    user,
                    isAuthenticated: calculateIsAuthenticated(state.token, user),
                }));
            },

            setLoading: (isLoading) => set({ isLoading }),

            login: (token, user) => {
                console.log('[AuthStore] Logging in:', user.email);
                set({
                    token,
                    user,
                    isAuthenticated: calculateIsAuthenticated(token, user),
                });
            },

            logout: async () => {
                console.log('[AuthStore] Logging out...');
                await deleteTokens();
                set({
                    token: null,
                    user: null,
                    isAuthenticated: false,
                });
                console.log('[AuthStore] Logged out successfully');
            },
        }),
        {
            name: 'admin-auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            // Only persist user data, NOT the token - token stored securely in SecureStore
            partialize: (state) => ({
                user: state.user,
            }),
            onRehydrateStorage: () => (state) => {
                console.log('[AuthStore] Starting rehydration...');
                return () => {
                    if (!state) {
                        console.log('[AuthStore] Rehydration failed - no state');
                        return;
                    }
                    // Token will be loaded separately from SecureStore on app startup
                    console.log('[AuthStore] Hydrated with user:', state.user?.email || 'none');
                    state.hasHydrated = true;
                };
            },
        },
    ),
);
