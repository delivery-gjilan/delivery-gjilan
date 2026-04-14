import React, { useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Product, BusinessType } from '@/gql/graphql';
import { useCart } from '@/modules/cart/hooks/useCart';
import { useCartActions } from '@/modules/cart/hooks/useCartActions';
import { getEffectiveProductPrice, getPreDiscountProductPrice } from '@/modules/product/utils/pricing';
import { useActiveOrdersStore } from '@/modules/orders/store/activeOrdersStore';
import { useTranslations } from '@/hooks/useTranslations';

export function useProductInCart(product: Partial<Product>, businessType?: BusinessType) {
    const { items } = useCart();
    const { addItem, updateQuantity } = useCartActions();
    const { t } = useTranslations();
    const router = useRouter();
    const hasActiveOrders = useActiveOrdersStore((state) => state.hasActiveOrders);
    const activeOrders = useActiveOrdersStore((state) => state.activeOrders);

    const id = product.id ?? '';

    // Find the current quantity of this product in the cart (sum of all configurations)
    const quantity = useMemo(() => items.filter((item) => item.productId === id).reduce((sum, item) => sum + item.quantity, 0), [items, id]);
    const addToCart = () => {
        if (!id) return;

        if (hasActiveOrders) {
            const activeOrderId = activeOrders[0]?.id ? String(activeOrders[0].id) : null;
            Alert.alert(
                t.cart.active_order_exists_title,
                t.cart.active_order_exists_message,
                [
                    {
                        text: t.orders.details.view_order,
                        onPress: () => {
                            if (activeOrderId) {
                                router.push({ pathname: '/orders/[orderId]', params: { orderId: activeOrderId } } as never);
                            }
                        },
                    },
                    { text: t.common.ok, style: 'cancel' },
                ],
            );
            return;
        }

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
