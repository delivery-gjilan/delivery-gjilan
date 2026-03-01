import { create } from 'zustand';

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
    login: (user: AuthUser, token: string) => void;
    logout: () => void;
    updateUser: (user: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    login: (user, token) =>
        set({
            user,
            token,
            isAuthenticated: true,
        }),
    logout: () =>
        set({
            user: null,
            token: null,
              isAuthenticated: false,
        }),
    updateUser: (updates) =>
        set((state) => ({
            user: state.user ? { ...state.user, ...updates } : null,
        })),
}));
