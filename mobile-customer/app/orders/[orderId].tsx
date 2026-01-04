import { useLocalSearchParams } from 'expo-router';
import { useOrder, OrderDetails } from '@/modules/orders';

export default function OrderDetailsScreen() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const { order, loading } = useOrder(orderId);

    return <OrderDetails order={order} loading={loading} />;
}
