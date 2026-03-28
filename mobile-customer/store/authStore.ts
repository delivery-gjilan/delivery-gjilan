import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';
import { User } from '@/gql/graphql';
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

interface AuthState {
    token: string | null;
    user: User | null;
    isLoading: boolean;
    needsSignupCompletion: boolean;
    isAuthenticated: boolean;
    hasHydrated: boolean; // Flag to know when Zustand has loaded from storage

    // Actions
    setToken: (token: string | null) => void;
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
            hasHydrated: false,

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
                await deleteTokens();
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
                // Only persist user data, NOT the token
                // Token is stored securely in SecureStore
                user: state.user,
            }),
            onRehydrateStorage: () => (state) => {
                if (!state) {
                    console.log('[AuthStore] Hydration failed');
                    return;
                }

                // Note: token will be null after hydration, that's OK
                // It gets loaded from SecureStore in useAuthInitialization
                state.isAuthenticated = false; // Will be set correctly after token is loaded
                state.needsSignupCompletion = !!state.user && state.user.signupStep !== 'COMPLETED';
                state.hasHydrated = true;
                
                console.log('[AuthStore] Hydrated (user only)', {
                    hasUser: !!state.user,
                    userEmail: state.user?.email,
                });
            },
        },
    ),
);
