import { create } from 'zustand';
import { useCartDataStore } from './cartDataStore';
import { CartItem } from '../types';

interface CartActionsStore {
    addItem: (item: CartItem) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
}

export const useCartActionsStore = create<CartActionsStore>((set) => ({
    addItem: (item) => {
        useCartDataStore.setState((state) => {
            const existingItemIndex = state.items.findIndex((i) => i.productId === item.productId);

            if (existingItemIndex >= 0) {
                const newItems = [...state.items];
                const existingItem = newItems[existingItemIndex];
                if (existingItem) {
                    existingItem.quantity += item.quantity;
                }
                return { items: newItems };
            }

            return { items: [...state.items, item] };
        });
    },
    removeItem: (productId) => {
        useCartDataStore.setState((state) => ({
            items: state.items.filter((i) => i.productId !== productId),
        }));
    },
    updateQuantity: (productId, quantity) => {
        useCartDataStore.setState((state) => {
            if (quantity <= 0) {
                return {
                    items: state.items.filter((i) => i.productId !== productId),
                };
            }
            return {
                items: state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
            };
        });
    },
    clearCart: () => {
        useCartDataStore.setState({ items: [] });
    },
}));
