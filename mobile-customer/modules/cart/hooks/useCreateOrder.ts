import { useMutation } from '@apollo/client/react';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { CREATE_ORDER } from '@/graphql/operations/orders';
import { useCart } from './useCart';
import { useCartActions } from './useCartActions';
import { useUserLocation } from '@/hooks/useUserLocation';

export function useCreateOrder() {
    const { items, total } = useCart();
    const { clearCart } = useCartActions();
    const { location } = useUserLocation();

    const [createOrderMutation, { loading, error }] = useMutation(CREATE_ORDER);

    const createOrder = async () => {
        if (items.length === 0) {
            throw new Error('Cart is empty');
        }

        if (!location) {
            throw new Error('Location is required');
        }

        const deliveryPrice = 2.0; // Fixed for now

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
                        totalPrice: total + deliveryPrice,
                    },
                },
            });

            // Clear cart after successful order
            clearCart();

            // Show success popup and redirect to home
            Alert.alert(
                '🎉 Order Placed!',
                'Your order has been placed successfully. You can track it from the active order banner.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.replace('/(tabs)/home'),
                    },
                ],
                { cancelable: false }
            );

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
