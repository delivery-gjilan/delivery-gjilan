import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItemOption {
    optionGroupId: string;
    optionGroupName: string;
    optionId: string;
    optionName: string;
    extraPrice: number;
}

export interface CartItem {
    id: string;
    productId: string;
    businessId: string;
    businessName: string;
    name: string;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    notes: string;
    selectedOptions: CartItemOption[];
    variantId?: string;
    variantName?: string;
}

interface CartState {
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    updateItemNotes: (id: string, notes: string) => void;
    clearCart: () => void;
    clearBusinessItems: (businessId: string) => void;
    getBusinessId: () => string | null;
    getTotal: () => number;
    getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (item) =>
                set((state) => {
                    // Check if same product with same options exists
                    const existing = state.items.find(
                        (i) =>
                            i.productId === item.productId &&
                            i.variantId === item.variantId &&
                            JSON.stringify(i.selectedOptions) === JSON.stringify(item.selectedOptions)
                    );
                    if (existing) {
                        return {
                            items: state.items.map((i) =>
                                i.id === existing.id ? { ...i, quantity: i.quantity + item.quantity } : i
                            ),
                        };
                    }
                    return { items: [...state.items, item] };
                }),

            removeItem: (id) =>
                set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

            updateQuantity: (id, quantity) =>
                set((state) => {
                    if (quantity <= 0) {
                        return { items: state.items.filter((i) => i.id !== id) };
                    }
                    return {
                        items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
                    };
                }),

            updateItemNotes: (id, notes) =>
                set((state) => ({
                    items: state.items.map((i) => (i.id === id ? { ...i, notes } : i)),
                })),

            clearCart: () => set({ items: [] }),

            clearBusinessItems: (businessId) =>
                set((state) => ({
                    items: state.items.filter((i) => i.businessId !== businessId),
                })),

            getBusinessId: () => {
                const { items } = get();
                return items.length > 0 ? items[0].businessId : null;
            },

            getTotal: () => {
                const { items } = get();
                return items.reduce((sum, item) => {
                    const optionsPrice = item.selectedOptions.reduce((s, o) => s + o.extraPrice, 0);
                    return sum + (item.unitPrice + optionsPrice) * item.quantity;
                }, 0);
            },

            getItemCount: () => {
                const { items } = get();
                return items.reduce((sum, item) => sum + item.quantity, 0);
            },
        }),
        { name: "cart-storage" }
    )
);
