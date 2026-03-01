import React from 'react';
import { View, Text, TouchableOpacity, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { Product, BusinessType } from '@/gql/graphql';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { CartControls } from './CartControls';

interface ProductCardProps {
    product: Partial<Product>;
    businessType?: BusinessType;
}

export function ProductCard({ product, businessType }: ProductCardProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    const handlePress = () => {
        if (!product.id) return;
        router.push(`/product/${product.id}`);
    };

    const effectivePrice = product.isOnSale && product.salePrice ? product.salePrice : (product.price ?? 0);
    const hasDiscount = !!(product.isOnSale && product.salePrice);
    const discountPercent = hasDiscount
        ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
        : 0;

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.95}
            className="mb-4 rounded-2xl overflow-hidden"
            style={{
                backgroundColor: theme.colors.card,
                ...(Platform.OS === 'ios' && {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                }),
                ...(Platform.OS === 'android' && {
                    elevation: 2,
                }),
            }}
        >
            <View className="flex-row" style={{ minHeight: 112 }}>
                {/* Product Image - Fixed Container */}
                <View
                    className="relative"
                    style={{
                        width: 112,
                        height: 112,
                        flexShrink: 0, // Prevent image from shrinking
                    }}
                >
                    {product.imageUrl ? (
                        <Image
                            source={{ uri: product.imageUrl }}
                            style={{ width: 112, height: 112 }}
                            resizeMode="cover"
                        />
                    ) : (
                        <View
                            className="w-full h-full items-center justify-center"
                            style={{ backgroundColor: theme.colors.background }}
                        >
                            <Ionicons name="restaurant-outline" size={40} color={theme.colors.subtext} />
                        </View>
                    )}

                    {/* Discount Badge */}
                    {hasDiscount && (
                        <View className="absolute top-2 left-2 bg-red-500 px-2 py-1 rounded-md">
                            <Text className="text-white text-xs font-bold">-{discountPercent}%</Text>
                        </View>
                    )}

                    {/* Unavailable Overlay */}
                    {!product.isAvailable && (
                        <View className="absolute inset-0 bg-black/60 items-center justify-center">
                            <Text className="text-white text-xs font-semibold">{t.common.unavailable}</Text>
                        </View>
                    )}
                </View>

                {/* Product Info - Separate Container (No Overlap) */}
                <View className="flex-1 p-3" style={{ minWidth: 0 }}>
                    {/* Text Content */}
                    <View className="flex-1">
                        <Text
                            className="text-base font-bold mb-1"
                            style={{ color: theme.colors.text }}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                        >
                            {product.name}
                        </Text>

                        {product.description && (
                            <Text
                                className="text-xs leading-4"
                                style={{ color: theme.colors.subtext }}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                            >
                                {product.description}
                            </Text>
                        )}
                    </View>

                    {/* Price Section and Cart Controls */}
                    <View className="flex-row items-center justify-between" style={{ marginTop: 8, minHeight: 32 }}>
                        <View className="flex-row items-baseline" style={{ gap: 8, flexShrink: 1 }}>
                            <Text className="text-lg font-bold" style={{ color: theme.colors.primary }}>
                                €{effectivePrice.toFixed(2)}
                            </Text>
                            {hasDiscount && (
                                <Text className="text-xs line-through" style={{ color: theme.colors.subtext }}>
                                    €{product.price.toFixed(2)}
                                </Text>
                            )}
                        </View>

                        {/* Cart Controls */}
                        {product.isAvailable && (
                            <View style={{ flexShrink: 0, marginLeft: 8 }}>
                                <CartControls product={product} businessType={businessType} />
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}
