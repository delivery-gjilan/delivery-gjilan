import React, { useMemo } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { useBusinesses } from '@/modules/business/hooks/useBusinesses';
import { CompactRestaurantCard } from '@/modules/business/components/CompactRestaurantCard';
import { PromoSlider } from '@/components/PromoSlider';
import { DiscoverSection } from '@/components/DiscoverSection';
import { CategoryIcons } from '@/components/CategoryIcons';
import { Skeleton } from '@/components/Skeleton';
import { WoltHeader } from '@/components/WoltHeader';
import { useEstimatedDeliveryPrice } from '@/hooks/useEstimatedDeliveryPrice';
import { useTranslations } from '@/hooks/useTranslations';
import { useQuery } from '@apollo/client/react';
import { GET_BANNERS } from '@/graphql/operations/banners';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import type { WoltHeaderBannerType } from '@/components/WoltHeader';

function HorizontalCardSkeleton() {
    const theme = useTheme();
    const sw = Dimensions.get('window').width;
    const cardWidth = Math.round(sw * 0.75);
    const imgHeight = Math.round(cardWidth * 0.52);
    return (
        <View
            style={{
                width: cardWidth,
                marginRight: 12,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: theme.colors.card,
            }}
        >
            <Skeleton width={cardWidth} height={imgHeight} borderRadius={0} />
            <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 }}>
                <Skeleton width="80%" height={15} style={{ marginBottom: 6 }} />
                <Skeleton width="55%" height={13} style={{ marginBottom: 6 }} />
                <Skeleton width="60%" height={12} />
            </View>
        </View>
    );
}

