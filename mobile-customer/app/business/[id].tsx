import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useBusiness } from '@/hooks/useBusinesses';
import { useProducts } from '@/hooks/useProducts';
import { useProductCategories } from '@/hooks/useProductCategories';
import { Ionicons } from '@expo/vector-icons';

export default function BusinessDetail() {
    const theme = useTheme();
    const { t } = useTranslations();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const { business, loading: businessLoading } = useBusiness(id || '');
    const { products, loading: productsLoading } = useProducts(id || '');
    const { categories, loading: categoriesLoading } = useProductCategories(id || '');

    const loading = businessLoading || productsLoading || categoriesLoading;

    // Group products by category
    const groupedProducts = useMemo(() => {
        const grouped = categories.map((category) => ({
            title: category.name,
            categoryId: category.id,
            data: products.filter((p) => p.categoryId === category.id),
        }));
        
        // Add uncategorized products if any
        const uncategorizedProducts = products.filter((p) => !p.categoryId);
        if (uncategorizedProducts.length > 0) {
            grouped.push({
                title: 'Other',
                categoryId: 'uncategorized',
                data: uncategorizedProducts,
            });
        }

        return grouped.filter((g) => g.data.length > 0);
    }, [products, categories]);

    const renderPrice = (product: any) => {
        if (product.isOnSale && product.salePrice) {
            return (
                <View className="flex-row items-center gap-2">
                    <Text className="line-through text-xs" style={{ color: theme.colors.subtext }}>
                        €{product.price.toFixed(2)}
                    </Text>
                    <Text className="font-bold text-lg" style={{ color: theme.colors.primary }}>
                        €{product.salePrice.toFixed(2)}
                    </Text>
                </View>
            );
        }
        return (
            <Text className="font-bold text-lg" style={{ color: theme.colors.primary }}>
                €{product.price.toFixed(2)}
            </Text>
        );
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <View className="flex-1">
                {/* Header with back button */}
                <View className="flex-row items-center px-4 py-3 gap-3">
                    <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold flex-1" style={{ color: theme.colors.text }}>
                        {business?.name || 'Products'}
                    </Text>
                </View>

                {/* Business Info */}
                {business && (
                    <View className="px-4 py-2 pb-4" style={{ borderBottomColor: theme.colors.border, borderBottomWidth: 1 }}>
                        <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                            {business.businessType}
                        </Text>
                        <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                            {business.location?.address}
                        </Text>
                        <View className="flex-row mt-2 items-center">
                            <View
                                className="w-2 h-2 rounded-full mr-2"
                                style={{
                                    backgroundColor: business.isOpen ? '#10b981' : '#ef4444',
                                }}
                            />
                            <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                                {business.isOpen ? 'Open' : 'Closed'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Products List by Category */}
                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : products.length === 0 ? (
                    <View className="flex-1 justify-center items-center px-4">
                        <Ionicons name="cube-outline" size={48} color={theme.colors.subtext} />
                        <Text className="mt-4 text-lg font-semibold" style={{ color: theme.colors.text }}>
                            No products available
                        </Text>
                        <Text className="text-sm mt-2 text-center" style={{ color: theme.colors.subtext }}>
                            This business doesn't have any products yet.
                        </Text>
                    </View>
                ) : (
                    <SectionList
                        sections={groupedProducts}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
                        renderItem={({ item: product }) => (
                            <TouchableOpacity
                                activeOpacity={0.7}
                                className="rounded-lg overflow-hidden mb-3 flex-row"
                                style={{ backgroundColor: theme.colors.card }}
                            >
                                <View className="w-24 h-24 bg-gray-200 justify-center items-center flex-shrink-0">
                                    {product.imageUrl ? (
                                        <Text className="text-xs text-center px-2">{product.name}</Text>
                                    ) : (
                                        <Ionicons name="image-outline" size={32} color={theme.colors.subtext} />
                                    )}
                                </View>

                                <View className="flex-1 p-3 justify-between">
                                    <View>
                                        <Text
                                            className="font-semibold text-base"
                                            style={{ color: theme.colors.text }}
                                            numberOfLines={1}
                                        >
                                            {product.name}
                                        </Text>
                                        {product.description && (
                                            <Text
                                                className="text-xs mt-1"
                                                style={{ color: theme.colors.subtext }}
                                                numberOfLines={2}
                                            >
                                                {product.description}
                                            </Text>
                                        )}
                                    </View>

                                    <View className="flex-row items-center justify-between mt-2">
                                        <View>{renderPrice(product)}</View>

                                        <View className="flex-row items-center gap-2">
                                            {product.isOnSale && (
                                                <View
                                                    className="px-2 py-1 rounded"
                                                    style={{ backgroundColor: '#fef3c7' }}
                                                >
                                                    <Text className="text-xs font-bold" style={{ color: '#92400e' }}>
                                                        Sale
                                                    </Text>
                                                </View>
                                            )}
                                            {!product.isAvailable && (
                                                <View
                                                    className="px-2 py-1 rounded"
                                                    style={{ backgroundColor: theme.colors.border }}
                                                >
                                                    <Text className="text-xs font-bold" style={{ color: theme.colors.subtext }}>
                                                        Out
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                        renderSectionHeader={({ section: { title } }) => (
                            <View className="pt-4 pb-2">
                                <Text
                                    className="text-lg font-bold px-2"
                                    style={{ color: theme.colors.text }}
                                >
                                    {title}
                                </Text>
                            </View>
                        )}
                        stickySectionHeadersEnabled={true}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
