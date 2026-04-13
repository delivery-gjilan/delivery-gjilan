import React from 'react';
import { View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, BusinessType } from '@/gql/graphql';
import { useTheme } from '@/hooks/useTheme';
import { useProductInCart } from '@/modules/cart/hooks/useProductInCart';
import { getEffectiveProductPrice, getPreDiscountProductPrice } from '@/modules/product/utils/pricing';

interface MarketProductCardProps {
    product: Partial<Product>;
    businessType?: BusinessType;
    onPress?: (productId: string) => void;
}

export function MarketProductCard({ product, businessType, onPress }: MarketProductCardProps) {
    const theme = useTheme();
    const { quantity, addToCart, incrementQuantity, decrementQuantity } = useProductInCart(product, businessType);

    const handlePress = () => {
        if (onPress) {
            onPress(product.id);
        }
    };

    const effectivePrice = getEffectiveProductPrice(product);
    const preDiscountPrice = getPreDiscountProductPrice(product);
    const hasDiscount = preDiscountPrice != null;
    const discountPercent = hasDiscount && product.saleDiscountPercentage
        ? Math.round(Number(product.saleDiscountPercentage))
        : 0;
    const isSoldOut = !product.isAvailable;

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.95}
            className="rounded-2xl overflow-hidden"
            style={{
                backgroundColor: theme.colors.card,
                borderWidth: 1,
                borderColor: theme.colors.border,
                ...(Platform.OS === 'ios' && {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                }),
                ...(Platform.OS === 'android' && {
                    elevation: 1,
                }),
            }}
        >
            <View className="relative">
                {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: 165 }} contentFit="cover" cachePolicy="memory-disk" transition={200} />
                ) : (
                    <View
                        className="items-center justify-center"
                        style={{ height: 165, backgroundColor: theme.colors.background }}
                    >
                        <Ionicons name="basket-outline" size={36} color={theme.colors.subtext} />
                    </View>
                )}

                {hasDiscount && (
                    <View
                        className="absolute top-2 left-2 px-2 py-1 rounded-full"
                        style={{ backgroundColor: theme.colors.expense + '1F', borderWidth: 1, borderColor: theme.colors.expense + '80' }}
                    >
                        <Text className="text-xs font-semibold" style={{ color: theme.colors.expense }}>
                            -{discountPercent}%
                        </Text>
                    </View>
                )}

                {/* Sold out overlay - like Wolt */}
                {isSoldOut && (
                    <View 
                        className="absolute inset-0 items-center justify-center"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)' }}
                    >
                        <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: '#888' }}>
                            <Text className="text-xs font-bold text-white">SOLD OUT</Text>
                        </View>
                    </View>
                )}
            </View>

            <View style={{ padding: 10, paddingTop: 22, minHeight: 90 }}>
                <Text className="text-sm font-semibold flex-1" style={{ color: theme.colors.text }} numberOfLines={2}>
                    {product.name}
                </Text>

                <View className="flex-row items-center justify-between mt-2">
                    <View className="flex-row items-baseline" style={{ gap: 6 }}>
                        <Text className="text-base font-bold" style={{ color: theme.colors.text }}>
                            €{effectivePrice.toFixed(2)}
                        </Text>
                        {preDiscountPrice != null && (
                            <Text className="text-xs line-through" style={{ color: theme.colors.subtext }}>
                                €{preDiscountPrice.toFixed(2)}
                            </Text>
                        )}
                    </View>

                    {quantity === 0 ? (
                        <TouchableOpacity
                            onPress={isSoldOut ? undefined : addToCart}
                            className="px-3 py-1.5 rounded-full"
                            style={{ 
                                borderWidth: 1, 
                                borderColor: isSoldOut ? theme.colors.subtext : '#7C3AED60',
                                backgroundColor: isSoldOut ? 'transparent' : '#7C3AED18',
                                opacity: isSoldOut ? 0.5 : 1
                            }}
                            activeOpacity={isSoldOut ? 1 : 0.8}
                            disabled={isSoldOut}
                        >
                            <Text className="text-xs font-semibold" style={{ color: isSoldOut ? theme.colors.subtext : '#A78BFA' }}>
                                Shto
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View className="flex-row items-center rounded-full border" style={{ borderColor: theme.colors.border }}>
                            <TouchableOpacity
                                onPress={decrementQuantity}
                                className="w-7 h-7 items-center justify-center"
                                activeOpacity={0.8}
                            >
                                <Ionicons name="remove" size={16} color={theme.colors.primary} />
                            </TouchableOpacity>
                            <Text className="text-xs font-semibold px-2" style={{ color: theme.colors.text }}>
                                {quantity}
                            </Text>
                            <TouchableOpacity
                                onPress={incrementQuantity}
                                className="w-7 h-7 items-center justify-center"
                                activeOpacity={0.8}
                                disabled={isSoldOut}
                            >
                                <Ionicons name="add" size={16} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}
