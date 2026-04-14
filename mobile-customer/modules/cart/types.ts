export interface CartItemOption {
    optionGroupId: string;
    optionId: string;
    name: string;
    extraPrice: number;
}

export interface CartItem {
    cartItemId: string; // Unique identifier for this specific configuration in the cart
    productId: string;
    quantity: number;
    unitPrice: number; // Price of the base product at the time of adding to cart
    originalPrice?: number; // Base price if on sale
    name: string;
    imageUrl?: string;
    businessId: string; // To group by business or validate single-business orders if needed
    businessType?: 'RESTAURANT' | 'MARKET' | 'PHARMACY'; // Needed for multi-restaurant validation
    notes?: string; // Special instructions for this item
    selectedOptions: CartItemOption[];
    childItems?: {
        productId: string;
        name: string;
        imageUrl?: string;
        selectedOptions: CartItemOption[];
    }[];
}

export interface PromoResult {
    promotionId: string | null;
    promotionIds: string[];
    code: string;
    promotionSummary: string | null;
    deliveryPromotionSummary: string | null;
    orderDiscountAmount: number;
    deliveryDiscountAmount: number;
    autoApplyReason?: string | null;
    selectionReason?: string | null;
    discountAmount: number;
    freeDeliveryApplied: boolean;
    effectiveDeliveryPrice: number;
    totalPrice: number;
    source: 'eligible' | 'manual';
}

export type CartStoreState = {
    items: CartItem[];
};

export type CartActions = {
    addItem: (item: CartItem) => string | null; // returns error message or null
    removeItem: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    updateItemNotes: (cartItemId: string, notes: string) => void;
    clearCart: () => void;
};
