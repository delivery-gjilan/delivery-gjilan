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
import { useApolloClient, useQuery, useMutation, useSubscription } from '@apollo/client/react';
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

const UPCOMING_ORDER_STATUSES: ReadonlyArray<OrderStatus> = [
    'PENDING',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
];

interface OrderItem {
    productId: string;
    name: string;
    imageUrl?: string | null;
    quantity: number;
    unitPrice: number;
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

const STATUS_CARD_BG: Record<OrderStatus, string> = {
    PENDING: '#f59e0b14',
    PREPARING: '#3b82f614',
    READY: '#10b98114',
    OUT_FOR_DELIVERY: '#8b5cf614',
    DELIVERED: '#6b728012',
    CANCELLED: '#ef444412',
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

function getElapsedTime(statusChangeDate: string): string {
    const now = new Date();
    const changed = new Date(statusChangeDate);
    const diffMs = now.getTime() - changed.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const minutes = Math.floor(diffSec / 60);
    const seconds = diffSec % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function OrdersScreen() {
    const apolloClient = useApolloClient();
    const { user } = useAuthStore();
    const [etaModalVisible, setEtaModalVisible] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedEta, setSelectedEta] = useState(15);
    const [, setTick] = useState(0);
    const lastTapRef = useRef<Record<string, number>>({});

    // Tick every 1s to keep elapsed timers fresh
    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const { data, loading, refetch } = useQuery(GET_BUSINESS_ORDERS);
    const refetchCooldownRef = useRef(0);
    const refetchInFlightRef = useRef(false);
    const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (refetchTimerRef.current) {
                clearTimeout(refetchTimerRef.current);
                refetchTimerRef.current = null;
            }
        };
    }, []);

    const scheduleRefetch = useCallback(() => {
        const now = Date.now();
        const canRunNow = now - refetchCooldownRef.current >= 1200 && !refetchInFlightRef.current;

        if (!canRunNow) {
            if (refetchTimerRef.current) {
                return;
            }
            refetchTimerRef.current = setTimeout(() => {
                refetchTimerRef.current = null;
                if (refetchInFlightRef.current) {
                    return;
                }
                refetchInFlightRef.current = true;
                refetchCooldownRef.current = Date.now();
                refetch().finally(() => {
                    refetchInFlightRef.current = false;
                });
            }, 350);
            return;
        }

        refetchInFlightRef.current = true;
        refetchCooldownRef.current = now;
        refetch().finally(() => {
            refetchInFlightRef.current = false;
        });
    }, [refetch]);

    useSubscription(ORDERS_SUBSCRIPTION, {
        onData: ({ data: subscriptionData }) => {
            const incomingOrders = subscriptionData.data?.allOrdersUpdated as any[] | undefined;
            if (incomingOrders && incomingOrders.length > 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                apolloClient.cache.updateQuery({ query: GET_BUSINESS_ORDERS }, (existing: any) => {
                    const currentOrders = Array.isArray(existing?.orders) ? existing.orders : [];
                    const byId = new Map(currentOrders.map((order: any) => [String(order?.id), order]));

                    incomingOrders.forEach((order: any) => {
                        const existingOrder = byId.get(String(order?.id));
                        byId.set(
                            String(order?.id),
                            {
                                ...(existingOrder && typeof existingOrder === 'object' ? existingOrder : {}),
                                ...order,
                            },
                        );
                    });

                    return {
                        ...(existing ?? {}),
                        orders: Array.from(byId.values()),
                    };
                });
                return;
            }

            scheduleRefetch();
        },
    });

    const [updateStatus] = useMutation(UPDATE_ORDER_STATUS);
    const [startPreparing, { loading: startingPrep }] = useMutation(START_PREPARING);

    // Show only upcoming orders for this business.
    const businessOrders = ((data?.orders as unknown as Order[]) || []).filter((order: any) => {
        const belongsToBusiness = order.businesses.some((b: any) => b.business.id === user?.businessId);
        const isUpcoming = UPCOMING_ORDER_STATUSES.includes(order.status as OrderStatus);
        return belongsToBusiness && isUpcoming;
    });

    // Sort: PENDING first, then PREPARING, then by date desc
    const sortedOrders = [...businessOrders].sort((a, b) => {
        const priority: Record<string, number> = {
            PENDING: 0, PREPARING: 1, READY: 2, OUT_FOR_DELIVERY: 3, DELIVERED: 4, CANCELLED: 5,
        };
        const pDiff = (priority[a.status] ?? 99) - (priority[b.status] ?? 99);
        if (pDiff !== 0) return pDiff;
        return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
    });

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

    const renderOrderCard = ({ item: order }: { item: Order }) => {
        const businessOrder = order.businesses.find((b) => b.business.id === user?.businessId);
        if (!businessOrder) return null;

        const totalItems = businessOrder.items.reduce((sum, i) => sum + i.quantity, 0);
        const businessSubtotal = businessOrder.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
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
                    className="bg-card rounded-2xl mx-3 mb-3 overflow-hidden"
                    style={{
                        borderLeftWidth: 4,
                        borderLeftColor: STATUS_COLORS[order.status],
                        borderWidth: 1,
                        borderColor: `${STATUS_COLORS[order.status]}55`,
                        backgroundColor: STATUS_CARD_BG[order.status],
                    }}
                >
                    {/* ── Compact Header ── */}
                    <View className="px-3 pt-3 pb-2">
                        <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center flex-1">
                                <View
                                    className="w-9 h-9 rounded-xl items-center justify-center mr-2"
                                    style={{ backgroundColor: STATUS_BG[order.status] }}
                                >
                                    <Ionicons
                                        name={STATUS_ICONS[order.status]}
                                        size={18}
                                        color={STATUS_COLORS[order.status]}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-text font-bold text-base">#{order.displayId}</Text>
                                    <Text className="text-subtext text-xs">{timeAgo(order.orderDate)}</Text>
                                </View>
                            </View>
                            <View
                                className="px-2.5 py-1 rounded-full"
                                style={{ backgroundColor: STATUS_BG[order.status] }}
                            >
                                <Text className="font-bold text-xs" style={{ color: STATUS_COLORS[order.status] }}>
                                    {STATUS_LABELS[order.status]}
                                </Text>
                            </View>
                        </View>

                        {/* Elapsed Time Counter */}
                        <View className="flex-row items-center bg-background/40 rounded-xl px-2.5 py-2 mt-2">
                            <Ionicons name="time-outline" size={16} color="#0b89a9" />
                            <Text className="text-primary font-bold text-sm ml-2">
                                {order.status === 'PENDING' && getElapsedTime(order.orderDate)}
                                {order.status === 'PREPARING' && order.preparingAt && getElapsedTime(order.preparingAt)}
                                {order.status === 'READY' && order.readyAt && getElapsedTime(order.readyAt)}
                                {order.status === 'OUT_FOR_DELIVERY' && order.readyAt && getElapsedTime(order.readyAt)}
                            </Text>
                            <Text className="text-subtext text-xs ml-1">elapsed</Text>
                        </View>

                        {/* Prep Time Countdown - Compact */}
                        {isPreparing && timeRemaining && (
                            <View
                                className="flex-row items-center rounded-lg px-2.5 py-1.5 mt-2"
                                style={{
                                    backgroundColor: timeRemaining.isOverdue ? '#ef444420' : '#3b82f620',
                                }}
                            >
                                <Ionicons
                                    name={timeRemaining.isOverdue ? 'warning' : 'timer'}
                                    size={14}
                                    color={timeRemaining.isOverdue ? '#ef4444' : '#3b82f6'}
                                />
                                <Text
                                    className="font-bold text-xs ml-1.5 flex-1"
                                    style={{ color: timeRemaining.isOverdue ? '#ef4444' : '#3b82f6' }}
                                >
                                    {timeRemaining.text}
                                </Text>
                                {order.preparationMinutes && (
                                    <Text className="text-subtext text-xs">
                                        {order.preparationMinutes}min
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>

                    {/* ── Items - Compact ── */}
                    <View className="px-3 pb-2">
                        <Text className="text-subtext font-semibold text-xs mb-1.5 uppercase tracking-wider">
                            {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
                        </Text>

                        {businessOrder.items.map((item, index) => (
                            <View
                                key={index}
                                className="flex-row items-center py-1.5"
                                style={
                                    index < businessOrder.items.length - 1
                                        ? { borderBottomWidth: 1, borderBottomColor: 'rgba(55,65,81,0.3)' }
                                        : {}
                                }
                            >
                                <View className="w-7 h-7 rounded-lg bg-primary/20 items-center justify-center mr-2">
                                    <Text className="text-primary font-bold text-xs">{item.quantity}×</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-text font-semibold text-sm" numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    {item.notes && (
                                        <Text className="text-warning text-xs mt-0.5 italic" numberOfLines={1}>
                                            💬 {item.notes}
                                        </Text>
                                    )}
                                </View>
                                <Text className="text-text font-semibold text-sm ml-2">
                                    €{(item.unitPrice * item.quantity).toFixed(2)}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* ── Total - Compact ── */}
                    <View className="mx-3 pt-2 pb-2.5 border-t border-gray-700 flex-row items-center justify-between">
                        <Text className="text-subtext font-semibold text-sm">Total</Text>
                        <Text className="text-text font-bold text-lg">€{businessSubtotal.toFixed(2)}</Text>
                    </View>

                    {/* ── Actions - Compact ── */}
                    {isPending && (
                        <View className="flex-row border-t border-gray-700">
                            <TouchableOpacity
                                className="flex-1 py-3 flex-row items-center justify-center border-r border-gray-700"
                                style={{ backgroundColor: '#ef444415' }}
                                onPress={() => handleRejectOrder(order.id)}
                            >
                                <Ionicons name="close" size={18} color="#ef4444" />
                                <Text className="text-danger font-bold text-sm ml-1.5">Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-[2] py-3 flex-row items-center justify-center"
                                style={{ backgroundColor: '#10b98115' }}
                                onPress={() => handleAcceptTap(order.id)}
                            >
                                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                                <Text className="text-success font-bold text-sm ml-1.5">Accept</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isPreparing && (
                        <TouchableOpacity
                            className="py-3 flex-row items-center justify-center border-t border-gray-700"
                            style={{ backgroundColor: '#10b98115' }}
                            onPress={() => handleMarkReady(order.id)}
                        >
                            <Ionicons name="checkmark-done-circle" size={18} color="#10b981" />
                            <Text className="text-success font-bold text-sm ml-1.5">Mark Ready</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>

            {/* ── Orders List ── */}
            {loading && !data ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0b89a9" />
                    <Text className="text-subtext mt-4">Loading orders...</Text>
                </View>
            ) : (
                <FlatList
                    data={sortedOrders}
                    keyExtractor={(item) => item.id}
                    renderItem={renderOrderCard}
                    refreshControl={
                        <RefreshControl refreshing={false} onRefresh={refetch} tintColor="#0b89a9" />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-16">
                            <View className="w-20 h-20 rounded-full bg-card items-center justify-center mb-4">
                                <Ionicons name="receipt-outline" size={40} color="#6b7280" />
                            </View>
                            <Text className="text-text text-lg font-bold mb-1">No Orders</Text>
                            <Text className="text-subtext text-sm text-center px-12">
                                No upcoming orders for your business right now.
                            </Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingTop: 6, paddingBottom: 20 }}
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
