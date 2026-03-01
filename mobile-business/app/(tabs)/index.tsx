import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import {
    GET_BUSINESS_ORDERS,
    UPDATE_ORDER_STATUS,
    START_PREPARING,
    UPDATE_PREPARATION_TIME,
    ORDERS_SUBSCRIPTION,
} from '@/graphql/orders';
import { useAuthStore } from '@/store/authStore';
import * as Haptics from 'expo-haptics';

type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

interface Order {
    id: string;
    orderDate: string;
    status: OrderStatus;
    totalPrice: number;
    preparationMinutes?: number;
    estimatedReadyAt?: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        phoneNumber?: string;
    };
    businesses: Array<{
        business: {
            id: string;
            name: string;
        };
        items: Array<{
            productId: string;
            name: string;
            quantity: number;
            price: number;
        }>;
    }>;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
    PENDING: '#f59e0b',
    PREPARING: '#3b82f6',
    READY: '#10b981',
    OUT_FOR_DELIVERY: '#8b5cf6',
    DELIVERED: '#6b7280',
    CANCELLED: '#ef4444',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
    PENDING: 'New Order',
    PREPARING: 'Preparing',
    READY: 'Ready',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
};

export default function OrdersScreen() {
    const { user } = useAuthStore();
    const [selectedFilter, setSelectedFilter] = useState<OrderStatus | 'ALL'>('PENDING');
    const [prepTimeInput, setPrepTimeInput] = useState<Record<string, string>>({});

    const { data, loading, refetch } = useQuery(GET_BUSINESS_ORDERS, {
        pollInterval: 10000, // Poll every 10 seconds
    });

    // Subscribe to real-time order updates
    useSubscription(ORDERS_SUBSCRIPTION, {
        onData: ({ client, data: subscriptionData }) => {
            if (subscriptionData.data?.allOrdersUpdated) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                refetch();
            }
        },
    });

    const [updateStatus] = useMutation(UPDATE_ORDER_STATUS);
    const [startPreparing] = useMutation(START_PREPARING);
    const [updatePrepTime] = useMutation(UPDATE_PREPARATION_TIME);

    // Filter orders for this business
    const businessOrders = (data?.orders || []).filter((order: Order) =>
        order.businesses.some((b) => b.business.id === user?.businessId)
    );

    const filteredOrders = businessOrders.filter((order: Order) =>
        selectedFilter === 'ALL' ? true : order.status === selectedFilter
    );

    const handleAcceptOrder = async (orderId: string) => {
        Alert.prompt(
            'Start Preparing',
            'Estimated preparation time (minutes):',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Start',
                    onPress: async (time) => {
                        const minutes = parseInt(time || '15');
                        if (isNaN(minutes) || minutes < 1) {
                            Alert.alert('Invalid Time', 'Please enter a valid preparation time');
                            return;
                        }
                        try {
                            await startPreparing({
                                variables: { id: orderId, preparationMinutes: minutes },
                            });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            refetch();
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        }
                    },
                },
            ],
            'plain-text',
            '15'
        );
    };

    const handleMarkReady = async (orderId: string) => {
        try {
            await updateStatus({
                variables: { id: orderId, status: 'READY' },
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            refetch();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleRejectOrder = async (orderId: string) => {
        Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Cancel',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await updateStatus({
                            variables: { id: orderId, status: 'CANCELLED' },
                        });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        refetch();
                    } catch (error: any) {
                        Alert.alert('Error', error.message);
                    }
                },
            },
        ]);
    };

    const renderOrderCard = ({ item: order }: { item: Order }) => {
        const businessOrder = order.businesses.find((b) => b.business.id === user?.businessId);
        if (!businessOrder) return null;

        const itemCount = businessOrder.items.reduce((sum, item) => sum + item.quantity, 0);

        return (
            <View className="bg-card rounded-2xl p-4 mb-4 mx-4">
                {/* Header */}
                <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-1">
                        <Text className="text-text font-bold text-lg">
                            {order.user?.firstName} {order.user?.lastName}
                        </Text>
                        <Text className="text-subtext text-sm">
                            {itemCount} items • ${order.totalPrice.toFixed(2)}
                        </Text>
                    </View>
                    <View
                        className="px-3 py-1.5 rounded-full"
                        style={{ backgroundColor: `${STATUS_COLORS[order.status]}20` }}
                    >
                        <Text className="font-semibold text-xs" style={{ color: STATUS_COLORS[order.status] }}>
                            {STATUS_LABELS[order.status]}
                        </Text>
                    </View>
                </View>

                {/* Items */}
                <View className="border-t border-gray-700 pt-3 mb-3">
                    {businessOrder.items.map((item, index) => (
                        <View key={index} className="flex-row justify-between mb-2">
                            <Text className="text-text flex-1">
                                {item.quantity}x {item.name}
                            </Text>
                            <Text className="text-subtext">${(item.price * item.quantity).toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                {/* Preparation Time */}
                {order.preparationMinutes && (
                    <View className="bg-background/50 rounded-lg p-2 mb-3">
                        <Text className="text-subtext text-xs">
                            Prep Time: {order.preparationMinutes} min
                            {order.estimatedReadyAt && ` • Ready by ${new Date(order.estimatedReadyAt).toLocaleTimeString()}`}
                        </Text>
                    </View>
                )}

                {/* Actions */}
                {order.status === 'PENDING' && (
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            className="flex-1 bg-danger py-3 rounded-xl"
                            onPress={() => handleRejectOrder(order.id)}
                        >
                            <Text className="text-white text-center font-semibold">Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 bg-success py-3 rounded-xl"
                            onPress={() => handleAcceptOrder(order.id)}
                        >
                            <Text className="text-white text-center font-semibold">Accept & Start</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {order.status === 'PREPARING' && (
                    <TouchableOpacity
                        className="bg-success py-3 rounded-xl"
                        onPress={() => handleMarkReady(order.id)}
                    >
                        <Text className="text-white text-center font-semibold">Mark as Ready</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const filters: Array<OrderStatus | 'ALL'> = ['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'ALL'];

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="px-4 py-3 border-b border-gray-800">
                <Text className="text-text text-2xl font-bold mb-1">Orders</Text>
                <Text className="text-subtext">{user?.business?.name}</Text>
            </View>

            {/* Filters */}
            <View className="px-4 py-3">
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={filters}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            className={`px-4 py-2 rounded-full mr-2 ${
                                selectedFilter === item ? 'bg-primary' : 'bg-card'
                            }`}
                            onPress={() => setSelectedFilter(item)}
                        >
                            <Text
                                className={`font-semibold text-sm ${
                                    selectedFilter === item ? 'text-white' : 'text-subtext'
                                }`}
                            >
                                {item === 'ALL' ? 'All' : STATUS_LABELS[item]}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Orders List */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0b89a9" />
                </View>
            ) : (
                <FlatList
                    data={filteredOrders}
                    keyExtractor={(item) => item.id}
                    renderItem={renderOrderCard}
                    refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#0b89a9" />}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-12">
                            <Ionicons name="receipt-outline" size={64} color="#6b7280" />
                            <Text className="text-subtext text-center mt-4">No orders found</Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }}
                />
            )}
        </SafeAreaView>
    );
}
