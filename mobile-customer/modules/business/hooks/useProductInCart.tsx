import React, { useMemo } from 'react';
import { Alert } from 'react-native';
import { Product, BusinessType } from '@/gql/graphql';
import { useCart } from '@/modules/cart/hooks/useCart';
import { useCartActions } from '@/modules/cart/hooks/useCartActions';
import { getEffectiveProductPrice, getPreDiscountProductPrice } from '@/modules/product/utils/pricing';

export function useProductInCart(product: Partial<Product>, businessType?: BusinessType) {
    const { items } = useCart();
    const { addItem, updateQuantity } = useCartActions();

    const id = product.id ?? '';

    // Find the current quantity of this product in the cart (sum of all configurations)
    const quantity = useMemo(() => items.filter((item) => item.productId === id).reduce((sum, item) => sum + item.quantity, 0), [items, id]);
    const addToCart = () => {
        if (!id) return;
        const unitPrice = getEffectiveProductPrice(product);
        const preDiscountPrice = getPreDiscountProductPrice(product);

        const error = addItem({
            cartItemId: id, // Simple product (no options) uses productId as cartItemId
            productId: id,
            name: product.name ?? 'Unknown',
            unitPrice,
            quantity: 1,
            imageUrl: product.imageUrl || undefined,
            businessId: product.businessId ?? '',
            businessType: businessType,
            originalPrice: preDiscountPrice ?? undefined,
            selectedOptions: [],
        });

        if (error) {
            Alert.alert('Cannot Add Item', error);
        }
    };

    const incrementQuantity = () => {
        if (!id) return;
        // Simple case: increment the one with no options (cartItemId === productId)
        updateQuantity(id, quantity + 1);
    };

    const decrementQuantity = () => {
        if (!id) return;
        // Simple case: decrement the one with no options
        updateQuantity(id, quantity - 1);
    };

    return {
        quantity,
        addToCart,
        incrementQuantity,
        decrementQuantity,
        isInCart: quantity > 0,
    };
}
