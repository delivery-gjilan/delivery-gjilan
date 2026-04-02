import { useLocalSearchParams } from 'expo-router';
import { useOrder, SafeOrderDetails } from '@/modules/orders';

export default function OrderDetailsScreen() {
    const { orderId } = useLocalSearchParams<{ orderId?: string | string[] }>();
    const normalizedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
    const { order, loading } = useOrder(normalizedOrderId || '');

    return <SafeOrderDetails order={order as any} loading={loading} />;
}
