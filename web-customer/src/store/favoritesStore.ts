import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FavoritesState {
    favorites: string[];
    toggleFavorite: (businessId: string) => void;
    isFavorite: (businessId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
    persist(
        (set, get) => ({
            favorites: [],
            toggleFavorite: (businessId) =>
                set((state) => {
                    const isFav = state.favorites.includes(businessId);
                    return {
                        favorites: isFav
                            ? state.favorites.filter((id) => id !== businessId)
                            : [...state.favorites, businessId],
                    };
                }),
            isFavorite: (businessId) => get().favorites.includes(businessId),
        }),
        { name: "favorites-storage" }
    )
);
