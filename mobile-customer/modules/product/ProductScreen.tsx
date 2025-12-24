import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProduct } from './hooks/useProduct';
import { ProductHeader } from './components/ProductHeader';
import { ProductDetails } from './components/ProductDetails';
import { ProductActions } from './components/ProductActions';
import { ErrorMessage } from './components/ErrorMessage';

interface ProductScreenProps {
    productId: string;
}

export function ProductScreen({ productId }: ProductScreenProps) {
    const { product, loading, error } = useProduct(productId);

    if (loading) {
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

    if (!product) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <ErrorMessage message="Product not found" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <ProductHeader product={product} />
                <ProductDetails product={product} />
            </ScrollView>
            <ProductActions product={product} />
        </SafeAreaView>
    );
}
