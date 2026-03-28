import { useLocalSearchParams } from 'expo-router';
import { useOrder, SafeOrderDetails } from '@/modules/orders';
import { useEffect } from 'react';

export default function OrderDetailsScreen() {
    const { orderId } = useLocalSearchParams<{ orderId?: string | string[] }>();
    const normalizedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
    const { order, loading } = useOrder(normalizedOrderId || '');

    useEffect(() => {
        console.log('[OrderDetailsScreen] route params', {
            rawOrderId: orderId,
            normalizedOrderId,
        });
    }, [orderId, normalizedOrderId]);

    return <SafeOrderDetails order={order as any} loading={loading} />;
}
