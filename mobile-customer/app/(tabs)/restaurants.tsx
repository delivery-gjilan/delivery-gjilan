import React, { useMemo, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
    FadeInDown,
    useAnimatedRef,
} from 'react-native-reanimated';
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
import { getEffectiveProductPrice } from '@/modules/product/utils/pricing';

import type { GetBusinessesQuery } from '@/gql/graphql';

type FilterOption = 'all' | 'open' | 'promo';
type BusinessItem = GetBusinessesQuery['businesses'][number];

type ListItem = 
    | { type: 'restaurant'; data: BusinessItem }
    | { type: 'promo-banner'; data: { id: string; title: string; subtitle?: string; price?: string; imageUrl: string; businessLogo?: string | null; businessName?: string } }
    | { type: 'featured'; data: { id: string; name: string; logoUrl?: string; menuItems: Array<{ name: string; price: string; imageUrl: string }> } };

function selectPromoRestaurant(restaurants: BusinessItem[]) {
    if (restaurants.length === 0) return null;
    return restaurants.find((r) => Boolean(r.activePromotion)) ?? restaurants[0];
}

function selectFeaturedRestaurant(restaurants: BusinessItem[], excludedBusinessIds: Set<string>) {
    const candidates = restaurants.filter((r) => !excludedBusinessIds.has(r.id));
    if (candidates.length === 0) return null;
    const openCandidate = candidates.find((r) => Boolean(r.isOpen));
    return openCandidate ?? candidates[0];
}

function FilterTab({ label, isActive, onPress, primaryColor, textColor, subtextColor }: {
    label: string; isActive: boolean; onPress: () => void;
    primaryColor: string; textColor: string; subtextColor: string;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginRight: 4,
                borderBottomWidth: 2.5,
                borderBottomColor: isActive ? primaryColor : 'transparent',
            }}
        >
            <Text style={{
                fontSize: 13,
                fontWeight: isActive ? '800' : '600',
                color: isActive ? textColor : subtextColor,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
            }}>{label}</Text>
        </TouchableOpacity>
    );
}

