import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, TextInput, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useBusinesses } from '@/modules/business/hooks/useBusinesses';
import { useProducts } from '@/modules/product/hooks/useProducts';
import { useProductCategories, useProductSubcategoriesByBusiness } from '@/modules/product/hooks/useProductCategories';
import { MarketProductCard } from '@/modules/business/components/MarketProductCard';
import { useTranslations } from '@/hooks/useTranslations';

type CategoryTab = {
    id: string;
    name: string;
};

type CategoryCard = {
    id: string;
    name: string;
};

type CategoryCardProps = {
    name: string;
    imageUrl?: string | null;
    productCount: number;
    subcategoryCount: number;
    onPress: () => void;
};

function CategoryCard({ name, imageUrl, productCount, subcategoryCount, onPress }: CategoryCardProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    return (
        <TouchableOpacity
            onPress={onPress}
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
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 130 }} resizeMode="cover" />
                ) : (
                    <View
                        className="items-center justify-center"
                        style={{ height: 130, backgroundColor: theme.colors.background }}
                    >
                        <Ionicons name="grid-outline" size={32} color={theme.colors.subtext} />
                    </View>
                )}
            </View>

            <View className="p-3" style={{ minHeight: 116 }}>
                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }} numberOfLines={2}>
                    {name}
                </Text>
                <Text className="text-xs mt-2" style={{ color: theme.colors.subtext }}>
                    {productCount} {productCount === 1 ? t.market.product : t.market.products}
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: theme.colors.subtext }}>
                    {subcategoryCount} {subcategoryCount === 1 ? t.market.subcategory : t.market.subcategories}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

