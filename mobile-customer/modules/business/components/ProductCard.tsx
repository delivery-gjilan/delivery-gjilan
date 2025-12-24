import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Product } from '@/gql/graphql';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { CartControls } from './CartControls';

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
    const theme = useTheme();

    const handlePress = () => {
        router.push(`/product/${product.id}`);
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            className="bg-card rounded-2xl overflow-hidden border border-border"
        >
            <View className="flex-row">
                {/* Product Image */}
                <View className="w-32 h-32 bg-background">
                    {product.imageUrl ? (
                        <Image source={{ uri: product.imageUrl }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                        <View className="w-full h-full items-center justify-center">
                            <Ionicons name="image-outline" size={32} color={theme.colors.subtext} />
                        </View>
                    )}
                </View>

                {/* Product Info */}
                <View className="flex-1 p-4 justify-between">
                    <View>
                        <View className="flex-row items-start justify-between mb-1">
                            <Text className="text-foreground text-lg font-semibold flex-1" numberOfLines={2}>
                                {product.name}
                            </Text>
                            {!product.isAvailable && (
                                <View className="bg-expense px-2 py-1 rounded ml-2">
                                    <Text className="text-white text-xs font-medium">Unavailable</Text>
                                </View>
                            )}
                        </View>

                        {product.description && (
                            <Text className="text-subtext text-sm" numberOfLines={2}>
                                {product.description}
                            </Text>
                        )}
                    </View>

                    {/* Price Section and Cart Controls */}
                    <View className="flex-row items-center justify-between mt-2">
                        <View className="flex-row items-center gap-2 flex-1">
                            {product.isOnSale && product.salePrice ? (
                                <View className="flex-row items-center gap-2 flex-wrap">
                                    <Text className="text-expense text-xl font-bold">
                                        ${product.salePrice.toFixed(2)}
                                    </Text>
                                    <Text className="text-subtext text-sm line-through">
                                        ${product.price.toFixed(2)}
                                    </Text>
                                    <View className="bg-expense px-2 py-1 rounded">
                                        <Text className="text-white text-xs font-semibold">SALE</Text>
                                    </View>
                                </View>
                            ) : (
                                <Text className="text-primary text-xl font-bold">${product.price.toFixed(2)}</Text>
                            )}
                        </View>

                        {/* Cart Controls */}
                        {product.isAvailable && <CartControls product={product} />}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}
