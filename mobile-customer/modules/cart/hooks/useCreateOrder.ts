import { useMutation } from '@apollo/client/react';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { CREATE_ORDER } from '@/graphql/operations/orders';
import { useCart } from './useCart';
import { useCartActions } from './useCartActions';
import { useActiveOrdersStore } from '@/modules/orders/store/activeOrdersStore';

export function useCreateOrder() {
    const { items, total } = useCart();
    const { clearCart } = useCartActions();
    const { hasActiveOrders } = useActiveOrdersStore();

    const [createOrderMutation, { loading, error }] = useMutation(CREATE_ORDER);

    const createOrder = async (
        location: { latitude: number; longitude: number; address: string } | null,
        deliveryPrice = 2.0,
        discountAmount = 0,
    ) => {
        // Check if user already has an active order
        if (hasActiveOrders) {
            Alert.alert(
                '⚠️ Active Order Exists',
                'You already have an active order. Please wait for it to be delivered before placing a new order.',
                [{ text: 'OK' }]
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

        const normalizedDiscount = Math.min(discountAmount, total + deliveryPrice);

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
                        totalPrice: total + deliveryPrice - normalizedDiscount,
                    },
                },
            });

            // Clear cart after successful order
            clearCart();

            // Immediately navigate to home to close cart screen
            router.replace('/(tabs)/home');

            // Show success popup after a brief delay to ensure navigation completes
            setTimeout(() => {
                Alert.alert(
                    '🎉 Order Placed!',
                    'Your order has been placed successfully. You can track it from the active order banner.',
                    [{ text: 'OK' }]
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
