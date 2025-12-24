import { View, ScrollView, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBusiness } from './hooks/useBusiness';
import { useProducts } from './hooks/useProducts';
import { BusinessHeader } from './components/BusinessHeader';
import { ProductsList } from './components/ProductsList';
import { ErrorMessage } from './components/ErrorMessage';

interface BusinessScreenProps {
    businessId: string;
}

export function BusinessScreen({ businessId }: BusinessScreenProps) {
    const { business, loading: businessLoading, error: businessError } = useBusiness(businessId);
    const { products, loading: productsLoading, error: productsError } = useProducts(businessId);

    const isLoading = businessLoading || productsLoading;
    const error = businessError || productsError;

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" className="text-primary" />
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <ErrorMessage message={error.message} />
            </SafeAreaView>
        );
    }

    if (!business) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <ErrorMessage message="Business not found" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <BusinessHeader business={business} />

                <View className="px-4 py-6">
                    <Text className="text-foreground text-2xl font-bold mb-4">Products</Text>
                    <ProductsList products={products || []} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
