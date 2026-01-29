import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';
import { User } from '@/gql/graphql';
import { deleteToken } from '@/utils/secureTokenStore';

interface AuthState {
    token: string | null;
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    needsSignupCompletion: boolean;

    // Actions
    setToken: (token: string) => void;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isLoading: false,
            isAuthenticated: false,
            needsSignupCompletion: false,

            setToken: (token) => set({ token }),

            setUser: (user) =>
                set({
                    user,
                    isAuthenticated: !!user && user.signupStep === 'COMPLETED',
                    needsSignupCompletion: !!user && user.signupStep !== 'COMPLETED',
                }),

            setLoading: (isLoading) => set({ isLoading }),

            login: (token, user) =>
                set({
                    token,
                    user,
                    isAuthenticated: user.signupStep === 'COMPLETED',
                    needsSignupCompletion: user.signupStep !== 'COMPLETED',
                }),

            logout: async () => {
                await deleteToken();
                set({
                    token: null,
                    user: null,
                    isAuthenticated: false,
                    needsSignupCompletion: false,
                });
            },

            updateUser: (user) =>
                set({
                    user,
                    isAuthenticated: user.signupStep === 'COMPLETED',
                    needsSignupCompletion: user.signupStep !== 'COMPLETED',
                }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                token: state.token,
                user: state.user,
            }),
        },
    ),
);
