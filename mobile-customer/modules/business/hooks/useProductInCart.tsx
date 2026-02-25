import { useMemo } from 'react';
import { Alert } from 'react-native';
import { Product, BusinessType } from '@/gql/graphql';
import { useCart } from '@/modules/cart/hooks/useCart';
import { useCartActions } from '@/modules/cart/hooks/useCartActions';

export function useProductInCart(product: Partial<Product>, businessType?: BusinessType) {
    const { items } = useCart();
    const { addItem, updateQuantity } = useCartActions();

    const id = product.id ?? '';

    // Find the current quantity of this product in the cart
    const quantity = useMemo(() => {
        const cartItem = items.find((item) => item.productId === id);
        return cartItem?.quantity || 0;
    }, [items, id]);

    const addToCart = () => {
        if (!id) return;
        const price = product.isOnSale && product.salePrice ? product.salePrice : (product.price ?? 0);

        const error = addItem({
            productId: id,
            name: product.name ?? 'Unknown',
            price,
            quantity: 1,
            imageUrl: product.imageUrl || undefined,
            businessId: product.businessId ?? '',
            businessType: businessType,
            originalPrice: product.isOnSale && product.salePrice ? product.price : undefined,
        });

        if (error) {
            Alert.alert('Cannot Add Item', error);
        }
    };

    const incrementQuantity = () => {
        if (!id) return;
        updateQuantity(id, quantity + 1);
    };

    const decrementQuantity = () => {
        if (!id) return;
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
