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
    hasHydrated: boolean;
    /**
     * Driver's online preference toggle ("I want to work")
     * Note: This is separate from the backend's connectionStatus
     * which is calculated based on whether the driver is actively sending location updates
     * 
     * - isOnline = user's preference (manual toggle)
     * - drivers.connectionStatus = system's calculation (automatic, based on heartbeat)
     */
    isOnline: boolean;

    setToken: (token: string) => void;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    setOnline: (online: boolean) => void;
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
            hasHydrated: false,
            isOnline: true,

            setToken: (token) => set({ token }),

            setUser: (user) => {
                const onlinePref = (user as any)?.driverConnection?.onlinePreference;
                set({
                    user,
                    isAuthenticated: isDriver(user),
                    isOnline: typeof onlinePref === 'boolean' ? onlinePref : true,
                });
            },

            setLoading: (isLoading) => set({ isLoading }),

            setOnline: (isOnline) => set({ isOnline }),

            login: (token, user) => {
                const onlinePref = (user as any)?.driverConnection?.onlinePreference;
                set({
                    token,
                    user,
                    isAuthenticated: isDriver(user),
                    isOnline: typeof onlinePref === 'boolean' ? onlinePref : true,
                });
            },

            logout: async () => {
                await deleteToken();
                set({
                    token: null,
                    user: null,
                    isAuthenticated: false,
                    isOnline: false,
                });
            },
        }),
        {
            name: 'driver-auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                token: state.token,
                user: state.user,
                isOnline: state.isOnline,
            }),
            onRehydrateStorage: () => (state) => {
                if (!state) {
                    return;
                }

                const onlinePref = (state.user as any)?.driverConnection?.onlinePreference;
                state.isAuthenticated = isDriver(state.user);
                state.isOnline = typeof onlinePref === 'boolean' ? onlinePref : state.isOnline;
                state.hasHydrated = true;
            },
        }
    )
);
