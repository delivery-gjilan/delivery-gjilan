import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useCart } from '../hooks/useCart';
import { useCartActions } from '../hooks/useCartActions';

export const CartScreen = () => {
    const router = useRouter();
    const theme = useTheme();
    const { items, total, isEmpty } = useCart();
    const { updateQuantity, removeItem } = useCartActions();

    if (isEmpty) {
        return (
            <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
                {/* Swipe Handle */}
                <View className="items-center py-2">
                    <View className="w-12 h-1 rounded-full" style={{ backgroundColor: theme.colors.border }} />
                </View>

                {/* Header */}
                <View
                    className="flex-row items-center justify-between px-4 py-3 border-b"
                    style={{ borderBottomColor: theme.colors.border }}
                >
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                        <Ionicons name="close" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold" style={{ color: theme.colors.text }}>
                        Cart
                    </Text>
                    <View style={{ width: 28 }} />
                </View>

                {/* Empty State */}
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="cart-outline" size={80} color={theme.colors.subtext} />
                    <Text className="text-xl font-semibold mt-4" style={{ color: theme.colors.text }}>
                        Your cart is empty
                    </Text>
                    <Text className="mt-2 text-center" style={{ color: theme.colors.subtext }}>
                        Add items to get started
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            {/* Swipe Handle */}
            <View className="items-center py-2">
                <View className="w-12 h-1 rounded-full" style={{ backgroundColor: theme.colors.border }} />
            </View>

            {/* Header */}
            <View
                className="flex-row items-center justify-between px-4 py-3 border-b"
                style={{ borderBottomColor: theme.colors.border }}
            >
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <Ionicons name="close" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <Text className="text-xl font-bold" style={{ color: theme.colors.text }}>
                    Cart ({items.length})
                </Text>
                <View style={{ width: 28 }} />
            </View>

            {/* Cart Items */}
            <ScrollView className="flex-1">
                <View className="p-4 gap-3">
                    {items.map((item) => (
                        <View
                            key={item.productId}
                            className="rounded-xl p-4 flex-row items-center border"
                            style={{
                                backgroundColor: theme.colors.card,
                                borderColor: theme.colors.border,
                            }}
                        >
                            {item.imageUrl ? (
                                <Image
                                    source={{ uri: item.imageUrl }}
                                    className="w-20 h-20 rounded-lg"
                                    resizeMode="cover"
                                />
                            ) : (
                                <View
                                    className="w-20 h-20 rounded-lg items-center justify-center"
                                    style={{ backgroundColor: theme.colors.border }}
                                >
                                    <Ionicons name="image-outline" size={32} color={theme.colors.subtext} />
                                </View>
                            )}

                            <View className="flex-1 ml-4">
                                <Text
                                    className="text-base font-semibold"
                                    style={{ color: theme.colors.text }}
                                    numberOfLines={2}
                                >
                                    {item.name}
                                </Text>
                                <Text className="font-bold mt-1" style={{ color: theme.colors.primary }}>
                                    €{item.price.toFixed(2)}
                                </Text>

                                {/* Quantity Controls */}
                                <View className="flex-row items-center mt-2 gap-2">
                                    <TouchableOpacity
                                        onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                                        className="w-8 h-8 rounded-full items-center justify-center"
                                        style={{ backgroundColor: theme.colors.border }}
                                    >
                                        <Ionicons name="remove" size={16} color={theme.colors.text} />
                                    </TouchableOpacity>

                                    <Text className="text-base font-semibold px-3" style={{ color: theme.colors.text }}>
                                        {item.quantity}
                                    </Text>

                                    <TouchableOpacity
                                        onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                                        className="w-8 h-8 rounded-full items-center justify-center"
                                        style={{ backgroundColor: theme.colors.primary }}
                                    >
                                        <Ionicons name="add" size={16} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Remove Button */}
                            <TouchableOpacity onPress={() => removeItem(item.productId)} className="ml-2 p-2">
                                <Ionicons name="trash-outline" size={24} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Footer with Total and Checkout */}
            <View
                className="border-t p-4"
                style={{
                    borderTopColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                }}
            >
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                        Total
                    </Text>
                    <Text className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
                        €{total.toFixed(2)}
                    </Text>
                </View>

                <TouchableOpacity
                    className="py-4 rounded-xl items-center"
                    style={{ backgroundColor: theme.colors.primary }}
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-bold text-lg">Proceed to Checkout</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};
