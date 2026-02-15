import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';
import { User } from '@/gql/graphql';
import { deleteToken } from '@/utils/secureTokenStore';

interface AuthState {
    token: string | null;
    user: User | null;
    isLoading: boolean;
    needsSignupCompletion: boolean;
    isAuthenticated: boolean;

    // Actions
    setToken: (token: string) => void;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
}

/**
 * Calculate authentication status from token and user signup step
 */
const calculateIsAuthenticated = (token: string | null, user: User | null): boolean => {
    return !!(token && user && user.signupStep === 'COMPLETED');
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isLoading: false,
            needsSignupCompletion: false,
            isAuthenticated: false,

            setToken: (token) => {
                set((state) => ({
                    token,
                    isAuthenticated: calculateIsAuthenticated(token, state.user),
                }));
            },

            setUser: (user) =>
                set((state) => ({
                    user,
                    needsSignupCompletion: !!user && user.signupStep !== 'COMPLETED',
                    isAuthenticated: calculateIsAuthenticated(state.token, user),
                })),

            setLoading: (isLoading) => set({ isLoading }),

            login: (token, user) =>
                set({
                    token,
                    user,
                    needsSignupCompletion: user.signupStep !== 'COMPLETED',
                    isAuthenticated: calculateIsAuthenticated(token, user),
                }),

            logout: async () => {
                await deleteToken();
                set({
                    token: null,
                    user: null,
                    needsSignupCompletion: false,
                    isAuthenticated: false,
                });
            },

            updateUser: (user) =>
                set((state) => ({
                    user,
                    needsSignupCompletion: user.signupStep !== 'COMPLETED',
                    isAuthenticated: calculateIsAuthenticated(state.token, user),
                })),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                token: state.token,
                user: state.user,
            }),
            onRehydrateStorage: () => (state) => {
                if (!state) {
                    return;
                }

                // Recalculate isAuthenticated and needsSignupCompletion after rehydration
                state.isAuthenticated = calculateIsAuthenticated(state.token, state.user);
                state.needsSignupCompletion = !!state.user && state.user.signupStep !== 'COMPLETED';
            },
        },
    ),
);
