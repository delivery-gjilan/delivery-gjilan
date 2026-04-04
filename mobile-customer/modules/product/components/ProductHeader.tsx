import { View, Image, TouchableOpacity, Text } from 'react-native';
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

    return (
        <View style={{ position: 'relative' }}>
            {/* Product Image */}
            <View style={{ width: '100%', height: 280, backgroundColor: theme.colors.card, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' }}>
                {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                    <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.card }}>
                        <Ionicons name="image-outline" size={64} color={theme.colors.subtext} />
                    </View>
                )}
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
                    borderRadius: 14,
                    backgroundColor: 'rgba(0, 0, 0, 0.45)',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Ionicons name="arrow-back" size={22} color="#ffffff" />
            </TouchableOpacity>

            {/* Status Badge */}
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

            {product.isOnSale && (product.saleDiscountPercentage ?? 0) > 0 && (
                <View
                    style={{
                        position: 'absolute',
                        bottom: 16,
                        right: 16,
                        backgroundColor: theme.colors.expense,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                    }}
                >
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>{t.common.sale}</Text>
                </View>
            )}
        </View>
    );
}
