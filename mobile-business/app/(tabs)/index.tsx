import { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import {
    GET_BUSINESS_ORDERS,
    UPDATE_ORDER_STATUS,
    START_PREPARING,
    ORDERS_SUBSCRIPTION,
} from '@/graphql/orders';
import { useAuthStore } from '@/store/authStore';
import * as Haptics from 'expo-haptics';

type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

interface OrderItem {
    productId: string;
    name: string;
    imageUrl?: string | null;
    quantity: number;
    price: number;
    notes?: string | null;
}

interface Order {
    id: string;
    displayId: string;
    orderDate: string;
    status: OrderStatus;
    orderPrice: number;
    deliveryPrice: number;
    totalPrice: number;
    preparationMinutes?: number | null;
    estimatedReadyAt?: string | null;
    preparingAt?: string | null;
    readyAt?: string | null;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        phoneNumber?: string | null;
    } | null;
    dropOffLocation?: {
        address: string;
    } | null;
    businesses: Array<{
        business: { id: string; name: string };
        items: OrderItem[];
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

const STATUS_BG: Record<OrderStatus, string> = {
    PENDING: '#f59e0b22',
    PREPARING: '#3b82f622',
    READY: '#10b98122',
    OUT_FOR_DELIVERY: '#8b5cf622',
    DELIVERED: '#6b728022',
    CANCELLED: '#ef444422',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
    PENDING: 'New Order',
    PREPARING: 'Preparing',
    READY: 'Ready for Pickup',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
};

const STATUS_ICONS: Record<OrderStatus, keyof typeof Ionicons.glyphMap> = {
    PENDING: 'alert-circle',
    PREPARING: 'flame',
    READY: 'checkmark-circle',
    OUT_FOR_DELIVERY: 'bicycle',
    DELIVERED: 'checkbox',
    CANCELLED: 'close-circle',
};

const ETA_OPTIONS = [
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
    { label: '20 min', value: 20 },
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
];

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
}

function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getTimeRemaining(estimatedReadyAt: string): { text: string; isOverdue: boolean } {
    const now = new Date();
    const ready = new Date(estimatedReadyAt);
    const diffMs = ready.getTime() - now.getTime();
    const diffMin = Math.ceil(diffMs / 60000);
    if (diffMin <= 0) return { text: `${Math.abs(diffMin)}m overdue`, isOverdue: true };
    return { text: `${diffMin}m remaining`, isOverdue: false };
}

export default function OrdersScreen() {
    const { user } = useAuthStore();
    const [selectedFilter, setSelectedFilter] = useState<OrderStatus | 'ALL'>('PENDING');
    const [etaModalVisible, setEtaModalVisible] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedEta, setSelectedEta] = useState(15);
    const [, setTick] = useState(0);
    const lastTapRef = useRef<Record<string, number>>({});

    // Tick every 30s to keep countdown timers fresh
    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), 30000);
        return () => clearInterval(interval);
    }, []);

    const { data, loading, refetch } = useQuery(GET_BUSINESS_ORDERS, {
        pollInterval: 10000,
    });

    useSubscription(ORDERS_SUBSCRIPTION, {
        onData: ({ data: subscriptionData }) => {
            if (subscriptionData.data?.allOrdersUpdated) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                refetch();
            }
        },
    });

    const [updateStatus] = useMutation(UPDATE_ORDER_STATUS);
    const [startPreparing, { loading: startingPrep }] = useMutation(START_PREPARING);

    // Filter orders for this business only
    const businessOrders = (data?.orders || []).filter((order: any) =>
        order.businesses.some((b: any) => b.business.id === user?.businessId)
    ) as Order[];

    // Sort: PENDING first, then PREPARING, then by date desc
    const sortedOrders = [...businessOrders].sort((a, b) => {
        const priority: Record<string, number> = {
            PENDING: 0, PREPARING: 1, READY: 2, OUT_FOR_DELIVERY: 3, DELIVERED: 4, CANCELLED: 5,
        };
        const pDiff = (priority[a.status] ?? 99) - (priority[b.status] ?? 99);
        if (pDiff !== 0) return pDiff;
        return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
    });

    const filteredOrders = sortedOrders.filter((order) =>
        selectedFilter === 'ALL' ? true : order.status === selectedFilter
    );

    const statusCounts = businessOrders.reduce<Record<string, number>>((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
    }, {});

    const handleDoubleTap = useCallback((order: Order) => {
        const now = Date.now();
        const lastTap = lastTapRef.current[order.id] || 0;
        if (now - lastTap < 400) {
            if (order.status === 'PENDING') {
                setSelectedOrderId(order.id);
                setSelectedEta(15);
                setEtaModalVisible(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else if (order.status === 'PREPARING') {
                handleMarkReady(order.id);
            }
            lastTapRef.current[order.id] = 0;
        } else {
            lastTapRef.current[order.id] = now;
        }
    }, []);

    const handleAcceptWithEta = async () => {
        if (!selectedOrderId) return;
        try {
            await startPreparing({
                variables: { id: selectedOrderId, preparationMinutes: selectedEta },
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setEtaModalVisible(false);
            setSelectedOrderId(null);
            refetch();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleMarkReady = async (orderId: string) => {
        try {
            await updateStatus({ variables: { id: orderId, status: 'READY' as any } });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            refetch();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleRejectOrder = (orderId: string) => {
        Alert.alert('Reject Order', 'Are you sure you want to reject this order?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Reject',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await updateStatus({ variables: { id: orderId, status: 'CANCELLED' as any } });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        refetch();
                    } catch (error: any) {
                        Alert.alert('Error', error.message);
                    }
                },
            },
        ]);
    };

    const handleAcceptTap = (orderId: string) => {
        setSelectedOrderId(orderId);
        setSelectedEta(15);
        setEtaModalVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const pendingCount = statusCounts['PENDING'] || 0;

    const renderOrderCard = ({ item: order }: { item: Order }) => {
        const businessOrder = order.businesses.find((b) => b.business.id === user?.businessId);
        if (!businessOrder) return null;

        const totalItems = businessOrder.items.reduce((sum, i) => sum + i.quantity, 0);
        const businessSubtotal = businessOrder.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const isPending = order.status === 'PENDING';
        const isPreparing = order.status === 'PREPARING';
        const canAct = isPending || isPreparing;

        let timeRemaining: { text: string; isOverdue: boolean } | null = null;
        if (isPreparing && order.estimatedReadyAt) {
            timeRemaining = getTimeRemaining(order.estimatedReadyAt);
        }

        return (
            <Pressable
                onPress={() => handleDoubleTap(order)}
                style={({ pressed }) => ({
                    opacity: pressed && canAct ? 0.95 : 1,
                    transform: [{ scale: pressed && canAct ? 0.99 : 1 }],
                })}
            >
                <View
                    className="bg-card rounded-3xl mx-4 mb-5 overflow-hidden"
                    style={{ borderLeftWidth: 5, borderLeftColor: STATUS_COLORS[order.status] }}
                >
                    {/* ── Card Header ── */}
                    <View className="p-5 pb-3">
                        <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center flex-1">
                                <View
                                    className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
                                    style={{ backgroundColor: STATUS_BG[order.status] }}
                                >
                                    <Ionicons
                                        name={STATUS_ICONS[order.status]}
                                        size={24}
                                        color={STATUS_COLORS[order.status]}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-text font-bold text-xl">#{order.displayId}</Text>
                                    <Text className="text-subtext text-sm">
                                        {timeAgo(order.orderDate)} • {formatTime(order.orderDate)}
                                    </Text>
                                </View>
                            </View>
                            <View
                                className="px-4 py-2 rounded-full"
                                style={{ backgroundColor: STATUS_BG[order.status] }}
                            >
                                <Text className="font-bold text-sm" style={{ color: STATUS_COLORS[order.status] }}>
                                    {STATUS_LABELS[order.status]}
                                </Text>
                            </View>
                        </View>

                        {/* Customer Info */}
                        <View className="flex-row items-center bg-background/40 rounded-2xl p-3 mb-3">
                            <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
                                <Ionicons name="person" size={20} color="#0b89a9" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-text font-semibold text-base">
                                    {order.user?.firstName} {order.user?.lastName}
                                </Text>
                                {order.user?.phoneNumber && (
                                    <Text className="text-subtext text-sm">{order.user.phoneNumber}</Text>
                                )}
                            </View>
                            {order.dropOffLocation?.address && (
                                <View className="flex-row items-center ml-2" style={{ maxWidth: 140 }}>
                                    <Ionicons name="location" size={14} color="#9ca3af" />
                                    <Text className="text-subtext text-xs ml-1" numberOfLines={1}>
                                        {order.dropOffLocation.address}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Prep Time Countdown */}
                        {isPreparing && timeRemaining && (
                            <View
                                className="flex-row items-center rounded-xl p-3 mb-3"
                                style={{
                                    backgroundColor: timeRemaining.isOverdue ? '#ef444420' : '#3b82f620',
                                }}
                            >
                                <Ionicons
                                    name={timeRemaining.isOverdue ? 'warning' : 'timer'}
                                    size={20}
                                    color={timeRemaining.isOverdue ? '#ef4444' : '#3b82f6'}
                                />
                                <Text
                                    className="font-bold text-base ml-2"
                                    style={{ color: timeRemaining.isOverdue ? '#ef4444' : '#3b82f6' }}
                                >
                                    {timeRemaining.text}
                                </Text>
                                {order.preparationMinutes && (
                                    <Text className="text-subtext text-sm ml-auto">
                                        ETA: {order.preparationMinutes} min
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>

                    {/* ── Items Section ── */}
                    <View className="px-5 pb-3">
                        <View className="flex-row items-center mb-3">
                            <Ionicons name="cart" size={16} color="#9ca3af" />
                            <Text className="text-subtext font-semibold text-sm ml-2 uppercase tracking-wider">
                                Items ({totalItems})
                            </Text>
                        </View>

                        {businessOrder.items.map((item, index) => (
                            <View
                                key={index}
                                className="flex-row items-start py-3"
                                style={
                                    index < businessOrder.items.length - 1
                                        ? { borderBottomWidth: 1, borderBottomColor: 'rgba(55,65,81,0.5)' }
                                        : {}
                                }
                            >
                                <View className="w-10 h-10 rounded-xl bg-primary/20 items-center justify-center mr-3">
                                    <Text className="text-primary font-bold text-base">{item.quantity}×</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-text font-semibold text-base">{item.name}</Text>
                                    {item.notes && (
                                        <View className="flex-row items-start mt-1.5">
                                            <Ionicons
                                                name="chatbubble"
                                                size={12}
                                                color="#f59e0b"
                                                style={{ marginTop: 2 }}
                                            />
                                            <Text className="text-warning text-sm ml-1.5 flex-1 italic">
                                                {item.notes}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text className="text-text font-semibold text-base ml-2">
                                    €{(item.price * item.quantity).toFixed(2)}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* ── Total ── */}
                    <View className="mx-5 pt-3 pb-4 border-t border-gray-600 flex-row items-center justify-between">
                        <Text className="text-subtext font-semibold text-base">Subtotal</Text>
                        <Text className="text-text font-bold text-xl">€{businessSubtotal.toFixed(2)}</Text>
                    </View>

                    {/* ── Actions ── */}
                    {isPending && (
                        <View className="flex-row border-t border-gray-700">
                            <TouchableOpacity
                                className="flex-1 py-5 flex-row items-center justify-center border-r border-gray-700"
                                style={{ backgroundColor: '#ef444415' }}
                                onPress={() => handleRejectOrder(order.id)}
                            >
                                <Ionicons name="close" size={22} color="#ef4444" />
                                <Text className="text-danger font-bold text-base ml-2">Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-[2] py-5 flex-row items-center justify-center"
                                style={{ backgroundColor: '#10b98115' }}
                                onPress={() => handleAcceptTap(order.id)}
                            >
                                <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                                <Text className="text-success font-bold text-base ml-2">Accept & Prepare</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isPreparing && (
                        <TouchableOpacity
                            className="py-5 flex-row items-center justify-center border-t border-gray-700"
                            style={{ backgroundColor: '#10b98115' }}
                            onPress={() => handleMarkReady(order.id)}
                        >
                            <Ionicons name="checkmark-done-circle" size={22} color="#10b981" />
                            <Text className="text-success font-bold text-base ml-2">Mark as Ready</Text>
                        </TouchableOpacity>
                    )}

                    {/* Double-tap hint */}
                    {canAct && (
                        <View className="px-5 pb-3 pt-1">
                            <Text className="text-center text-xs" style={{ color: 'rgba(156,163,175,0.5)' }}>
                                Double-tap card to {isPending ? 'accept' : 'mark ready'}
                            </Text>
                        </View>
                    )}
                </View>
            </Pressable>
        );
    };

    const filters: Array<{
        key: OrderStatus | 'ALL';
        label: string;
        icon: keyof typeof Ionicons.glyphMap;
    }> = [
        { key: 'PENDING', label: 'Pending', icon: 'alert-circle' },
        { key: 'PREPARING', label: 'Preparing', icon: 'flame' },
        { key: 'READY', label: 'Ready', icon: 'checkmark-circle' },
        { key: 'ALL', label: 'All', icon: 'apps' },
    ];

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* ── Header ── */}
            <View className="px-6 pt-4 pb-3 border-b border-gray-800">
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-text text-3xl font-bold">Orders</Text>
                        <Text className="text-subtext text-base mt-0.5">{user?.business?.name}</Text>
                    </View>
                    <View className="flex-row items-center">
                        <View className="flex-row items-center bg-success/20 px-3 py-1.5 rounded-full mr-3">
                            <View className="w-2.5 h-2.5 bg-success rounded-full mr-2" />
                            <Text className="text-success font-semibold text-xs">LIVE</Text>
                        </View>
                        {pendingCount > 0 && (
                            <View className="bg-warning px-3.5 py-1.5 rounded-full">
                                <Text className="text-black font-bold text-sm">{pendingCount} new</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* ── Filter Bar ── */}
            <View className="px-4 py-3 flex-row">
                {filters.map((filter) => {
                    const isActive = selectedFilter === filter.key;
                    const count =
                        filter.key === 'ALL' ? businessOrders.length : statusCounts[filter.key] || 0;
                    return (
                        <TouchableOpacity
                            key={filter.key}
                            className="flex-1 mx-1 py-3 rounded-2xl flex-row items-center justify-center"
                            style={{ backgroundColor: isActive ? '#0b89a9' : '#1f2937' }}
                            onPress={() => setSelectedFilter(filter.key)}
                        >
                            <Ionicons name={filter.icon} size={18} color={isActive ? '#fff' : '#9ca3af'} />
                            <Text
                                className="font-bold text-sm ml-1.5"
                                style={{ color: isActive ? '#fff' : '#9ca3af' }}
                            >
                                {filter.label}
                            </Text>
                            {count > 0 && (
                                <View
                                    className="ml-1.5 px-1.5 py-0.5 rounded-full min-w-[20px] items-center"
                                    style={{
                                        backgroundColor: isActive
                                            ? 'rgba(255,255,255,0.3)'
                                            : 'rgba(255,255,255,0.1)',
                                    }}
                                >
                                    <Text
                                        className="font-bold text-xs"
                                        style={{ color: isActive ? '#fff' : '#9ca3af' }}
                                    >
                                        {count}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ── Orders List ── */}
            {loading && !data ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0b89a9" />
                    <Text className="text-subtext mt-4">Loading orders...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredOrders}
                    keyExtractor={(item) => item.id}
                    renderItem={renderOrderCard}
                    refreshControl={
                        <RefreshControl refreshing={false} onRefresh={refetch} tintColor="#0b89a9" />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <View className="w-24 h-24 rounded-full bg-card items-center justify-center mb-6">
                                <Ionicons name="receipt-outline" size={48} color="#6b7280" />
                            </View>
                            <Text className="text-text text-xl font-bold mb-2">No Orders</Text>
                            <Text className="text-subtext text-base text-center px-12">
                                {selectedFilter === 'PENDING'
                                    ? 'No pending orders right now. They will appear here in real-time.'
                                    : selectedFilter === 'ALL'
                                      ? 'No orders found for your business.'
                                      : `No ${STATUS_LABELS[selectedFilter as OrderStatus].toLowerCase()} orders.`}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
                />
            )}

            {/* ── ETA Selection Modal ── */}
            <Modal
                visible={etaModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setEtaModalVisible(false)}
            >
                <Pressable
                    className="flex-1 items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                    onPress={() => setEtaModalVisible(false)}
                >
                    <Pressable
                        className="bg-card rounded-3xl overflow-hidden"
                        style={{ width: '90%', maxWidth: 480 }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <View className="p-6 pb-4 items-center border-b border-gray-700">
                            <View className="w-16 h-16 rounded-full bg-success/20 items-center justify-center mb-4">
                                <Ionicons name="time" size={32} color="#10b981" />
                            </View>
                            <Text className="text-text font-bold text-2xl mb-1">Preparation Time</Text>
                            <Text className="text-subtext text-base text-center">
                                How long will it take to prepare this order?
                            </Text>
                        </View>

                        {/* ETA Options */}
                        <View className="p-6 flex-row flex-wrap justify-center gap-3">
                            {ETA_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    className="py-4 px-6 rounded-2xl items-center"
                                    style={{
                                        minWidth: 100,
                                        backgroundColor:
                                            selectedEta === option.value ? '#0b89a9' : '#374151',
                                    }}
                                    onPress={() => {
                                        setSelectedEta(option.value);
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                >
                                    <Text
                                        className="font-bold text-xl"
                                        style={{
                                            color: selectedEta === option.value ? '#fff' : '#9ca3af',
                                        }}
                                    >
                                        {option.value}
                                    </Text>
                                    <Text
                                        className="text-sm mt-0.5"
                                        style={{
                                            color: selectedEta === option.value ? '#fff' : '#6b7280',
                                        }}
                                    >
                                        minutes
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Modal Actions */}
                        <View className="p-6 pt-2 flex-row gap-3">
                            <TouchableOpacity
                                className="flex-1 py-4 rounded-2xl bg-gray-700 items-center"
                                onPress={() => setEtaModalVisible(false)}
                            >
                                <Text className="text-subtext font-bold text-base">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-[2] py-4 rounded-2xl bg-success items-center flex-row justify-center"
                                onPress={handleAcceptWithEta}
                                disabled={startingPrep}
                            >
                                {startingPrep ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                        <Text className="text-white font-bold text-base ml-2">
                                            Accept — {selectedEta} min
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}
