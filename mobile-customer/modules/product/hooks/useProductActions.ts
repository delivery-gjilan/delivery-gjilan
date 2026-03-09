import { useState, useMemo } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@apollo/client/react';
import { useCart } from '@/modules/cart/hooks/useCart';
import { useCartActions } from '@/modules/cart/hooks/useCartActions';
import { Product } from '@/gql/graphql';
import { GET_BUSINESS } from '@/graphql/operations/businesses';
import { useTranslations } from '@/hooks/useTranslations';

export function useProductActions(product: Partial<Product>) {
    const { items } = useCart();
    const { addItem, updateQuantity, removeItem } = useCartActions();
    const { t } = useTranslations();

    // Fetch business type (should be cached from business screen)
    const { data: businessData } = useQuery(GET_BUSINESS, {
        variables: { id: product.businessId ?? '' },
        skip: !product.businessId,
        fetchPolicy: 'cache-first',
    });
    const businessType = businessData?.business?.businessType;

    // Find cart item
    const id = product.id ?? '';
    const cartItem = useMemo(() => {
        return items.find((item) => item.productId === id);
    }, [items, id]);

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
        if (!id) return;
        const error = addItem({
            productId: id,
            name: product.name ?? 'Unknown',
            price: product.isOnSale && product.salePrice ? product.salePrice : (product.price ?? 0),
            quantity: localQuantity,
            imageUrl: product.imageUrl || undefined,
            businessId: product.businessId ?? '',
            businessType: businessType,
            originalPrice: product.isOnSale && product.salePrice ? product.price : undefined,
        });

        if (error) {
            Alert.alert(t.product.cannot_add_item, error);
            return;
        }

        // Navigate back to previous screen
        router.back();
    };

    const updateCart = () => {
        if (!id) return;
        updateQuantity(id, localQuantity);

        // Navigate back to previous screen
        router.back();
    };

    const removeFromCart = () => {
        if (!id) return;
        removeItem(id);
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
