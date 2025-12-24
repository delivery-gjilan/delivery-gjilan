import React from 'react';
import { View, Text } from 'react-native';
import { ProductCard } from './ProductCard';
import { Product } from '@/gql/graphql';

export function ProductsList({ products }: { products: Product[] }) {
    if (products.length === 0) {
        return (
            <View className="items-center justify-center py-12">
                <Text className="text-subtext text-base">No products available</Text>
            </View>
        );
    }

    return (
        <View className="gap-4">
            {products.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
        </View>
    );
}
