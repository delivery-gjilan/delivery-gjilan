import { View, Image, TouchableOpacity, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { Product } from '@/gql/graphql';

interface ProductHeaderProps {
    product: Partial<Product>;
}

export function ProductHeader({ product }: ProductHeaderProps) {
    const theme = useTheme();
    const { t } = useTranslations();
    const discountPercent = product.isOnSale && product.saleDiscountPercentage
        ? Math.round(Number(product.saleDiscountPercentage))
        : 0;

    return (
        <View style={{ position: 'relative' }}>
            {/* Product Image */}
            <View style={{ width: '100%', height: 320, backgroundColor: theme.colors.card }}>
                {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" transition={200} />
                ) : (
                    <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.card }}>
                        <Ionicons name="image-outline" size={64} color={theme.colors.subtext} />
                    </View>
                )}

                {/* Bottom gradient fade */}
                <LinearGradient
                    colors={['transparent', theme.colors.background]}
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 }}
                />
            </View>

            {/* Back Button */}
            <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.7}
                style={{
                    position: 'absolute',
                    top: 12,
                    left: 16,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Ionicons name="arrow-back" size={22} color="#ffffff" />
            </TouchableOpacity>

            {/* Unavailable Badge */}
            {!product.isAvailable && (
                <View
                    style={{
                        position: 'absolute',
                        top: 12,
                        right: 16,
                        backgroundColor: theme.colors.expense,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                    }}
                >
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{t.common.unavailable}</Text>
                </View>
            )}

            {/* Sale Discount Badge */}
            {discountPercent > 0 && (
                <View
                    style={{
                        position: 'absolute',
                        bottom: 44,
                        right: 16,
                        backgroundColor: theme.colors.expense,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    <Ionicons name="pricetag" size={14} color="#fff" />
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '800' }}>-{discountPercent}%</Text>
                </View>
            )}
        </View>
    );
}
