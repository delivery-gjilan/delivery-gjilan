import { create } from 'zustand';
import { useCartDataStore } from './cartDataStore';
import { useCartAnimationStore } from './cartAnimationStore';
import { CartItem } from '../types';
import * as Haptics from 'expo-haptics';

/**
 * Check whether adding `newItem` would violate the multi-restaurant rule.
 * Rule: only ONE restaurant is allowed in the cart (markets/pharmacies are always OK).
 * Returns an error message string if blocked, or null if allowed.
 */
function validateMultiRestaurant(currentItems: CartItem[], newItem: CartItem): string | null {
    // If the new item is not from a restaurant, always allow
    if (newItem.businessType && newItem.businessType !== 'RESTAURANT') return null;

    // If the new product already exists in the cart (same productId), it's an increment — allow
    if (currentItems.some((i) => i.productId === newItem.productId)) return null;

    const restaurantBusinessIds = new Set(
        currentItems.filter((i) => !i.businessType || i.businessType === 'RESTAURANT').map((i) => i.businessId),
    );

    if (restaurantBusinessIds.size > 0 && !restaurantBusinessIds.has(newItem.businessId)) {
        return (
            'You can only order from one restaurant at a time. ' +
            'Please clear your cart or finish your current order first.'
        );
    }

    return null;
}

interface CartActionsStore {
    addItem: (item: CartItem) => string | null; // returns error message or null
    removeItem: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    updateItemNotes: (cartItemId: string, notes: string) => void;
    clearCart: () => void;
}

export const useCartActionsStore = create<CartActionsStore>((set) => ({
    addItem: (item) => {
        // Validate multi-restaurant restriction
        const currentItems = useCartDataStore.getState().items;
        const error = validateMultiRestaurant(currentItems, item);
        if (error) return error;

        useCartDataStore.setState((state) => {
            // Find item by cartItemId to update quantity if it's the exact same item instance
            const existingItemIndex = state.items.findIndex((i) => i.cartItemId === item.cartItemId);

            if (existingItemIndex >= 0) {
                const newItems = [...state.items];
                const existingItem = newItems[existingItemIndex];
                if (existingItem) {
                    existingItem.quantity += item.quantity;
                }
                return { items: newItems };
            }

            // If not an existing item instance, add it as a new item
            return { items: [...state.items, item] };
        });

        // Trigger animation and haptic feedback
        useCartAnimationStore.getState().triggerAnimation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return null;
    },
    removeItem: (cartItemId) => {
        useCartDataStore.setState((state) => ({
            items: state.items.filter((i) => i.cartItemId !== cartItemId),
        }));
    },
    updateQuantity: (cartItemId, quantity) => {
        useCartDataStore.setState((state) => {
            if (quantity <= 0) {
                return {
                    items: state.items.filter((i) => i.cartItemId !== cartItemId),
                };
            }
            return {
                items: state.items.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity } : i)),
            };
        });
    },
    updateItemNotes: (cartItemId, notes) => {
        useCartDataStore.setState((state) => ({
            items: state.items.map((i) => (i.cartItemId === cartItemId ? { ...i, notes } : i)),
        }));
    },
    clearCart: () => {
        useCartDataStore.setState({ items: [] });
    },
}));
