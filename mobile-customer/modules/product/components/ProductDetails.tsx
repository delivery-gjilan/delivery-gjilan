import { View, Text } from 'react-native';
import { Product } from '@/gql/graphql';

interface ProductDetailsProps {
    product: Product;
}

export function ProductDetails({ product }: ProductDetailsProps) {
    return (
        <View className="px-6 py-6">
            {/* Product Name */}
            <Text className="text-foreground text-3xl font-bold mb-2">{product.name}</Text>

            {/* Price Section */}
            <View className="flex-row items-center mb-6">
                {product.isOnSale && product.salePrice ? (
                    <>
                        <Text className="text-expense text-3xl font-bold mr-3">${product.salePrice.toFixed(2)}</Text>
                        <Text className="text-subtext text-xl line-through">${product.price.toFixed(2)}</Text>
                    </>
                ) : (
                    <Text className="text-primary text-3xl font-bold">${product.price.toFixed(2)}</Text>
                )}
            </View>

            {/* Divider */}
            <View className="h-px bg-border mb-6" />

            {/* Description */}
            {product.description && (
                <View className="mb-6">
                    <Text className="text-foreground text-lg font-semibold mb-3">Description</Text>
                    <Text className="text-subtext text-base leading-6">{product.description}</Text>
                </View>
            )}
        </View>
    );
}
