import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deleteToken } from '@/utils/secureTokenStore';

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

    setToken: (token: string) => void;
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
                set((state) => ({
                    token,
                    isAuthenticated: calculateIsAuthenticated(token, state.user),
                }));
            },

            setUser: (user) => {
                set((state) => ({
                    user,
                    isAuthenticated: calculateIsAuthenticated(state.token, user),
                }));
            },

            setLoading: (isLoading) => set({ isLoading }),

            login: (token, user) => {
                set({
                    token,
                    user,
                    isAuthenticated: calculateIsAuthenticated(token, user),
                });
            },

            logout: async () => {
                await deleteToken();
                set({
                    token: null,
                    user: null,
                    isAuthenticated: false,
                });
            },
        }),
        {
            name: 'admin-auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                token: state.token,
                user: state.user,
            }),
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                state.isAuthenticated = calculateIsAuthenticated(state.token, state.user);
                state.hasHydrated = true;
            },
        },
    ),
);
