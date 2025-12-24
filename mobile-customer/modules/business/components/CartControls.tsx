import React from 'react';
import { View, Text, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@/gql/graphql';
import { useTheme } from '@/hooks/useTheme';
import { useProductInCart } from '../hooks/useProductInCart';

interface CartControlsProps {
    product: Product;
}

export function CartControls({ product }: CartControlsProps) {
    const theme = useTheme();
    const { quantity, addToCart, incrementQuantity, decrementQuantity } = useProductInCart(product);

    const handleAddPress = (e: GestureResponderEvent) => {
        e.stopPropagation();
        addToCart();
    };

    const handleIncrementPress = (e: GestureResponderEvent) => {
        e.stopPropagation();
        incrementQuantity();
    };

    const handleDecrementPress = (e: GestureResponderEvent) => {
        e.stopPropagation();
        decrementQuantity();
    };

    // Show only + button if product is not in cart
    if (quantity === 0) {
        return (
            <TouchableOpacity
                onPress={handleAddPress}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: theme.colors.primary }}
                activeOpacity={0.7}
            >
                <Ionicons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
        );
    }

    // Show quantity controls if product is in cart
    return (
        <View className="flex-row items-center bg-card border border-border rounded-full">
            <TouchableOpacity
                onPress={handleDecrementPress}
                className="w-9 h-9 items-center justify-center"
                activeOpacity={0.7}
            >
                <Ionicons name="remove" size={20} color={theme.colors.primary} />
            </TouchableOpacity>

            <View className="px-3 min-w-[40px] items-center">
                <Text className="text-foreground text-base font-semibold">{quantity}</Text>
            </View>

            <TouchableOpacity
                onPress={handleIncrementPress}
                className="w-9 h-9 items-center justify-center"
                activeOpacity={0.7}
            >
                <Ionicons name="add" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
        </View>
    );
}
