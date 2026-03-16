import { Redirect, useLocalSearchParams } from 'expo-router';

export default function OrderDeepLinkAliasScreen() {
    const { orderId } = useLocalSearchParams<{ orderId?: string | string[] }>();
    const normalizedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;

    if (!normalizedOrderId) {
        return <Redirect href="/orders/history" />;
    }

    return <Redirect href={`/orders/${encodeURIComponent(normalizedOrderId)}`} />;
}