export default function Market() {
    const theme = useTheme();
    const router = useRouter();
    const { businesses, loading: businessesLoading, error: businessesError } = useBusinesses();
    const { t } = useTranslations();
    const marketBusiness = useMemo(
        () => (businesses || []).find((business) => business.businessType === 'MARKET'),
        [businesses],
    );
    const marketId = marketBusiness?.id ?? '';
    const {
        products,
        loading: productsLoading,
        error: productsError,
    } = useProducts(marketId);
    const { categories, loading: categoriesLoading, error: categoriesError } = useProductCategories(marketId);
    const { subcategories, loading: subcategoriesLoading, error: subcategoriesError } =
        useProductSubcategoriesByBusiness(marketId);

    const isLoading = businessesLoading || (!!marketId && (productsLoading || categoriesLoading || subcategoriesLoading));

    const handleProductPress = (productId: string) => {
        router.push(`/product/${productId}`);
    };

    const [searchValue, setSearchValue] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('all');

    const categoryTabs = useMemo<CategoryCard[]>(() => {
        if (categories.length > 0) {
            return categories.map((category) => ({ id: category.id, name: category.name }));
        }

        const ids = Array.from(new Set((products || []).map((product) => product.categoryId)));
        return ids.map((id, index) => ({ id, name: `${t.market.category} ${index + 1}` }));
    }, [categories, products]);

    const subcategoryMap = useMemo(() => {
        const byId = new Map<string, { id: string; categoryId: string; name: string }>();
        const byCategory = new Map<string, { id: string; name: string }[]>();

        subcategories.forEach((subcategory) => {
            byId.set(subcategory.id, subcategory);
            if (!byCategory.has(subcategory.categoryId)) {
                byCategory.set(subcategory.categoryId, []);
            }
            byCategory.get(subcategory.categoryId)!.push({ id: subcategory.id, name: subcategory.name });
        });

        return { byId, byCategory };
    }, [subcategories]);

    const filteredProducts = useMemo(() => {
        if (!searchValue.trim()) return products || [];
        const term = searchValue.trim().toLowerCase();
        return (products || []).filter((product) => {
            return (
                product.name.toLowerCase().includes(term) ||
                (product.description ?? '').toLowerCase().includes(term)
            );
        });
    }, [products, searchValue]);

    const parsedProducts = useMemo(() => {
        return filteredProducts.map((product) => {
            const subcategory = product.subcategoryId ? subcategoryMap.byId.get(product.subcategoryId) : null;
            return {
                ...product,
                _subcategoryLabel: subcategory?.name ?? t.common.all,
            };
        });
    }, [filteredProducts, subcategoryMap.byId]);

    const selectedCategory = useMemo(
        () => categoryTabs.find((category) => category.id === selectedCategoryId) ?? null,
        [categoryTabs, selectedCategoryId],
    );

    const selectedSubcategories = useMemo(() => {
        if (!selectedCategoryId) return [];
        return subcategoryMap.byCategory.get(selectedCategoryId) || [];
    }, [selectedCategoryId, subcategoryMap.byCategory]);

    const categoryProductCounts = useMemo(() => {
        const counts = new Map<string, number>();
        parsedProducts.forEach((product) => {
            counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
        });
        return counts;
    }, [parsedProducts]);

    const selectedProducts = useMemo(() => {
        if (!selectedCategoryId) return [];
        let scoped = parsedProducts.filter((product) => product.categoryId === selectedCategoryId);

        if (selectedSubcategoryId !== 'all') {
            scoped = scoped.filter((product) => product.subcategoryId === selectedSubcategoryId);
        }

        if (searchValue.trim()) {
            const term = searchValue.trim().toLowerCase();
            scoped = scoped.filter((product) => {
                return (
                    product.name.toLowerCase().includes(term) ||
                    (product.description ?? '').toLowerCase().includes(term)
                );
            });
        }

        return scoped.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }, [parsedProducts, selectedCategoryId, selectedSubcategoryId, searchValue]);

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }} edges={['top']}>
            <View className="flex-1">
                {isLoading ? (
                    <View className="flex-1 px-4">
                        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <View
                                    key={i}
                                    style={{
                                        width: '48%',
                                        height: 220,
                                        borderRadius: 16,
                                        backgroundColor: theme.colors.card,
                                        opacity: 0.6,
                                    }}
                                />
                            ))}
                        </View>
                    </View>
                ) : businessesError || productsError || categoriesError || subcategoriesError ? (
                    <View className="flex-1 justify-center items-center px-4 py-20">
                        <Text style={{ color: theme.colors.text }}>{t.market.error_loading}</Text>
                        <Text className="text-sm mt-2" style={{ color: theme.colors.subtext }}>
                            {businessesError?.message ||
                                productsError?.message ||
                                categoriesError?.message ||
                                subcategoriesError?.message ||
                                t.common.something_went_wrong}
                        </Text>
                    </View>
                ) : (
                    <View className="flex-1">
                        {!selectedCategoryId ? (
                            <>
                                <View className="px-4 pb-3">
                                    <Text className="text-xs tracking-widest" style={{ color: theme.colors.subtext }}>
                                        {t.market.title}
                                    </Text>
                                    <Text className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                                        {t.market.categories}
                                    </Text>
                                </View>

                                <FlatList
                                    data={categoryTabs}
                                    keyExtractor={(item) => item.id}
                                    numColumns={2}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                                    columnWrapperStyle={{ gap: 12 }}
                                    ListEmptyComponent={
                                        <View className="px-4 py-12 items-center">
                                            <Text className="text-base text-center" style={{ color: theme.colors.subtext }}>
                                                {marketBusiness ? t.market.no_categories : t.market.no_market}
                                            </Text>
                                        </View>
                                    }
                                    renderItem={({ item }) => {
                                        const productCount = categoryProductCounts.get(item.id) ?? 0;
                                        const categoryProducts = parsedProducts.filter((product) => product.categoryId === item.id);
                                        const categoryImage = categoryProducts.find((product) => product.imageUrl)?.imageUrl ?? null;
                                        const subcategoryCount = subcategoryMap.byCategory.get(item.id)?.length ?? 0;

                                        return (
                                            <View style={{ flex: 1, marginBottom: 12 }}>
                                                <CategoryCard
                                                    name={item.name}
                                                    imageUrl={categoryImage}
                                                    productCount={productCount}
                                                    subcategoryCount={subcategoryCount}
                                                    onPress={() => {
                                                        setSelectedCategoryId(item.id);
                                                        setSelectedSubcategoryId('all');
                                                        setSearchValue('');
                                                    }}
                                                />
                                            </View>
                                        );
                                    }}
                                />
                            </>
                        ) : (
                            <>
                                <View className="px-4 pb-3">
                                    <View className="flex-row items-center gap-3 mb-3">
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedCategoryId(null);
                                                setSelectedSubcategoryId('all');
                                                setSearchValue('');
                                            }}
                                            className="w-9 h-9 rounded-full items-center justify-center"
                                            style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}
                                        >
                                            <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
                                        </TouchableOpacity>
                                        <View className="flex-1">
                                            <Text className="text-xs tracking-widest" style={{ color: theme.colors.subtext }}>
                                                {t.market.title}
                                            </Text>
                                            <Text className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                                                {selectedCategory?.name ?? t.market.category}
                                            </Text>
                                        </View>
                                    </View>

                                    <View
                                        className="flex-row items-center rounded-full px-4"
                                        style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}
                                    >
                                        <Ionicons name="search" size={18} color={theme.colors.subtext} />
                                        <TextInput
                                            value={searchValue}
                                            onChangeText={setSearchValue}
                                            placeholder={t.market.search_products}
                                            placeholderTextColor={theme.colors.subtext}
                                            className="flex-1 py-2.5 px-3 text-base"
                                            style={{ color: theme.colors.text }}
                                        />
                                    </View>
                                </View>

                                {selectedSubcategories.length > 0 && (
                                    <View className="px-4 pb-2">
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                            <TouchableOpacity
                                                onPress={() => setSelectedSubcategoryId('all')}
                                                className="px-3 py-1.5 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        selectedSubcategoryId === 'all' ? theme.colors.primary + '12' : theme.colors.card,
                                                    borderWidth: 1,
                                                    borderColor:
                                                        selectedSubcategoryId === 'all' ? theme.colors.primary : theme.colors.border,
                                                }}
                                            >
                                                <Text
                                                    className="text-xs font-semibold"
                                                    style={{
                                                        color:
                                                            selectedSubcategoryId === 'all' ? theme.colors.primary : theme.colors.subtext,
                                                    }}
                                                >
                                                    {t.market.all}
                                                </Text>
                                            </TouchableOpacity>
                                            {selectedSubcategories.map((subcategory) => {
                                                const isActive = selectedSubcategoryId === subcategory.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={subcategory.id}
                                                        onPress={() => setSelectedSubcategoryId(subcategory.id)}
                                                        className="px-3 py-1.5 rounded-full"
                                                        style={{
                                                            backgroundColor: isActive
                                                                ? theme.colors.primary + '12'
                                                                : theme.colors.card,
                                                            borderWidth: 1,
                                                            borderColor: isActive ? theme.colors.primary : theme.colors.border,
                                                        }}
                                                    >
                                                        <Text
                                                            className="text-xs font-semibold"
                                                            style={{ color: isActive ? theme.colors.primary : theme.colors.subtext }}
                                                        >
                                                            {subcategory.name}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                )}

                                <FlatList
                                    data={selectedProducts}
                                    keyExtractor={(item) => item.id}
                                    numColumns={2}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                                    columnWrapperStyle={{ gap: 12 }}
                                    ListEmptyComponent={
                                        <View className="px-4 py-12 items-center">
                                            <Text className="text-base text-center" style={{ color: theme.colors.subtext }}>
                                                {t.market.no_products}
                                            </Text>
                                        </View>
                                    }
                                    renderItem={({ item }) => (
                                        <View style={{ flex: 1, marginBottom: 12 }}>
                                            <MarketProductCard
                                                product={item}
                                                onPress={handleProductPress}
                                                descriptionOverride={item.description}
                                                businessType="MARKET"
                                            />
                                        </View>
                                    )}
                                />
                            </>
                        )}
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}
