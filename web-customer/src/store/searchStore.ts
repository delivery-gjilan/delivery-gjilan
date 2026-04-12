import { create } from "zustand";

interface SearchState {
    query: string;
    setQuery: (q: string) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
    query: "",
    setQuery: (q) => set({ query: q }),
}));