export default function Discover() {
    const theme = useTheme();
    const router = useRouter();
    const { businesses, loading, error, refetch } = useBusinesses();
        useFocusEffect(
            React.useCallback(() => {
                void refetch();
            }, [refetch]),
        );

    const { estimateDeliveryPrice } = useEstimatedDeliveryPrice();
    const { t } = useTranslations();
    const { bannerEnabled, bannerMessage, bannerType } = useStoreStatus();
    const showBanner = bannerEnabled && !!bannerMessage;
    
    // Fetch banners from API
    const { data: bannersData, loading: bannersLoading } = useQuery(GET_BANNERS, {
        variables: { activeOnly: true },
        fetchPolicy: 'cache-and-network',
    });

    const restaurants = useMemo(
        () => (businesses || []).filter((b) => b.businessType === 'RESTAURANT'),
        [businesses],
    );

    // Section: Popular / All restaurants
    const popularRestaurants = useMemo(() => restaurants.slice(0, 8), [restaurants]);

    // Section: Restaurants with active promotions
    const promoRestaurants = useMemo(
        () => restaurants.filter((r) => (r as any).activePromotion),
        [restaurants],
    );

    // Section: Open now
    const openNowRestaurants = useMemo(
        () => restaurants.filter((r) => r.isOpen).slice(0, 8),
        [restaurants],
    );

    // Map API banners to PromoSlider format
    const promoBanners = useMemo(() => {
        const apiBanners = bannersData?.getBanners || [];
        
        if (apiBanners.length > 0) {
            return apiBanners.map((banner: any) => ({
                id: banner.id,
                imageUrl: banner.imageUrl,
                type: 'image' as const,
                title: banner.title || '',
                subtitle: banner.subtitle || '',
            }));
        }
        
        // Fallback to default banners if no API banners
        return [
            { id: '1', imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80', type: 'image' as const, title: t.home.promo_banners.pizza_discount, subtitle: t.home.promo_banners.pizza_discount_sub },
            { id: '2', imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', type: 'image' as const, title: t.home.promo_banners.free_delivery, subtitle: t.home.promo_banners.free_delivery_sub },
            { id: '3', imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80', type: 'image' as const, title: t.home.promo_banners.healthy_food, subtitle: t.home.promo_banners.healthy_food_sub },
            { id: '4', imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80', type: 'image' as const, title: t.home.promo_banners.weekly_menu, subtitle: t.home.promo_banners.weekly_menu_sub },
        ];
    }, [bannersData, t]);

    // Category icons for top row
    const categories = useMemo(() => [
        { id: 'restaurants', label: t.home.categories.restaurants, imageUrl: 'https://cdn-icons-png.flaticon.com/128/3595/3595455.png', onPress: () => router.push('/(tabs)/restaurants') },
        { id: 'groceries', label: t.home.categories.grocery, imageUrl: 'https://cdn-icons-png.flaticon.com/128/3514/3514227.png' },
        { id: 'health', label: t.home.categories.health_wellness, imageUrl: 'https://cdn-icons-png.flaticon.com/128/2966/2966327.png' },
        { id: 'beauty', label: t.home.categories.beauty_care, imageUrl: 'https://cdn-icons-png.flaticon.com/128/1940/1940922.png' },
        { id: 'drinks', label: t.home.categories.drinks, imageUrl: 'https://cdn-icons-png.flaticon.com/128/3050/3050095.png' },
    ], [router, t]);

    const handleBusinessPress = (businessId: string) => {
        router.push(`/business/${businessId}`);
    };

    const goToRestaurants = () => {
        router.push('/(tabs)/restaurants');
    };

    const getPrepTimeLabel = (item: any) => {
        const base =
            typeof item.prepTimeOverrideMinutes === 'number' && item.prepTimeOverrideMinutes > 0
                ? item.prepTimeOverrideMinutes
                : typeof item.avgPrepTimeMinutes === 'number' && item.avgPrepTimeMinutes > 0
                  ? item.avgPrepTimeMinutes
                  : null;
        return base ? `${base}-${base + 10}` : undefined;
    };

    const renderCards = (items: typeof restaurants) =>
        items.map((item) => {
            const lat = (item as any).location?.latitude || 42.4635;
            const lng = (item as any).location?.longitude || 21.4694;
            const fee = estimateDeliveryPrice(lat, lng);

            return (
                <CompactRestaurantCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    imageUrl={item.imageUrl}
                    description={(item as any).description}
                    isOpen={item.isOpen}
                    onPress={handleBusinessPress}
                    deliveryFee={fee}
                    deliveryTime={getPrepTimeLabel(item)}
                    activePromotion={(item as any).activePromotion}
                />
            );
        });

    const renderSkeletonRow = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingRight: 4 }}
        >
            {[1, 2, 3].map((i) => (
                <HorizontalCardSkeleton key={i} />
            ))}
        </ScrollView>
    );

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }} edges={['top']}>
            <View className="flex-1">
                <WoltHeader
                    onPressNotifications={() => console.log('Open notifications')}
                    bannerMessage={showBanner ? bannerMessage : undefined}
                    bannerType={(bannerType as WoltHeaderBannerType) ?? 'INFO'}
                />

                {loading ? (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Category Icons */}
                        <View style={{ marginBottom: 20, marginTop: 4 }}>
                            <CategoryIcons categories={categories} />
                        </View>

                        <View style={{ marginBottom: 24 }}>
                            <PromoSlider banners={promoBanners} />
                        </View>

                        <View style={{ marginBottom: 24 }}>
                            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                                <Skeleton width="40%" height={18} />
                            </View>
                            {renderSkeletonRow()}
                        </View>

                        <View style={{ marginBottom: 24 }}>
                            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                                <Skeleton width="50%" height={18} />
                            </View>
                            {renderSkeletonRow()}
                        </View>
                    </ScrollView>
                ) : error ? (
                    <View className="flex-1 justify-center items-center px-4 py-20">
                        <Text style={{ color: theme.colors.text }}>{t.home.error_loading}</Text>
                        <Text className="text-sm mt-2" style={{ color: theme.colors.subtext }}>
                            {error.message || t.common.something_went_wrong}
                        </Text>
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Category Icons */}
                        <View style={{ marginBottom: 20, marginTop: 4 }}>
                            <CategoryIcons categories={categories} />
                        </View>

                        {/* Promo Banners */}
                        <View style={{ marginBottom: 20 }}>
                            <PromoSlider banners={promoBanners} />
                        </View>

                        {/* Popular Right Now */}
                        <DiscoverSection
                            title={t.home.popular_now}
                            seeAllLabel={t.home.see_all}
                            onSeeAll={goToRestaurants}
                        >
                            {renderCards(popularRestaurants)}
                        </DiscoverSection>

                        {/* Active Promotions Section */}
                        {promoRestaurants.length > 0 && (
                            <DiscoverSection
                                title={t.home.active_discounts}
                                seeAllLabel={t.home.see_all}
                                onSeeAll={goToRestaurants}
                            >
                                {renderCards(promoRestaurants)}
                            </DiscoverSection>
                        )}

                        {/* Open Now */}
                        {openNowRestaurants.length > 0 && (
                            <DiscoverSection
                                title={t.home.open_now}
                                seeAllLabel={t.home.see_all}
                                onSeeAll={goToRestaurants}
                            >
                                {renderCards(openNowRestaurants)}
                            </DiscoverSection>
                        )}

                        {/* Bottom spacing */}
                        <View style={{ height: 32 }} />
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
}
