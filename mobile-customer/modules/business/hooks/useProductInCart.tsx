import { useMemo } from 'react';
import { Product } from '@/gql/graphql';
import { useCart } from '@/modules/cart/hooks/useCart';
import { useCartActions } from '@/modules/cart/hooks/useCartActions';

export function useProductInCart(product: Product) {
    const { items } = useCart();
    const { addItem, updateQuantity } = useCartActions();

    // Find the current quantity of this product in the cart
    const quantity = useMemo(() => {
        const cartItem = items.find((item) => item.productId === product.id);
        return cartItem?.quantity || 0;
    }, [items, product.id]);

    const addToCart = () => {
        const price = product.isOnSale && product.salePrice ? product.salePrice : product.price;

        addItem({
            productId: product.id,
            name: product.name,
            price,
            quantity: 1,
            imageUrl: product.imageUrl || undefined,
            businessId: product.businessId,
            originalPrice: product.isOnSale && product.salePrice ? product.price : undefined,
        });
    };

    const incrementQuantity = () => {
        updateQuantity(product.id, quantity + 1);
    };

    const decrementQuantity = () => {
        updateQuantity(product.id, quantity - 1);
    };

    return {
        quantity,
        addToCart,
        incrementQuantity,
        decrementQuantity,
        isInCart: quantity > 0,
    };
}