export default function Restaurants() {
    const theme = useTheme();
    const router = useRouter();
    const { businesses, loading, error, refetch } = useBusinesses();
    const hasBusinesses = businesses.length > 0;
    const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const hasAnimated = useRef(false);
    const { t } = useTranslations();
    const { bannerEnabled, bannerMessage, bannerType } = useStoreStatus();
    const showBanner = bannerEnabled && !!bannerMessage;

    const flatListRef = useAnimatedRef<FlatList>();

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

    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        for (const r of restaurants) {
            if (r.category) cats.add(r.category);
        }
        return Array.from(cats).sort();
    }, [restaurants]);

    const filteredRestaurants = useMemo(() => {
        let result = restaurants;

        // Apply category filter
        if (activeCategory) {
            result = result.filter((r) => r.category === activeCategory);
        }

        // Apply status filter
        if (activeFilter === 'open') {
            result = result.filter((r) => r.isOpen);
        } else if (activeFilter === 'promo') {
            result = result.filter((r) => r.activePromotion);
        }

        return result;
    }, [restaurants, activeFilter, activeCategory]);

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
                    .filter((p) => p.imageUrl || p.product?.imageUrl || p.variants?.[0]?.imageUrl)
                    .slice(0, 2);
                if (products.length > 0) {
                    const promoPriceValue = getEffectiveProductPrice(
                        (products[0]?.product || products[0]?.variants?.[0]) ?? { price: products[0]?.basePrice ?? 0 },
                    );
                    items.push({
                        type: 'promo-banner',
                        data: {
                            id: `promo-${restaurant.id}`,
                            title: `${restaurant.name.toUpperCase()} - ${t.restaurants.special_offer}`,
                            subtitle: products.map((p) => p.name).join(', '),
                            price: `${products[0]?.name} • €${promoPriceValue.toFixed(2)}`,
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
                        price: `€${getEffectiveProductPrice((p.product || p.variants?.[0]) ?? { price: p.basePrice }).toFixed(2)}`,
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

    const statusFilters: { key: FilterOption; label: string }[] = [
        { key: 'open', label: t.restaurants.filters.open_now },
        { key: 'promo', label: t.restaurants.filters.with_discounts },
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            <View style={{ flex: 1 }}>
                {/* ── Header ── */}
                {showBanner && (
                    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name={bannerIconCfg.name} size={13} color={bannerIconCfg.color} />
                        <Text style={{ color: bannerIconCfg.color, fontSize: 12, fontWeight: '600', marginLeft: 4 }} numberOfLines={1}>
                            {bannerMessage}
                        </Text>
                    </View>
                )}

                {/* ── Category tabs (sticky) ── */}
                <View style={{ backgroundColor: theme.colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                        <FilterTab
                            label={t.restaurants.filters.all}
                            isActive={activeCategory === null && activeFilter === 'all'}
                            onPress={() => { setActiveCategory(null); setActiveFilter('all'); }}
                            primaryColor={theme.colors.primary}
                            textColor={theme.colors.text}
                            subtextColor={theme.colors.subtext}
                        />
                        {availableCategories.map((cat) => (
                            <FilterTab
                                key={cat}
                                label={cat}
                                isActive={activeCategory === cat}
                                onPress={() => setActiveCategory(activeCategory === cat ? null : cat)}
                                primaryColor={theme.colors.primary}
                                textColor={theme.colors.text}
                                subtextColor={theme.colors.subtext}
                            />
                        ))}
                        {availableCategories.length > 0 && (
                            <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border, marginHorizontal: 8, alignSelf: 'stretch' }} />
                        )}
                        {statusFilters.map((filter) => (
                            <FilterTab
                                key={filter.key}
                                label={filter.label}
                                isActive={activeFilter === filter.key}
                                onPress={() => setActiveFilter(activeFilter === filter.key ? 'all' : filter.key)}
                                primaryColor={theme.colors.primary}
                                textColor={theme.colors.text}
                                subtextColor={theme.colors.subtext}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* ── Restaurant List ── */}
                {loading ? (
                    <View style={{ flex: 1, paddingTop: 8 }}>
                        {[1, 2, 3].map((i) => (
                            <View
                                key={i}
                                style={{
                                    marginHorizontal: 16,
                                    marginBottom: 16,
                                    borderRadius: 20,
                                    overflow: 'hidden',
                                    backgroundColor: theme.colors.card,
                                }}
                            >
                                <Skeleton width="100%" height={168} borderRadius={0} />
                                <View style={{ padding: 14 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <Skeleton width="55%" height={18} borderRadius={6} />
                                        <Skeleton width={48} height={24} borderRadius={10} />
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <Skeleton width={70} height={27} borderRadius={10} />
                                        <Skeleton width={80} height={27} borderRadius={10} />
                                        <Skeleton width={55} height={27} borderRadius={10} />
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : error && !hasBusinesses ? (
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
                        ref={flatListRef}
                        data={listItems}
                        keyExtractor={(item, index) => {
                            if (item.type === 'restaurant') return item.data.id;
                            if (item.type === 'promo-banner') return item.data.id;
                            if (item.type === 'featured') return `featured-${item.data.id}`;
                            return `item-${index}`;
                        }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}
                        ListHeaderComponent={
                            error && hasBusinesses ? (
                                <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                                    <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                                        {t.common.something_went_wrong}
                                    </Text>
                                </View>
                            ) : null
                        }
                        onLayout={() => { hasAnimated.current = true; }}
                        renderItem={({ item, index }) => {
                            const entering = hasAnimated.current
                                ? undefined
                                : FadeInDown.delay(Math.min(index, 8) * 65).duration(380).springify().damping(28).stiffness(160);

                            if (item.type === 'promo-banner') {
                                return (
                                    <Animated.View entering={entering}>
                                        <PromotionalBanner
                                            title={item.data.title}
                                            subtitle={item.data.subtitle}
                                            price={item.data.price}
                                            imageUrl={item.data.imageUrl}
                                            businessLogo={item.data.businessLogo}
                                            businessName={item.data.businessName}
                                            onPress={() => handleBusinessPress(item.data.id.replace('promo-', ''))}
                                        />
                                    </Animated.View>
                                );
                            }

                            if (item.type === 'featured') {
                                return (
                                    <Animated.View entering={entering}>
                                        <FeaturedRestaurantCard
                                            id={item.data.id}
                                            name={item.data.name}
                                            logoUrl={item.data.logoUrl}
                                            menuItems={item.data.menuItems}
                                            onPress={handleBusinessPress}
                                        />
                                    </Animated.View>
                                );
                            }

                            // Regular restaurant card
                            const restaurant = item.data;
                            return (
                                <Animated.View entering={entering}>
                                    <ListRestaurantCard
                                        id={restaurant.id}
                                        name={restaurant.name}
                                        imageUrl={restaurant.imageUrl}
                                        isOpen={restaurant.isOpen}
                                        onPress={handleBusinessPress}
                                    locationLat={restaurant.location?.latitude || 42.4635}
                                    locationLng={restaurant.location?.longitude || 21.4694}
                                    avgPrepTimeMinutes={restaurant.avgPrepTimeMinutes}
                                    prepTimeOverrideMinutes={restaurant.prepTimeOverrideMinutes}
                                    rating={restaurant.ratingAverage ?? undefined}
                                    category={restaurant.category ?? null}
                                    activePromotion={restaurant.activePromotion}
                                        isSponsored={restaurant.id === promoRestaurant?.id}
                                    />
                                </Animated.View>
                            );
                        }}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
