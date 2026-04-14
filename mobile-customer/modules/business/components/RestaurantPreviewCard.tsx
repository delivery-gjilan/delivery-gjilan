import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useProducts } from '@/modules/product/hooks/useProducts';
import { getEffectiveProductPrice } from '@/modules/product/utils/pricing';

interface MenuPreviewItem {
    id: string;
    name: string;
    price: string;
    imageUrl: string;
}

interface RestaurantPreviewCardProps {
    id: string;
    name: string;
    logoUrl?: string;
    businessId: string;
    onPress: (id: string) => void;
    onProductPress?: (businessId: string, productId: string) => void;
}

export function RestaurantPreviewCard({
    id,
    name,
    logoUrl,
    businessId,
    onPress,
    onProductPress,
}: RestaurantPreviewCardProps) {
    const theme = useTheme();
    const { products: rawProducts } = useProducts(businessId);

    const menuItems: MenuPreviewItem[] = rawProducts
        .filter((p) => {
            const image = p.imageUrl || p.product?.imageUrl || p.variants?.[0]?.imageUrl;
            return !!image;
        })
        .slice(0, 6)
        .map((p) => ({
            id: p.id,
            name: p.name,
            price: `€${getEffectiveProductPrice((p.product || p.variants?.[0]) ?? { price: p.basePrice }).toFixed(2)}`,
            imageUrl: p.imageUrl || p.product?.imageUrl || p.variants?.[0]?.imageUrl || '',
        }));

    return (
        <TouchableOpacity
            onPress={() => onPress(id)}
            activeOpacity={0.95}
            style={{
                marginVertical: 8,
                backgroundColor: theme.colors.background,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: theme.colors.border,
            }}
        >
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                }}
            >
                {logoUrl && (
                    <Image
                        source={{ uri: logoUrl }}
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            backgroundColor: theme.colors.card,
                            marginRight: 12,
                        }}
                        resizeMode="cover"
                    />
                )}
                <Text
                    style={{
                        flex: 1,
                        color: theme.colors.text,
                        fontSize: 18,
                        fontWeight: '700',
                    }}
                    numberOfLines={1}
                >
                    {name}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.subtext} />
            </View>

            {menuItems.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingBottom: 12 }}
                >
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.85}
                            onPress={() => onProductPress?.(businessId, item.id)}
                            style={{
                                width: 140,
                                borderRadius: 8,
                                overflow: 'hidden',
                                backgroundColor: theme.colors.card,
                            }}
                        >
                            <Image
                                source={{ uri: item.imageUrl }}
                                style={{ width: '100%', height: 100 }}
                                resizeMode="cover"
                            />
                            <View style={{ padding: 8 }}>
                                <Text
                                    style={{
                                        color: theme.colors.text,
                                        fontSize: 12,
                                        fontWeight: '600',
                                        marginBottom: 2,
                                    }}
                                    numberOfLines={2}
                                >
                                    {item.name}
                                </Text>
                                <Text
                                    style={{
                                        color: theme.colors.subtext,
                                        fontSize: 11,
                                        fontWeight: '700',
                                    }}
                                >
                                    {item.price}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </TouchableOpacity>
    );
}
