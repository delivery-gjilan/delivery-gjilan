import React from 'react';
import { View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, BusinessType } from '@/gql/graphql';
import { useTheme } from '@/hooks/useTheme';
import { useProductInCart } from '../hooks/useProductInCart';

interface MarketProductCardProps {
    product: Partial<Product>;
    businessType?: BusinessType;
    onPress?: (productId: string) => void;
    descriptionOverride?: string | null;
}

export function MarketProductCard({ product, businessType, onPress, descriptionOverride }: MarketProductCardProps) {
    const theme = useTheme();
    const { quantity, addToCart, incrementQuantity, decrementQuantity } = useProductInCart(product, businessType);

    const handlePress = () => {
        if (onPress) {
            onPress(product.id);
        }
    };

    const effectivePrice = product.isOnSale && product.salePrice ? product.salePrice : product.price;
    const hasDiscount = product.isOnSale && product.salePrice;
    const discountPercent = hasDiscount
        ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
        : 0;

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
                    <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: 130 }} resizeMode="cover" />
                ) : (
                    <View
                        className="items-center justify-center"
                        style={{ height: 130, backgroundColor: theme.colors.background }}
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
            </View>

            <View className="p-3" style={{ minHeight: 116 }}>
                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }} numberOfLines={2}>
                    {product.name}
                </Text>

                {descriptionOverride ?? product.description ? (
                    <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }} numberOfLines={2}>
                        {descriptionOverride ?? product.description}
                    </Text>
                ) : (
                    <View className="h-7" />
                )}

                <View className="flex-row items-center justify-between mt-2">
                    <View className="flex-row items-baseline" style={{ gap: 6 }}>
                        <Text className="text-base font-bold" style={{ color: theme.colors.primary }}>
                            €{effectivePrice.toFixed(2)}
                        </Text>
                        {hasDiscount && (
                            <Text className="text-xs line-through" style={{ color: theme.colors.subtext }}>
                                €{product.price.toFixed(2)}
                            </Text>
                        )}
                    </View>

                    {quantity === 0 ? (
                        <TouchableOpacity
                            onPress={addToCart}
                            className="px-3 py-1.5 rounded-full"
                            style={{ borderWidth: 1, borderColor: theme.colors.primary }}
                            activeOpacity={0.8}
                        >
                            <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
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
