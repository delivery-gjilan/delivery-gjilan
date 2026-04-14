import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';
import { User, UserRole } from '@/gql/graphql';
import { deleteTokens } from '@/utils/secureTokenStore';

export type DriverConnectionStatus = 'CONNECTED' | 'STALE' | 'LOST' | 'DISCONNECTED';

interface AuthState {
    token: string | null;
    user: User | null;
    isLoading: boolean;
    hasHydrated: boolean;
    isAuthenticated: boolean;
    /**
     * Driver's online preference toggle ("I want to work")
     * Note: This is separate from the backend's connectionStatus
     * which is calculated based on whether the driver is actively sending location updates
     *
     * - isOnline = user's preference (manual toggle)
     * - connectionStatus = system's calculation (automatic, based on heartbeat)
     */
    isOnline: boolean;
    /** Live heartbeat connection status, updated after every successful heartbeat response. */
    connectionStatus: DriverConnectionStatus;
    /** OS-level network connectivity (from NetInfo). */
    isNetworkConnected: boolean;
    /** True only while a live UI app session is mounted (not persisted). */
    appSessionActive: boolean;

    // Actions
    setToken: (token: string | null) => void;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    setOnline: (online: boolean) => void;
    setConnectionStatus: (status: DriverConnectionStatus) => void;
    setNetworkConnected: (connected: boolean) => void;
    setAppSessionActive: (active: boolean) => void;
    login: (token: string, user: User) => void;
    logout: () => void;
}

const isDriver = (user: User | null) => user?.role === UserRole.Driver;

/**
 * Calculate authentication status from token and user
 */
const calculateIsAuthenticated = (token: string | null, user: User | null): boolean => {
    return !!(token && user && isDriver(user));
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isLoading: false,
            hasHydrated: false,
            isAuthenticated: false,
            isOnline: false,
            connectionStatus: 'DISCONNECTED' as DriverConnectionStatus,
            isNetworkConnected: true,
            appSessionActive: false,

            setToken: (token) => {
                set((state) => ({
                    token,
                    isAuthenticated: calculateIsAuthenticated(token, state.user),
                }));
            },

            setUser: (user) => {
                const onlinePref = user?.driverConnection?.onlinePreference;
                set((state) => ({
                    user,
                    isAuthenticated: calculateIsAuthenticated(state.token, user),
                    isOnline: typeof onlinePref === 'boolean' ? onlinePref : state.isOnline,
                }));
            },

            setLoading: (isLoading) => set({ isLoading }),

            setOnline: (isOnline) => set({ isOnline }),

            setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

            setNetworkConnected: (isNetworkConnected) => set({ isNetworkConnected }),

            setAppSessionActive: (appSessionActive) => set({ appSessionActive }),

            login: (token, user) => {
                const onlinePref = user?.driverConnection?.onlinePreference;
                set({
                    token,
                    user,
                    isAuthenticated: calculateIsAuthenticated(token, user),
                    isOnline: typeof onlinePref === 'boolean' ? onlinePref : false,
                });
                console.log('[AuthStore] Login successful', { 
                    hasToken: !!token, 
                    hasUser: !!user, 
                    isDriver: isDriver(user),
                    isAuthenticated: calculateIsAuthenticated(token, user)
                });
            },

            logout: async () => {
                await deleteTokens();
                set({
                    token: null,
                    user: null,
                    isAuthenticated: false,
                    isOnline: false,
                    connectionStatus: 'DISCONNECTED',
                    appSessionActive: false,
                });
                console.log('[AuthStore] Logout successful');
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

                // Recalculate isAuthenticated after rehydration
                const onlinePref = state.user?.driverConnection?.onlinePreference;
                state.isAuthenticated = calculateIsAuthenticated(state.token, state.user);
                state.isOnline = typeof onlinePref === 'boolean' ? onlinePref : state.isOnline;
                state.hasHydrated = true;
                console.log('[AuthStore] Rehydrated', { 
                    isAuthenticated: state.isAuthenticated, 
                    hasToken: !!state.token,
                    hasUser: !!state.user 
                });
            },
        }
    )
);
