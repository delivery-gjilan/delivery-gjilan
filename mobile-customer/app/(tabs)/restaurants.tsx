import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import type { InfoBannerType } from '@/components/InfoBanner';
import { useBusinesses } from '@/modules/business/hooks/useBusinesses';
import { ListRestaurantCard } from '@/modules/business/components/ListRestaurantCard';
import { PromotionalBanner } from '@/modules/business/components/PromotionalBanner';
import { FeaturedRestaurantCard } from '@/modules/business/components/FeaturedRestaurantCard';
import { Skeleton } from '@/components/Skeleton';
import { useTranslations } from '@/hooks/useTranslations';
import { useProducts } from '@/modules/product/hooks/useProducts';

type FilterOption = 'all' | 'open' | 'promo';

type ListItem = 
    | { type: 'restaurant'; data: any }
    | { type: 'promo-banner'; data: { id: string; title: string; subtitle?: string; price?: string; imageUrl: string; businessLogo?: string | null; businessName?: string } }
    | { type: 'featured'; data: { id: string; name: string; logoUrl?: string; menuItems: Array<{ name: string; price: string; imageUrl: string }> } };

function selectPromoRestaurant(restaurants: any[]) {
    if (restaurants.length === 0) return null;
    return restaurants.find((r) => Boolean((r as any).activePromotion)) ?? restaurants[0];
}

function selectFeaturedRestaurant(restaurants: any[], excludedBusinessIds: Set<string>) {
    const candidates = restaurants.filter((r) => !excludedBusinessIds.has(r.id));
    if (candidates.length === 0) return null;
    const openCandidate = candidates.find((r) => Boolean(r.isOpen));
    return openCandidate ?? candidates[0];
}

