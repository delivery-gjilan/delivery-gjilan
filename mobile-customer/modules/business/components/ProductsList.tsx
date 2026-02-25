import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ProductCard } from './ProductCard';
import { Product, BusinessType } from '@/gql/graphql';

export function ProductsList({ products, businessType }: { products: Partial<Product>[]; businessType?: BusinessType }) {
    const theme = useTheme();

    if (products.length === 0) {
        return (
            <View className="items-center justify-center py-16">
                <View
                    className="w-20 h-20 rounded-full items-center justify-center mb-4"
                    style={{ backgroundColor: theme.colors.background }}
                >
                    <Ionicons name="fast-food-outline" size={40} color={theme.colors.subtext} />
                </View>
                <Text className="text-lg font-semibold mb-2" style={{ color: theme.colors.text }}>
                    No products available
                </Text>
                <Text className="text-sm text-center" style={{ color: theme.colors.subtext }}>
                    Check back later for menu items
                </Text>
            </View>
        );
    }

    return (
        <View>
            {products.map((product) => (
                <ProductCard key={product.id} product={product} businessType={businessType} />
            ))}
        </View>
    );
}
