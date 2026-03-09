import { useLocalSearchParams } from 'expo-router';
import { useOrder, SafeOrderDetails } from '@/modules/orders';

export default function OrderDetailsScreen() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const { order, loading } = useOrder(orderId);

    return <SafeOrderDetails order={order as any} loading={loading} />;
}
