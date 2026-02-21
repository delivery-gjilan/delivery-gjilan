import React from 'react';
import { View, Text, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useBusinesses } from '@/modules/business/hooks/useBusinesses';
import { RestaurantCard } from '@/modules/business/components/RestaurantCard';
import { PromoSlider, PromoBanner } from '@/components/PromoSlider';
import { RestaurantCardSkeleton } from '@/components/Skeleton';
import { WoltHeader } from '@/components/WoltHeader';

export default function Home() {
    const theme = useTheme();
    const { t } = useTranslations();
    const router = useRouter();
    const { businesses, loading, error } = useBusinesses();
    const restaurants = (businesses || []).filter((business) => business.businessType === 'RESTAURANT');
    // Demo promotional banners
    const promoBanners: PromoBanner[] = [
        {
            id: '1',
            imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80', // Pizza promo
            type: 'image',
            onPress: () => console.log('Promo 1 pressed'),
        },
        {
            id: '2',
            imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', // Food promo
            type: 'image',
            onPress: () => console.log('Promo 2 pressed'),
        },
        {
            id: '3',
            imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80', // Healthy promo
            type: 'image',
            onPress: () => console.log('Promo 3 pressed'),
        },
        {
            id: '4',
            imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80', // Delicious food
            type: 'image',
            onPress: () => console.log('Promo 4 pressed'),
        },
    ];

    const handleBusinessPress = (businessId: string) => {
        router.push(`/business/${businessId}`);
    };

    // Helper function to generate realistic metadata for demo purposes
    const getRestaurantMetadata = (index: number) => {
        const deliveryFees = [1.1, 2.1, 1.5, 1.9, 2.5];
        const deliveryTimes = ['35-45', '25-35', '30-40', '40-50', '20-30'];
        const ratings = [8.6, 8.4, 9.1, 8.8, 7.9];
        const priceRanges = ['$$$$', '$$$', '$$$$', '$$$', '$$'];
        const descriptions = [
            'Hot, fresh, casbas!',
            'Specialized in pizza creations!',
            'Fast food done right',
            'Healthy & fresh options',
            'Traditional flavors',
        ];

        return {
            deliveryFee: deliveryFees[index % deliveryFees.length],
            deliveryTime: deliveryTimes[index % deliveryTimes.length],
            rating: ratings[index % ratings.length],
            priceRange: priceRanges[index % priceRanges.length],
            description: descriptions[index % descriptions.length],
            discount: index === 0 ? 20 : undefined,
            isNew: index === 1,
            isSponsored: index === 0 || index === 1,
        };
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }} edges={['top']}>
            <View className="flex-1">
                {/* Wolt-style Header */}
                <WoltHeader
                    onPressNotifications={() => console.log('Open notifications')}
                />

                {loading ? (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Promotional Slider Skeleton */}
                        <View className="mb-6">
                            <PromoSlider banners={promoBanners} />
                        </View>

                        {/* Restaurants Skeleton */}
                        <View className="px-4">
                            <Text className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
                                Restaurants
                            </Text>
                            {[1, 2, 3, 4].map((i) => (
                                <RestaurantCardSkeleton key={i} />
                            ))}
                        </View>
                    </ScrollView>
                ) : error ? (
                    <View className="flex-1 justify-center items-center px-4 py-20">
                        <Text style={{ color: theme.colors.text }}>Error loading restaurants</Text>
                        <Text className="text-sm mt-2" style={{ color: theme.colors.subtext }}>
                            {error.message || 'Something went wrong'}
                        </Text>
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Promotional Slider */}
                        <View className="mb-6">
                            <PromoSlider banners={promoBanners} />
                        </View>

                        {/* Restaurants Section */}
                        <View className="px-4">
                            <Text className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
                                Restaurants
                            </Text>

                            {/* Restaurant Cards */}
                            {restaurants.map((item, index) => {
                                const metadata = getRestaurantMetadata(index);
                                return (
                                    <RestaurantCard
                                        key={item.id}
                                        id={item.id}
                                        name={item.name}
                                        imageUrl={item.imageUrl}
                                        businessType={item.businessType}
                                        isOpen={item.isOpen}
                                        onPress={handleBusinessPress}
                                        deliveryFee={metadata.deliveryFee}
                                        avgPrepTimeMinutes={(item as any).avgPrepTimeMinutes}
                                        prepTimeOverrideMinutes={(item as any).prepTimeOverrideMinutes}
                                        rating={metadata.rating}
                                        priceRange={metadata.priceRange}
                                        description={metadata.description}
                                        discount={metadata.discount}
                                        isNew={metadata.isNew}
                                        isSponsored={metadata.isSponsored}
                                    />
                                );
                            })}
                        </View>
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
}
