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
    const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
    const [selectedOptions, setSelectedOptions] = React.useState<Record<string, string[]>>({});

    // Initialize variant and options when product is loaded
    React.useEffect(() => {
        if (product) {
            // If it's a variant group (the productId itself is a groupId, and product has variants)
            // or if the product itself has variants
            if (product.variants && product.variants.length > 0 && !selectedVariantId) {
                setSelectedVariantId(product.variants[0].id);
            }

            // Initialize mandatory options with empty arrays if not present
            const initialOptions: Record<string, string[]> = {};
            product.optionGroups?.forEach((og) => {
                initialOptions[og.id] = [];
            });
            setSelectedOptions(initialOptions);
        }
    }, [product, selectedVariantId]);

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

    // Determine the active product (the variant if selected, or the base product)
    const activeProduct = product.variants?.find((v) => v.id === selectedVariantId) || product;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <ProductHeader product={activeProduct} />
                <ProductDetails
                    product={product}
                    activeProduct={activeProduct}
                    selectedVariantId={selectedVariantId}
                    setSelectedVariantId={setSelectedVariantId}
                    selectedOptions={selectedOptions}
                    setSelectedOptions={setSelectedOptions}
                />
            </ScrollView>
            <ProductActions
                product={activeProduct}
                selectedOptions={selectedOptions}
                parentProduct={product}
            />
        </SafeAreaView>
    );
}
