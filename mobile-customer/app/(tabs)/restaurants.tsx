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
import { FeaturedRestaurantCard } from '@/modules/business/components/FeaturedRestaurantCard';
import { Skeleton } from '@/components/Skeleton';
import { useTranslations } from '@/hooks/useTranslations';

import type { GetBusinessesQuery } from '@/gql/graphql';

type FilterOption = 'all' | 'open' | 'promo';
type BusinessItem = GetBusinessesQuery['businesses'][number];

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

    const promoRestaurant = useMemo(() => filteredRestaurants.find((r) => Boolean(r.activePromotion)) ?? null, [filteredRestaurants]);

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
                ) : filteredRestaurants.length === 0 ? (
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
                        data={filteredRestaurants}
                        keyExtractor={(item) => item.id}
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
                        renderItem={({ item: restaurant, index }) => {
                            const entering = hasAnimated.current
                                ? undefined
                                : FadeInDown.delay(Math.min(index, 8) * 65).duration(380).springify().damping(28).stiffness(160);

                            return (
                                <Animated.View entering={entering}>
                                    <FeaturedRestaurantCard
                                        id={restaurant.id}
                                        name={restaurant.name}
                                        logoUrl={restaurant.imageUrl}
                                        businessId={restaurant.id}
                                        onPress={handleBusinessPress}
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
