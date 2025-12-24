import { useLocalSearchParams } from 'expo-router';
import { BusinessScreen } from '@/modules/business/BusinessScreen';

export default function BusinessDetailsRoute() {
    const { businessId } = useLocalSearchParams<{ businessId: string }>();

    return <BusinessScreen businessId={businessId as string} />;
}
