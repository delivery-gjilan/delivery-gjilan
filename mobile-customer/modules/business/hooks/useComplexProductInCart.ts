import { useMemo } from 'react';
import { useCart } from '@/modules/cart/hooks/useCart';
import { useCartActions } from '@/modules/cart/hooks/useCartActions';

export function useComplexProductInCart(productId: string) {
    const { items } = useCart();
    const { updateQuantity } = useCartActions();

    const cartItems = useMemo(
        () => items.filter((item) => item.productId === productId),
        [items, productId],
    );

    const totalQuantity = useMemo(
        () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
        [cartItems],
    );

    // The last configuration added (last in array)
    const lastCartItem = cartItems.length > 0 ? cartItems[cartItems.length - 1] : undefined;

    const decrementLast = () => {
        if (!lastCartItem) return;
        updateQuantity(lastCartItem.cartItemId, lastCartItem.quantity - 1);
    };

    return {
        totalQuantity,
        cartItems,
        lastCartItem,
        decrementLast,
        isInCart: totalQuantity > 0,
    };
}
