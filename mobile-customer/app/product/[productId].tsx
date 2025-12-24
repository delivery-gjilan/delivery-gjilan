import { useLocalSearchParams } from 'expo-router';
import { ProductScreen } from '@/modules/product/ProductScreen';

export default function ProductDetailsRoute() {
    const { productId } = useLocalSearchParams<{ productId: string }>();

    return <ProductScreen productId={productId as string} />;
}