export default function Restaurants() {
    const theme = useTheme();
    const router = useRouter();
    const { businesses, loading, error, refetch } = useBusinesses();
    const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
    const { t } = useTranslations();
    const { bannerEnabled, bannerMessage, bannerType } = useStoreStatus();
    const showBanner = bannerEnabled && !!bannerMessage;

    const BANNER_ICON: Record<InfoBannerType, { name: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
        INFO:    { name: 'information-circle', color: '#7C3AED' },
        WARNING: { name: 'warning',            color: '#f59e0b' },
        SUCCESS: { name: 'checkmark-circle',   color: '#22C55E' },
    };
    const bannerIconCfg = BANNER_ICON[(bannerType as InfoBannerType) ?? 'INFO'] ?? BANNER_ICON.INFO;

    useFocusEffect(
        React.useCallback(() => {
            void refetch();
        }, [refetch]),
    );

    const restaurants = useMemo(
        () => (businesses || []).filter((b) => b.businessType === 'RESTAURANT'),
        [businesses],
    );

    const filteredRestaurants = useMemo(() => {
        let result = restaurants;

        // Apply filter
        if (activeFilter === 'open') {
            result = result.filter((r) => r.isOpen);
        } else if (activeFilter === 'promo') {
            result = result.filter((r) => (r as any).activePromotion);
        }

        return result;
    }, [restaurants, activeFilter]);

    const promoRestaurant = useMemo(() => selectPromoRestaurant(filteredRestaurants), [filteredRestaurants]);
    const featuredRestaurant = useMemo(() => {
        const excludedIds = new Set<string>(promoRestaurant?.id ? [promoRestaurant.id] : []);
        return selectFeaturedRestaurant(filteredRestaurants, excludedIds);
    }, [filteredRestaurants, promoRestaurant]);

    const { products: promoProducts = [] } = useProducts(promoRestaurant?.id ?? '');
    const { products: featuredProducts = [] } = useProducts(featuredRestaurant?.id ?? '');

    // Mix restaurants with promotional content
    const listItems = useMemo((): ListItem[] => {
        const items: ListItem[] = [];
        
        filteredRestaurants.forEach((restaurant) => {
            // Add regular restaurant card
            items.push({ type: 'restaurant', data: restaurant });

            // Insert promotional banner after selected promo restaurant.
            if (promoRestaurant && restaurant.id === promoRestaurant.id && promoProducts.length > 0) {
                const products = promoProducts
                    .filter((p: any) => p.imageUrl || p.product?.imageUrl || p.variants?.[0]?.imageUrl)
                    .slice(0, 2);
                if (products.length > 0) {
                    items.push({
                        type: 'promo-banner',
                        data: {
                            id: `promo-${restaurant.id}`,
                            title: `${restaurant.name.toUpperCase()} - ${t.restaurants.special_offer}`,
                            subtitle: products.map((p) => p.name).join(', '),
                            price: `${products[0]?.name} • €${products[0]?.basePrice.toFixed(2)}`,
                            imageUrl:
                                products[0]?.imageUrl ||
                                products[0]?.product?.imageUrl ||
                                products[0]?.variants?.[0]?.imageUrl ||
                                restaurant.imageUrl ||
                                'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
                            businessLogo: restaurant.imageUrl,
                            businessName: restaurant.name,
                        },
                    });
                }
            }

            // Insert featured card after selected featured restaurant.
            if (featuredRestaurant && restaurant.id === featuredRestaurant.id && featuredProducts.length > 0) {
                const products = featuredProducts
                    .filter((p) => {
                        const representative = p.product || p.variants?.[0];
                        return !!(p.imageUrl || representative?.imageUrl) && representative?.isAvailable !== false;
                    })
                    .slice(0, 3)
                    .map((p) => ({
                        name: p.name,
                        price:
                            (p.product || p.variants?.[0])?.isOnSale && (p.product || p.variants?.[0])?.salePrice
                                ? `€${(p.product || p.variants?.[0])?.salePrice?.toFixed(2)}`
                                : `€${p.basePrice.toFixed(2)}`,
                        imageUrl: p.imageUrl || p.product?.imageUrl || p.variants?.[0]?.imageUrl || '',
                    }));

                if (products.length > 0) {
                    items.push({
                        type: 'featured',
                        data: {
                            id: featuredRestaurant.id,
                            name: featuredRestaurant.name,
                            logoUrl: featuredRestaurant.imageUrl,
                            menuItems: products,
                        },
                    });
                }
            }
        });

        return items;
    }, [filteredRestaurants, promoRestaurant, featuredRestaurant, promoProducts, featuredProducts, t.restaurants.special_offer]);

    const handleBusinessPress = (businessId: string) => {
        router.push(`/business/${businessId}`);
    };

    const filters: { key: FilterOption; label: string }[] = [
        { key: 'all', label: t.restaurants.filters.all },
        { key: 'open', label: t.restaurants.filters.open_now },
        { key: 'promo', label: t.restaurants.filters.with_discounts },
    ];

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }} edges={['top']}>
            <View className="flex-1">
                {/* Header */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                    }}
                >
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
                            {t.restaurants.title}
                        </Text>
                        {showBanner ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                <Ionicons name={bannerIconCfg.name} size={13} color={bannerIconCfg.color} />
                                <Text style={{ color: bannerIconCfg.color, fontSize: 12, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>
                                    {bannerMessage}
                                </Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                    marginTop: 2,
                                }}
                            >
                                <Text style={{ color: theme.colors.subtext, fontSize: 13 }}>{t.restaurants.city}</Text>
                                <Ionicons name="chevron-down" size={14} color={theme.colors.subtext} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="map-outline" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Filter Pills */}
                <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        <TouchableOpacity
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 20,
                                backgroundColor: theme.colors.card,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <Ionicons name="options-outline" size={16} color={theme.colors.text} />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>
                                {t.restaurants.category}
                            </Text>
                            <Ionicons name="chevron-down" size={14} color={theme.colors.subtext} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 20,
                                backgroundColor: theme.colors.card,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>
                                {t.restaurants.sort_by}
                            </Text>
                            <Ionicons name="chevron-down" size={14} color={theme.colors.subtext} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 20,
                                backgroundColor: theme.colors.card,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>
                                Wolt+
                            </Text>
                        </TouchableOpacity>
                        {filters.map((filter) => {
                            const isActive = activeFilter === filter.key;
                            return (
                                <TouchableOpacity
                                    key={filter.key}
                                    onPress={() => setActiveFilter(filter.key)}
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
                                        borderRadius: 20,
                                        backgroundColor: isActive ? theme.colors.primary : theme.colors.card,
                                        borderWidth: 1,
                                        borderColor: isActive ? theme.colors.primary : theme.colors.border,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontWeight: '600',
                                            color: isActive ? '#ffffff' : theme.colors.text,
                                        }}
                                    >
                                        {filter.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Restaurant List */}
                {loading ? (
                    <View style={{ flex: 1 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <View
                                key={i}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    borderBottomWidth: 1,
                                    borderBottomColor: theme.colors.border,
                                }}
                            >
                                <Skeleton width={56} height={56} borderRadius={8} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Skeleton width="60%" height={16} style={{ marginBottom: 6 }} />
                                    <Skeleton width="80%" height={13} style={{ marginBottom: 4 }} />
                                    <Skeleton width="40%" height={20} borderRadius={12} />
                                </View>
                            </View>
                        ))}
                    </View>
                ) : error ? (
                    <View className="flex-1 justify-center items-center px-4 py-20">
                        <Text style={{ color: theme.colors.text }}>{t.restaurants.error_loading}</Text>
                        <Text className="text-sm mt-2" style={{ color: theme.colors.subtext }}>
                            {error.message || t.common.something_went_wrong}
                        </Text>
                    </View>
                ) : listItems.length === 0 ? (
                    <View className="flex-1 justify-center items-center px-4 py-20">
                        <Ionicons name="restaurant-outline" size={48} color={theme.colors.subtext} />
                        <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600', marginTop: 12 }}>
                            {t.restaurants.no_restaurants}
                        </Text>
                        <Text style={{ color: theme.colors.subtext, fontSize: 14, marginTop: 4 }}>
                            {t.restaurants.try_different_search}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={listItems}
                        keyExtractor={(item, index) => {
                            if (item.type === 'restaurant') return item.data.id;
                            if (item.type === 'promo-banner') return item.data.id;
                            if (item.type === 'featured') return `featured-${item.data.id}`;
                            return `item-${index}`;
                        }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        renderItem={({ item }) => {
                            if (item.type === 'promo-banner') {
                                return (
                                    <PromotionalBanner
                                        title={item.data.title}
                                        subtitle={item.data.subtitle}
                                        price={item.data.price}
                                        imageUrl={item.data.imageUrl}
                                        businessLogo={item.data.businessLogo}
                                        businessName={item.data.businessName}
                                        onPress={() => console.log('Promo clicked')}
                                    />
                                );
                            }

                            if (item.type === 'featured') {
                                return (
                                    <FeaturedRestaurantCard
                                        id={item.data.id}
                                        name={item.data.name}
                                        logoUrl={item.data.logoUrl}
                                        menuItems={item.data.menuItems}
                                        onPress={handleBusinessPress}
                                    />
                                );
                            }

                            // Regular restaurant card
                            const restaurant = item.data;
                            return (
                                <ListRestaurantCard
                                    id={restaurant.id}
                                    name={restaurant.name}
                                    imageUrl={restaurant.imageUrl}
                                    isOpen={restaurant.isOpen}
                                    onPress={handleBusinessPress}
                                    locationLat={(restaurant as any).location?.latitude || 42.4635}
                                    locationLng={(restaurant as any).location?.longitude || 21.4694}
                                    avgPrepTimeMinutes={(restaurant as any).avgPrepTimeMinutes}
                                    prepTimeOverrideMinutes={(restaurant as any).prepTimeOverrideMinutes}
                                    activePromotion={(restaurant as any).activePromotion}
                                    isSponsored={restaurant.id === promoRestaurant?.id}
                                />
                            );
                        }}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
