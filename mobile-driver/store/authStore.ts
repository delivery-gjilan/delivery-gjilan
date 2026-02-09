import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';
import { User, UserRole } from '@/gql/graphql';
import { deleteToken } from '@/utils/secureTokenStore';

interface AuthState {
    token: string | null;
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    setToken: (token: string) => void;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    login: (token: string, user: User) => void;
    logout: () => void;
}

const isDriver = (user: User | null) => user?.role === UserRole.Driver;

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isLoading: false,
            isAuthenticated: false,

            setToken: (token) => set({ token }),

            setUser: (user) =>
                set({
                    user,
                    isAuthenticated: isDriver(user),
                }),

            setLoading: (isLoading) => set({ isLoading }),

            login: (token, user) =>
                set({
                    token,
                    user,
                    isAuthenticated: isDriver(user),
                }),

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
            name: 'driver-auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                token: state.token,
                user: state.user,
            }),
        }
    )
);
