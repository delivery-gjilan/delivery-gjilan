export interface CartItem {
    productId: string;
    quantity: number;
    // We store minimal product info needed for display/logic without fetching again immediately
    // Ideally we fetch fresh data on cart view, but this is good for instant feedback
    price: number;
    originalPrice?: number; // Base price if on sale
    name: string;
    imageUrl?: string;
    businessId: string; // To group by business or validate single-business orders if needed
    businessType?: 'RESTAURANT' | 'MARKET' | 'PHARMACY'; // Needed for multi-restaurant validation
}

export type CartStoreState = {
    items: CartItem[];
};

export type CartActions = {
    addItem: (item: CartItem) => string | null; // returns error message or null
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
};
