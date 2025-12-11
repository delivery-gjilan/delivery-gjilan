import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useOrders } from '@/hooks/useOrders';

export default function OrdersRoute() {
    const theme = useTheme();
    const { t } = useTranslations();
    const router = useRouter();
    const { orders, loading, error, refetch } = useOrders();

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            PENDING: '#fbbf24',
            ACCEPTED: '#60a5fa',
            OUT_FOR_DELIVERY: '#a78bfa',
            DELIVERED: '#10b981',
            CANCELLED: '#ef4444',
        };
        return colors[status] || '#6b7280';
    };

    const handleOrderPress = (orderId: string) => {
        router.push(`/`);
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <View className="flex-1">
                <View className="px-4 pt-4 pb-2">
                    <Text className="text-3xl font-bold" style={{ color: theme.colors.text }}>
                        My Orders
                    </Text>
                    <Text className="text-base mt-1" style={{ color: theme.colors.subtext }}>
                        Track your deliveries
                    </Text>
                </View>

                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : error ? (
                    <View className="flex-1 justify-center items-center px-4">
                        <TouchableOpacity
                            className="mt-4 px-4 py-2 rounded-lg"
                            style={{ backgroundColor: theme.colors.primary }}
                            onPress={() => refetch()}
                        >
                            <Text style={{ color: 'white' }}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : orders.length === 0 ? (
                    <View className="flex-1 justify-center items-center px-4">
                        <Text style={{ color: theme.colors.subtext }}>No orders yet</Text>
                    </View>
                ) : (
                    <FlatList
                        data={orders}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => handleOrderPress(item.id)}
                                className="rounded-lg overflow-hidden mb-3 p-4"
                                style={{ backgroundColor: theme.colors.card }}
                            >
                                <View className="flex-row justify-between items-start mb-2">
                                    <View className="flex-1">
                                        <Text
                                            className="text-sm"
                                            style={{ color: theme.colors.subtext }}
                                        >
                                            Order #{item.id.slice(0, 8)}
                                        </Text>
                                        <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                                            {new Date(item.orderDate).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <View
                                        className="px-3 py-1 rounded-full"
                                        style={{ backgroundColor: getStatusColor(item.status) + '20' }}
                                    >
                                        <Text
                                            className="text-xs font-semibold"
                                            style={{ color: getStatusColor(item.status) }}
                                        >
                                            {item.status}
                                        </Text>
                                    </View>
                                </View>

                                <View className="flex-row justify-between items-end mt-2 pt-2 border-t border-gray-200">
                                    <View>
                                        <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                                            Items: {item.businesses.reduce((acc, b) => acc + b.items.length, 0)}
                                        </Text>
                                    </View>
                                    <Text
                                        className="text-lg font-bold"
                                        style={{ color: theme.colors.text }}
                                    >
                                        ${item.totalPrice.toFixed(2)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
