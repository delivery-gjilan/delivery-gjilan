import React from 'react';
import { View, Text, FlatList, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useBusinesses } from '@/modules/business/hooks/useBusinesses';
import { RestaurantCard } from '@/modules/business/components/RestaurantCard';

export default function Home() {
    const theme = useTheme();
    const { t } = useTranslations();
    const router = useRouter();
    const { businesses, loading, error } = useBusinesses();
    const headerFadeAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(headerFadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, [headerFadeAnim]);

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
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <View className="flex-1">
                <Animated.View
                    className="px-4 pt-4 pb-4"
                    style={{
                        opacity: headerFadeAnim,
                        transform: [
                            {
                                translateY: headerFadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-20, 0],
                                }),
                            },
                        ],
                    }}
                >
                    <Text className="text-3xl font-bold" style={{ color: theme.colors.text }}>
                        {t.home.title || 'Restaurants'}
                    </Text>
                    <Text className="text-base mt-1" style={{ color: theme.colors.subtext }}>
                        {t.home.subtitle || 'Choose from our partners'}
                    </Text>
                </Animated.View>

                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : error ? (
                    <View className="flex-1 justify-center items-center px-4">
                        <Text style={{ color: theme.colors.text }}>Error loading restaurants</Text>
                        <Text className="text-sm mt-2" style={{ color: theme.colors.subtext }}>
                            {error.message || 'Something went wrong'}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={businesses}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item, index }) => {
                            const metadata = getRestaurantMetadata(index);
                            return (
                                <RestaurantCard
                                    id={item.id}
                                    name={item.name}
                                    imageUrl={item.imageUrl}
                                    businessType={item.businessType}
                                    isOpen={item.isOpen}
                                    onPress={handleBusinessPress}
                                    deliveryFee={metadata.deliveryFee}
                                    deliveryTime={metadata.deliveryTime}
                                    rating={metadata.rating}
                                    priceRange={metadata.priceRange}
                                    description={metadata.description}
                                    discount={metadata.discount}
                                    isNew={metadata.isNew}
                                    isSponsored={metadata.isSponsored}
                                />
                            );
                        }}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
