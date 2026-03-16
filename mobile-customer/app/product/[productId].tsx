import { useLocalSearchParams } from 'expo-router';
import { ProductScreen } from '@/modules/product/ProductScreen';

export default function ProductDetailsRoute() {
    const { productId, cartItemId } = useLocalSearchParams<{ productId: string; cartItemId?: string }>();

    return <ProductScreen productId={productId as string} cartItemId={cartItemId} />;
}
