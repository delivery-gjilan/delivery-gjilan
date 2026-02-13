import { create } from 'zustand';

interface CartAnimationStore {
    triggerCount: number;
    triggerAnimation: () => void;
}

export const useCartAnimationStore = create<CartAnimationStore>((set) => ({
    triggerCount: 0,
    triggerAnimation: () => set((state) => ({ triggerCount: state.triggerCount + 1 })),
}));
