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
        <View className="relative">
            {/* Product Image */}
            <View className="w-full h-96 bg-card">
                {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} className="w-full h-full" resizeMode="cover" />
                ) : (
                    <View className="w-full h-full items-center justify-center bg-card">
                        <Ionicons name="image-outline" size={80} color={theme.colors.subtext} />
                    </View>
                )}
            </View>

            {/* Back Button */}
            <TouchableOpacity
                onPress={() => router.back()}
                className="absolute top-4 left-4 w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                activeOpacity={0.7}
            >
                <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>

            {/* Status Badge */}
            {!product.isAvailable && (
                <View className="absolute top-4 right-4 bg-expense px-3 py-2 rounded-full">
                    <Text className="text-white text-sm font-semibold">{t.common.unavailable}</Text>
                </View>
            )}

            {product.isOnSale && product.salePrice && (
                <View className="absolute bottom-4 right-4 bg-expense px-3 py-2 rounded-full">
                    <Text className="text-white text-sm font-bold">{t.common.sale}</Text>
                </View>
            )}
        </View>
    );
}
