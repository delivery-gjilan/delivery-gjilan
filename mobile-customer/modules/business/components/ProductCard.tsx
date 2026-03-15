import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { ProductCard as GqlProductCard, BusinessType } from '@/gql/graphql';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { CartControls } from './CartControls';

interface ProductCardProps {
    productCard: GqlProductCard;
    businessType?: BusinessType;
}

export function ProductCard({ productCard, businessType }: ProductCardProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    // Use product from card if single product, otherwise use first variant or just base card info
    const product = productCard.product || productCard.variants[0];
    const hasVariants = productCard.variants.length > 0;

    const handlePress = () => {
        if (!productCard.id) return;
        router.push(`/product/${productCard.id}`);
    };

    const effectivePrice = product?.isOnSale && product?.salePrice ? product.salePrice : (productCard.basePrice ?? 0);
    const hasDiscount = !!(product?.isOnSale && product?.salePrice);
    const discountPercent =
        hasDiscount && product ? Math.round(((product.price - (product.salePrice ?? 0)) / product.price) * 100) : 0;

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
                    {productCard.imageUrl || product?.imageUrl ? (
                        <Image
                            source={{ uri: productCard.imageUrl || product?.imageUrl || '' }}
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
                        <View className="absolute top-2 left-2 bg-expense px-2 py-1 rounded-md">
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
                            {productCard.name}
                        </Text>

                        {(productCard.product?.description || product?.description) && (
                            <Text
                                className="text-xs leading-4"
                                style={{ color: theme.colors.subtext }}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                            >
                                {productCard.product?.description || product?.description}
                            </Text>
                        )}
                    </View>

                    <View className="flex-row items-center justify-between" style={{ marginTop: 8, minHeight: 40 }}>
                        <View style={{ flexShrink: 1 }}>
                            <View className="flex-row items-baseline" style={{ gap: 4 }}>
                                {hasVariants && !hasDiscount && (
                                    <Text className="text-xs" style={{ color: theme.colors.subtext }}>from</Text>
                                )}
                                <Text className="text-lg font-bold" style={{ color: theme.colors.primary }}>
                                    €{effectivePrice.toFixed(2)}
                                </Text>
                            </View>
                            {hasDiscount && product && (
                                <Text className="text-xs line-through" style={{ color: theme.colors.subtext }}>
                                    €{product.price.toFixed(2)}
                                </Text>
                            )}
                        </View>

                        {/* Cart Controls or Customize Button */}
                        {productCard.product?.isAvailable !== false && (
                            <View style={{ flexShrink: 0, marginLeft: 8 }}>
                                {!hasVariants && !productCard.isOffer ? (
                                    <CartControls product={productCard.product!} businessType={businessType} />
                                ) : (
                                    <View className="bg-primary/10 px-3 py-2 rounded-full">
                                        <Text className="text-primary text-xs font-bold">
                                            {productCard.isOffer ? 'Configure' : 'Options'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}
