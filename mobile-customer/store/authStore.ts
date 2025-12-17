import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
    token: string | null;
    setToken: (token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMWIyOTYwNi05ZTZiLTQ2NzMtODc4MC1iMTdmMzRjMWRkZDQiLCJpYXQiOjE3NjU0ODUyMzd9.-jf8xxTCXKfpyou7C5S0OmnOowNXhx8aJRpf0kmNLGw', // Default token for testing
            setToken: (token) => set({ token }),
            logout: () => set({ token: null }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
        },
    ),
);
