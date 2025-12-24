import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import { useCart } from '@/modules/cart/hooks/useCart';
import { useCartActions } from '@/modules/cart/hooks/useCartActions';
import { Product } from '@/gql/graphql';

export function useProductActions(product: Product) {
    const { items } = useCart();
    const { addItem, updateQuantity, removeItem } = useCartActions();

    // Find cart item
    const cartItem = useMemo(() => {
        return items.find((item) => item.productId === product.id);
    }, [items, product.id]);

    // Local quantity state
    const [localQuantity, setLocalQuantity] = useState(cartItem?.quantity || 1);

    const isInCart = !!cartItem;
    const hasQuantityChanged = isInCart && cartItem.quantity !== localQuantity;

    const incrementQuantity = () => {
        setLocalQuantity((prev) => prev + 1);
    };

    const decrementQuantity = () => {
        setLocalQuantity((prev) => Math.max(1, prev - 1));
    };

    const addToCart = () => {
        addItem({
            productId: product.id,
            name: product.name,
            price: product.isOnSale && product.salePrice ? product.salePrice : product.price,
            quantity: localQuantity,
            imageUrl: product.imageUrl || undefined,
            businessId: product.businessId,
            originalPrice: product.isOnSale && product.salePrice ? product.price : undefined,
        });

        // Navigate back to business page with animation
        router.push(`/business/${product.businessId}`);
    };

    const updateCart = () => {
        updateQuantity(product.id, localQuantity);

        // Navigate back to business page with animation
        router.push(`/business/${product.businessId}`);
    };

    const removeFromCart = () => {
        removeItem(product.id);
        setLocalQuantity(1);
    };

    return {
        localQuantity,
        cartQuantity: cartItem?.quantity || 0,
        isInCart,
        hasQuantityChanged,
        incrementQuantity,
        decrementQuantity,
        addToCart,
        updateCart,
        removeFromCart,
    };
}
