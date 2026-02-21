import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

interface FavoritesState {
    favoriteIds: Set<string>;
    // Actions
    isFavorite: (id: string) => boolean;
    toggleFavorite: (id: string) => void;
    addFavorite: (id: string) => void;
    removeFavorite: (id: string) => void;
}

// Zustand persist can't serialize Set natively — we store as an array
interface PersistedFavoritesState {
    favoriteIdsArray: string[];
}

export const useFavoritesStore = create<FavoritesState>()(
    persist(
        (set, get) => ({
            favoriteIds: new Set<string>(),

            isFavorite: (id: string) => get().favoriteIds.has(id),

            toggleFavorite: (id: string) => {
                set((state) => {
                    const next = new Set(state.favoriteIds);
                    if (next.has(id)) {
                        next.delete(id);
                    } else {
                        next.add(id);
                    }
                    return { favoriteIds: next };
                });
            },

            addFavorite: (id: string) => {
                set((state) => {
                    if (state.favoriteIds.has(id)) return state;
                    const next = new Set(state.favoriteIds);
                    next.add(id);
                    return { favoriteIds: next };
                });
            },

            removeFavorite: (id: string) => {
                set((state) => {
                    if (!state.favoriteIds.has(id)) return state;
                    const next = new Set(state.favoriteIds);
                    next.delete(id);
                    return { favoriteIds: next };
                });
            },
        }),
        {
            name: 'favorites-storage',
            storage: createJSONStorage(() => AsyncStorage),
            // Serialize Set → array for storage
            partialize: (state) =>
                ({
                    favoriteIdsArray: Array.from(state.favoriteIds),
                } as unknown as FavoritesState),
            // Deserialize array → Set on rehydration
            merge: (persisted, current) => {
                const arr = (persisted as unknown as PersistedFavoritesState)?.favoriteIdsArray ?? [];
                return {
                    ...current,
                    favoriteIds: new Set(arr),
                };
            },
        },
    ),
);
