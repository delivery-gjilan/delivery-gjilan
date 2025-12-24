import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@/gql/graphql';
import { useTheme } from '@/hooks/useTheme';
import { useProductActions } from '../hooks/useProductActions';

interface ProductActionsProps {
    product: Product;
}

export function ProductActions({ product }: ProductActionsProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const {
        localQuantity,
        isInCart,
        hasQuantityChanged,
        incrementQuantity,
        decrementQuantity,
        addToCart,
        updateCart,
        removeFromCart,
    } = useProductActions(product);

    if (!product.isAvailable) {
        return (
            <View
                className="bg-card border-t border-border px-6"
                style={{
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom + 16 : 24,
                    paddingTop: 16,
                }}
            >
                <View className="bg-expense/20 py-4 rounded-xl items-center">
                    <Text className="text-expense text-base font-semibold">This product is currently unavailable</Text>
                </View>
            </View>
        );
    }

    const getButtonText = () => {
        if (!isInCart) return 'Add to Order';
        if (hasQuantityChanged) return 'Update Order';
        return 'In Cart';
    };

    const handleMainAction = () => {
        if (!isInCart) {
            addToCart();
        } else if (hasQuantityChanged) {
            updateCart();
        }
    };

    return (
        <View
            className="bg-card border-t border-border px-6"
            style={{
                paddingBottom: Platform.OS === 'ios' ? insets.bottom + 16 : 24,
                paddingTop: 16,
            }}
        >
            {/* Quantity Controls */}
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-foreground text-lg font-semibold">Quantity</Text>

                <View className="flex-row items-center bg-background border border-border rounded-full">
                    <TouchableOpacity
                        onPress={decrementQuantity}
                        className="w-12 h-12 items-center justify-center"
                        activeOpacity={0.7}
                    >
                        <Ionicons name="remove" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>

                    <View className="px-6 min-w-[60px] items-center">
                        <Text className="text-foreground text-xl font-bold">{localQuantity}</Text>
                    </View>

                    <TouchableOpacity
                        onPress={incrementQuantity}
                        className="w-12 h-12 items-center justify-center"
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Action Buttons */}
            <View className="gap-3">
                {/* Main Action Button */}
                <TouchableOpacity
                    onPress={handleMainAction}
                    disabled={isInCart && !hasQuantityChanged}
                    className="py-4 rounded-xl items-center"
                    style={{
                        backgroundColor: isInCart && !hasQuantityChanged ? theme.colors.subtext : theme.colors.primary,
                        opacity: isInCart && !hasQuantityChanged ? 0.5 : 1,
                    }}
                    activeOpacity={0.7}
                >
                    <View className="flex-row items-center gap-2">
                        <Ionicons name={isInCart ? 'checkmark-circle' : 'cart'} size={24} color="#ffffff" />
                        <Text className="text-white text-lg font-bold">{getButtonText()}</Text>
                    </View>
                </TouchableOpacity>

                {/* Remove Button (only show if in cart) */}
                {isInCart && (
                    <TouchableOpacity
                        onPress={removeFromCart}
                        className="py-4 rounded-xl items-center border-2"
                        style={{ borderColor: theme.colors.expense }}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center gap-2">
                            <Ionicons name="trash-outline" size={20} color={theme.colors.expense} />
                            <Text className="text-base font-semibold" style={{ color: theme.colors.expense }}>
                                Remove from Cart
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
