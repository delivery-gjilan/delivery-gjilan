import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Platform, Image } from 'react-native';
import { GetProductsQuery, BusinessType } from '@/gql/graphql';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { CartControls } from './CartControls';
import { ComplexCartControls } from './ComplexCartControls';
import { getEffectiveProductPrice, getPreDiscountProductPrice } from '@/modules/product/utils/pricing';

type ProductCardItem = GetProductsQuery['products'][number];

const POPULAR_THRESHOLD = 5;

interface ProductCardProps {
    productCard: ProductCardItem;
    businessType?: BusinessType;
}

export function ProductCard({ productCard, businessType }: ProductCardProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    // Use product from card if single product, otherwise fallback to first variant.
    const product = productCard.product || productCard.variants[0];
    const hasVariants = productCard.variants.length > 0;
    const isComplexProduct = hasVariants || productCard.isOffer || productCard.hasOptionGroups;
    const targetProductId = productCard.product?.id || productCard.variants[0]?.id;

    const handlePress = () => {
        // Navigation is handled by CartControls (simple) and ComplexCartControls (variants/options/offers)
    };

    const effectivePrice = product ? getEffectiveProductPrice(product) : (productCard.basePrice ?? 0);
    const preDiscountPrice = product ? getPreDiscountProductPrice(product) : null;
    const hasDiscount = preDiscountPrice != null;
    const discountPercent = hasDiscount && product?.saleDiscountPercentage
        ? Math.round(Number(product.saleDiscountPercentage))
        : 0;

    const isPopular = (productCard.orderCount ?? 0) >= POPULAR_THRESHOLD;

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
                    {product?.isAvailable === false && (
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

                        {isPopular && (
                            <View className="flex-row items-center mb-1" style={{ gap: 3 }}>
                                <Ionicons name="flame" size={12} color={theme.colors.primary} />
                                <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
                                    {t.business.popular}
                                </Text>
                            </View>
                        )}

                        {productCard.product?.description && (
                            <Text
                                className="text-xs leading-4"
                                style={{ color: theme.colors.subtext }}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                            >
                                {productCard.product.description}
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
                            {preDiscountPrice != null && (
                                <Text className="text-xs line-through" style={{ color: theme.colors.subtext }}>
                                    €{preDiscountPrice.toFixed(2)}
                                </Text>
                            )}
                        </View>

                        {/* Cart Controls or Customize Button */}
                        {productCard.product?.isAvailable !== false && (
                            <View style={{ flexShrink: 0, marginLeft: 8 }}>
                                {!isComplexProduct ? (
                                    <CartControls
                                        product={{ ...productCard.product!, imageUrl: productCard.product!.imageUrl || productCard.imageUrl || undefined }}
                                        businessType={businessType}
                                    />
                                ) : targetProductId ? (
                                    <ComplexCartControls
                                        productId={targetProductId}
                                        businessType={businessType}
                                    />
                                ) : null}
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}
