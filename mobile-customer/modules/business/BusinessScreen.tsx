import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useBusiness } from './hooks/useBusiness';
import { useProducts } from './hooks/useProducts';
import { BusinessHeader } from './components/BusinessHeader';
import { ProductsList } from './components/ProductsList';
import { ErrorMessage } from './components/ErrorMessage';
import { BusinessHeaderSkeleton, ProductCardSkeleton } from '@/components/Skeleton';

interface BusinessScreenProps {
    businessId: string;
}

export function BusinessScreen({ businessId }: BusinessScreenProps) {
    const theme = useTheme();
    const { business, loading: businessLoading, error: businessError } = useBusiness(businessId);
    const { products, loading: productsLoading, error: productsError } = useProducts(businessId);
    
    const scrollY = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const isLoading = businessLoading || productsLoading;
    const error = businessError || productsError;

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }} edges={['bottom']}>
                <Animated.ScrollView
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onScroll={scrollHandler}
                >
                    <BusinessHeaderSkeleton />

                    <View className="px-4 py-6">
                        <Text className="text-2xl font-bold mb-4" style={{ color: theme.colors.text }}>
                            Menu
                        </Text>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <ProductCardSkeleton key={i} />
                        ))}
                    </View>
                </Animated.ScrollView>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
                <ErrorMessage message={error.message} />
            </SafeAreaView>
        );
    }

    if (!business) {
        return (
            <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
                <ErrorMessage message="Business not found" />
            </SafeAreaView>
        );
    }

    const avgPrepTimeMinutes = (business as any)?.avgPrepTimeMinutes ?? null;
    const overridePrepTimeMinutes = (business as any)?.prepTimeOverrideMinutes ?? null;
    const isBusyOverride =
        typeof overridePrepTimeMinutes === 'number' &&
        overridePrepTimeMinutes > 0 &&
        (typeof avgPrepTimeMinutes !== 'number' || overridePrepTimeMinutes !== avgPrepTimeMinutes);

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }} edges={['bottom']}>
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={scrollHandler}
            >
                <BusinessHeader business={business} scrollY={scrollY} />

                {/* Content starts immediately after header */}
                <View className="px-4 py-6">
                    {isBusyOverride && (
                        <View className="bg-yellow-100 border border-yellow-200 rounded-xl p-4 mb-4">
                            <Text className="text-yellow-900 font-semibold mb-1">
                                Restaurant is busy right now
                            </Text>
                            <Text className="text-yellow-900">
                                Food is going to take about {overridePrepTimeMinutes} min.
                            </Text>
                        </View>
                    )}
                    <Text className="text-2xl font-bold mb-4" style={{ color: theme.colors.text }}>
                        Menu
                    </Text>
                    <ProductsList products={products || []} businessType={business.businessType} />
                </View>
            </Animated.ScrollView>
        </SafeAreaView>
    );
}
