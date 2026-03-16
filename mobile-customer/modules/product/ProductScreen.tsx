import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProduct } from './hooks/useProduct';
import { useCart } from '@/modules/cart/hooks/useCart';
import { ProductHeader } from './components/ProductHeader';
import { ProductDetails } from './components/ProductDetails';
import { ProductActions } from './components/ProductActions';
import { ErrorMessage } from './components/ErrorMessage';

interface ProductScreenProps {
    productId: string;
    cartItemId?: string;
}

export function ProductScreen({ productId, cartItemId }: ProductScreenProps) {
    const { product, loading, error } = useProduct(productId);
    const { items } = useCart();
    const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
    const [selectedOptions, setSelectedOptions] = React.useState<Record<string, string[]>>({});
    const hasInitializedRef = React.useRef(false);

    const editingCartItem = React.useMemo(
        () => (cartItemId ? items.find((item) => item.cartItemId === cartItemId) : undefined),
        [items, cartItemId],
    );

    // Initialize variant and options when product is loaded
    React.useEffect(() => {
        if (!product || hasInitializedRef.current) return;

        const initialOptions: Record<string, string[]> = {};
        product.optionGroups?.forEach((og) => {
            initialOptions[og.id] = [];
        });

        // Edit mode: hydrate variant + selected options from existing cart item.
        if (editingCartItem) {
            setSelectedVariantId(editingCartItem.productId);
            for (const selected of editingCartItem.selectedOptions) {
                initialOptions[selected.optionGroupId] = [
                    ...(initialOptions[selected.optionGroupId] ?? []),
                    selected.optionId,
                ];
            }
            setSelectedOptions(initialOptions);
            hasInitializedRef.current = true;
            return;
        }

        setSelectedVariantId(product.id);
        setSelectedOptions(initialOptions);
        hasInitializedRef.current = true;
    }, [product, editingCartItem]);

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

    // Determine the active product (base product + variants as selectable options)
    const selectableVariants = [product, ...(product.variants ?? [])];
    const activeProduct = selectableVariants.find((v) => v.id === selectedVariantId) || product;

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
                editingCartItemId={cartItemId}
            />
        </SafeAreaView>
    );
}
