import { View, ActivityIndicator, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useBusiness } from './hooks/useBusiness';
import { useProducts } from './hooks/useProducts';
import { BusinessHeader } from './components/BusinessHeader';
import { ProductsList } from './components/ProductsList';
import { ErrorMessage } from './components/ErrorMessage';

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
            <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
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
                    <Text className="text-2xl font-bold mb-4" style={{ color: theme.colors.text }}>
                        Menu
                    </Text>
                    <ProductsList products={products || []} />
                </View>
            </Animated.ScrollView>
        </SafeAreaView>
    );
}
