import { useLocalSearchParams } from 'expo-router';
import { BusinessScreen } from '@/modules/business/BusinessScreen';

export default function BusinessDetailsRoute() {
    const { businessId, productId } = useLocalSearchParams<{ businessId: string; productId?: string | string[] }>();
    const resolvedProductId = Array.isArray(productId) ? productId[0] : productId;

    return <BusinessScreen businessId={businessId as string} focusProductId={resolvedProductId} />;
}
