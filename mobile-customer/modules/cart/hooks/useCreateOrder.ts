import { useMutation } from '@apollo/client/react';
import { router } from 'expo-router';
import { CREATE_ORDER } from '@/graphql/operations/orders';
import { useCart } from './useCart';
import { useCartActions } from './useCartActions';
import { useActiveOrdersStore } from '@/modules/orders/store/activeOrdersStore';
import { useTranslations } from '@/hooks/useTranslations';
import { toast } from '@/store/toastStore';

export function useCreateOrder() {
    const { items } = useCart();
    const { clearCart } = useCartActions();
    const { hasActiveOrders } = useActiveOrdersStore();
    const { t } = useTranslations();

    const [createOrderMutation, { loading, error }] = useMutation(CREATE_ORDER);

    const createOrder = async (
        location: { latitude: number; longitude: number; address: string } | null,
        deliveryPrice: number,
        totalPrice: number,
        promoCode?: string | null,
    ) => {
        // Check if user already has an active order
        if (hasActiveOrders) {
            toast.warning(
                t.cart.active_order_exists_title,
                t.cart.active_order_exists_message,
            );
            throw new Error('Active order exists');
        }

        if (items.length === 0) {
            throw new Error('Cart is empty');
        }

        if (!location) {
            throw new Error('Location is required');
        }

        const orderItems = items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
        }));

        try {
            const result = await createOrderMutation({
                variables: {
                    input: {
                        items: orderItems,
                        dropOffLocation: {
                            latitude: location.latitude,
                            longitude: location.longitude,
                            address: location.address,
                        },
                        deliveryPrice,
                        totalPrice,
                        promoCode: promoCode || null,
                    },
                },
            });

            // Clear cart after successful order
            clearCart();

            // Immediately navigate to home to close cart screen
            router.replace('/(tabs)/home');

            // Show success toast after a brief delay to ensure navigation completes
            setTimeout(() => {
                toast.success(
                    t.cart.order_placed_title,
                    t.cart.order_placed_message,
                );
            }, 300);

            return result.data?.createOrder;
        } catch (err) {
            console.error('Failed to create order:', err);
            throw err;
        }
    };

    return {
        createOrder,
        loading,
        error,
    };
}
