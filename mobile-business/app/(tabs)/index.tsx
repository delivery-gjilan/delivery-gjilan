import { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    useWindowDimensions,
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
import {
    GET_BUSINESS_OPERATIONS,
    UPDATE_BUSINESS_OPERATIONS,
} from '@/graphql/business';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import * as Haptics from 'expo-haptics';

type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

const UPCOMING_ORDER_STATUSES: ReadonlyArray<OrderStatus> = [
    'PENDING',
    'PREPARING',
    'READY',
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
    driver?: {
        id: string;
        firstName: string;
        lastName: string;
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
    { label: '25 min', value: 25 },
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
];

const PREP_PRESET_OPTIONS = [10, 15, 20, 25, 30, 45];

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
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    const minutes = Math.floor(diffSec / 60);
    const seconds = diffSec % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function OrdersScreen() {
    const { t } = useTranslation();
    const apolloClient = useApolloClient();
    const { user } = useAuthStore();
    const [etaModalVisible, setEtaModalVisible] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedEta, setSelectedEta] = useState(10);
    const [customEta, setCustomEta] = useState('');
    const [tick, setTick] = useState(0);
    const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
    const [storeCloseModalVisible, setStoreCloseModalVisible] = useState(false);
    const [closingReason, setClosingReason] = useState('');
    const [prepModalVisible, setPrepModalVisible] = useState(false);
    const [selectedPrepTime, setSelectedPrepTime] = useState(20);
    const [customPrepTime, setCustomPrepTime] = useState('');
    const lastTapRef = useRef<Record<string, number>>({});
    const pendingOrderIdsRef = useRef<Set<string>>(new Set());
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    const businessId = user?.businessId ?? '';

    // Tick every 1s to keep elapsed timers fresh
    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const { data, loading, refetch } = useQuery(GET_BUSINESS_ORDERS);
    const { data: businessData, refetch: refetchBusinessOperations } = useQuery(GET_BUSINESS_OPERATIONS, {
        variables: { id: businessId },
        skip: !businessId,
        fetchPolicy: 'network-only',
    });
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
    const [updateBusinessOperations, { loading: updatingBusinessOps }] = useMutation(UPDATE_BUSINESS_OPERATIONS);

    const businessOps = businessData?.business;
    const isStoreClosed = Boolean(businessOps?.isTemporarilyClosed);
    const storeCloseReason = businessOps?.temporaryClosureReason ?? '';
    const avgPrepTime = businessOps?.avgPrepTimeMinutes ?? 20;

    // Show only upcoming orders for this business.
    const businessOrders = ((data?.orders as unknown as Order[]) || []).filter((order: any) => {
        const belongsToBusiness = order.businesses.some((b: any) => b.business.id === user?.businessId);
        const isUpcoming = UPCOMING_ORDER_STATUSES.includes(order.status as OrderStatus);
        return belongsToBusiness && isUpcoming;
    });

    // Sort: PENDING first, then PREPARING, then by date desc
    const STATUS_PRIORITY: Record<OrderStatus, number> = {
        PENDING: 0,
        PREPARING: 1,
        READY: 2,
        OUT_FOR_DELIVERY: 3,
        DELIVERED: 4,
        CANCELLED: 5,
    };

    const sortedOrders = [...businessOrders].sort((a, b) => {
        const pDiff = (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99);
        if (pDiff !== 0) return pDiff;
        return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
    });

    const hasPendingOrders = sortedOrders.some((order) => order.status === 'PENDING');

    useEffect(() => {
        const pendingIds = new Set(sortedOrders.filter((order) => order.status === 'PENDING').map((order) => order.id));
        const hadPendingBefore = pendingOrderIdsRef.current;

        const hasNewPending = Array.from(pendingIds).some((id) => !hadPendingBefore.has(id));
        pendingOrderIdsRef.current = pendingIds;

        if (hasNewPending) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setTimeout(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }, 220);
        }
    }, [sortedOrders]);

    useEffect(() => {
        if (!hasPendingOrders) {
            return;
        }

        const interval = setInterval(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setTimeout(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }, 320);
        }, 20000);

        return () => clearInterval(interval);
    }, [hasPendingOrders]);

    const handleDoubleTap = useCallback((order: Order) => {
        const now = Date.now();
        const lastTap = lastTapRef.current[order.id] || 0;
        if (now - lastTap < 400) {
            if (order.status === 'PENDING') {
                setSelectedOrderId(order.id);
                setSelectedEta(10);
                setCustomEta('');
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

        const customEtaNumber = customEta.trim() ? Number(customEta.trim()) : NaN;
        const finalEta = Number.isFinite(customEtaNumber) && customEtaNumber > 0 ? customEtaNumber : selectedEta;

        if (!Number.isFinite(finalEta) || finalEta <= 0) {
            Alert.alert(t('common.error', 'Error'), t('orders.invalid_minutes', 'Please enter valid minutes.'));
            return;
        }

        try {
            await startPreparing({
                variables: { id: selectedOrderId, preparationMinutes: Math.round(finalEta) },
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setEtaModalVisible(false);
            setSelectedOrderId(null);
            setCustomEta('');
            refetch();
        } catch (error: any) {
            Alert.alert(t('common.error', 'Error'), error.message);
        }
    };

    const handleMarkReady = async (orderId: string) => {
        try {
            await updateStatus({ variables: { id: orderId, status: 'READY' as any } });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            refetch();
        } catch (error: any) {
            Alert.alert(t('common.error', 'Error'), error.message);
        }
    };

    const handleRejectOrder = (orderId: string) => {
        Alert.alert(t('orders.cancel_order_title', 'Reject Order'), t('orders.cancel_order_prompt', 'Are you sure you want to reject this order?'), [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            {
                text: t('orders.yes_reject', 'Yes, Reject'),
                style: 'destructive',
                onPress: async () => {
                    try {
                        await updateStatus({ variables: { id: orderId, status: 'CANCELLED' as any } });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        refetch();
                    } catch (error: any) {
                        Alert.alert(t('common.error', 'Error'), error.message);
                    }
                },
            },
        ]);
    };

    const statusLabels: Record<OrderStatus, string> = {
        PENDING: t('orders.new_order', 'New Order'),
        PREPARING: t('orders.preparing', 'Preparing'),
        READY: t('orders.ready_pickup', 'Ready for Pickup'),
        OUT_FOR_DELIVERY: t('orders.out_for_delivery', 'Out for Delivery'),
        DELIVERED: t('orders.delivered', 'Delivered'),
        CANCELLED: t('orders.cancelled', 'Cancelled'),
    };

    const handleAcceptTap = (orderId: string) => {
        setSelectedOrderId(orderId);
        setSelectedEta(10);
        setCustomEta('');
        setEtaModalVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleOpenStore = async () => {
        if (!businessId) return;
        try {
            await updateBusinessOperations({
                variables: {
                    id: businessId,
                    input: {
                        isTemporarilyClosed: false,
                        temporaryClosureReason: null,
                    },
                },
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await refetchBusinessOperations();
        } catch (error: any) {
            Alert.alert(t('common.error', 'Error'), error?.message ?? 'Failed to open store');
        }
    };

    const handleCloseStore = async () => {
        if (!businessId) return;
        const reason = closingReason.trim();
        if (!reason) {
            Alert.alert(t('common.error', 'Error'), t('orders.close_reason_required', 'Please enter a closure reason.'));
            return;
        }
        try {
            await updateBusinessOperations({
                variables: {
                    id: businessId,
                    input: {
                        isTemporarilyClosed: true,
                        temporaryClosureReason: reason,
                    },
                },
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setStoreCloseModalVisible(false);
            setClosingReason('');
            await refetchBusinessOperations();
        } catch (error: any) {
            Alert.alert(t('common.error', 'Error'), error?.message ?? 'Failed to close store');
        }
    };

    const handleSaveAvgPrepTime = async () => {
        if (!businessId) return;
        const customValue = customPrepTime.trim() ? Number(customPrepTime.trim()) : NaN;
        const finalValue = Number.isFinite(customValue) && customValue > 0 ? customValue : selectedPrepTime;
        if (!Number.isFinite(finalValue) || finalValue < 1 || finalValue > 240) {
            Alert.alert(t('common.error', 'Error'), t('orders.invalid_prep_time', 'Preparation time must be between 1 and 240 minutes.'));
            return;
        }
        try {
            await updateBusinessOperations({
                variables: {
                    id: businessId,
                    input: {
                        avgPrepTimeMinutes: Math.round(finalValue),
                    },
                },
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setPrepModalVisible(false);
            setCustomPrepTime('');
            await refetchBusinessOperations();
        } catch (error: any) {
            Alert.alert(t('common.error', 'Error'), error?.message ?? 'Failed to update prep time');
        }
    };

    const toggleExpandedItems = (orderId: string) => {
        setExpandedOrderIds((prev) => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

    const renderOrderCard = ({ item: order }: { item: Order }) => {
        const businessOrder = order.businesses.find((b) => b.business.id === user?.businessId);
        if (!businessOrder) return null;

        const businessSubtotal = businessOrder.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
        const isPending = order.status === 'PENDING';
        const isPreparing = order.status === 'PREPARING';
        const isReady = order.status === 'READY';
        const showHeaderTimer = isPending || isReady;
        const canAct = isPending || isPreparing;
        const pendingBlinkOn = isPending && tick % 2 === 0;
        const maxCollapsedItems = 5;
        const isExpanded = expandedOrderIds.has(order.id);
        const shouldCollapseItems = businessOrder.items.length > maxCollapsedItems;
        const visibleItems = shouldCollapseItems && !isExpanded
            ? businessOrder.items.slice(0, maxCollapsedItems)
            : businessOrder.items;
        const hiddenItemsCount = businessOrder.items.length - visibleItems.length;

        const elapsedText =
            (order.status === 'PENDING' && getElapsedTime(order.orderDate)) ||
            (order.status === 'PREPARING' && order.preparingAt && getElapsedTime(order.preparingAt)) ||
            (order.status === 'READY' && order.readyAt && getElapsedTime(order.readyAt)) ||
            (order.status === 'OUT_FOR_DELIVERY' && order.readyAt && getElapsedTime(order.readyAt)) ||
            '--:--';

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
                    className="bg-card rounded-2xl mb-3 overflow-hidden"
                    style={{
                        marginHorizontal: isTablet ? 16 : 12,
                        maxWidth: isTablet ? 980 : undefined,
                        alignSelf: 'center',
                        width: '100%',
                        borderLeftWidth: 4,
                        borderLeftColor: pendingBlinkOn ? '#ef4444' : STATUS_COLORS[order.status],
                        borderWidth: 1,
                        borderColor: pendingBlinkOn ? 'rgba(239,68,68,0.95)' : `${STATUS_COLORS[order.status]}55`,
                        backgroundColor: pendingBlinkOn ? 'rgba(239,68,68,0.18)' : STATUS_CARD_BG[order.status],
                    }}
                >
                    {/* ── Compact Header ── */}
                    <View className="px-3 pt-3 pb-2">
                        <View className="flex-row items-start justify-between mb-2">
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

                            {showHeaderTimer && (
                                <View className="mx-2 mt-0.5 px-2.5 py-1 rounded-full bg-white/15">
                                    <View className="flex-row items-center">
                                        <Ionicons name="time-outline" size={isTablet ? 13 : 12} color="#fff" />
                                        <Text className={`text-white font-bold ml-1.5 ${isTablet ? 'text-sm' : 'text-xs'}`}>
                                            {elapsedText}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            <View className="items-end">
                                <View
                                    className="px-2.5 py-1 rounded-full"
                                    style={{ backgroundColor: STATUS_BG[order.status] }}
                                >
                                    <Text className="font-bold text-xs" style={{ color: STATUS_COLORS[order.status] }}>
                                        {statusLabels[order.status]}
                                    </Text>
                                </View>
                                {isPreparing && (
                                    <Text className="text-subtext text-[10px] mt-1">
                                        {t('orders.tap_twice_mark_ready', 'Tap twice to mark ready')}
                                    </Text>
                                )}
                                {order.driver && (
                                    <Text className="text-white/85 text-[10px] mt-1 font-bold" numberOfLines={1}>
                                        {order.driver.firstName} {order.driver.lastName}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Elapsed Time Counter */}
                        {!showHeaderTimer && (
                            <View
                                className="flex-row items-center rounded-xl px-3 py-2.5 mt-2"
                                style={{ backgroundColor: STATUS_BG[order.status] }}
                            >
                                <Ionicons name="time-outline" size={isTablet ? 18 : 17} color="#fff" />
                                <Text
                                    className={`font-extrabold ml-2 ${isTablet ? 'text-xl' : 'text-lg'}`}
                                    style={{ color: '#fff' }}
                                >
                                    {elapsedText}
                                </Text>
                                <Text className={`text-white/80 ml-1 ${isTablet ? 'text-sm' : 'text-xs'}`}>{t('orders.elapsed', 'elapsed')}</Text>

                                {isPreparing && timeRemaining && (
                                    <View className="ml-auto flex-row items-center">
                                        <View className="w-px h-5 bg-white/35 mr-2" />
                                        <Ionicons
                                            name={timeRemaining.isOverdue ? 'warning' : 'timer-outline'}
                                            size={isTablet ? 16 : 15}
                                            color="#fff"
                                        />
                                        <Text
                                            className={`font-bold ml-1 ${isTablet ? 'text-base' : 'text-sm'}`}
                                            style={{ color: '#fff' }}
                                        >
                                            {timeRemaining.text}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                    </View>

                    {/* ── Items - Compact ── */}
                    <View className="px-3 pb-2">
                        {visibleItems.map((item, index) => (
                            <View key={index} className="py-2">
                                <View className="flex-row items-start">
                                    <View
                                        className="rounded-full items-center justify-center self-start mt-0.5 mr-2.5 px-2.5 py-1.5"
                                        style={{
                                            backgroundColor: STATUS_COLORS[order.status],
                                            borderWidth: 1,
                                            borderColor: 'rgba(255,255,255,0.45)',
                                        }}
                                    >
                                        <Text
                                            className={`text-white font-extrabold leading-none ${isTablet ? 'text-2xl' : 'text-xl'}`}
                                        >
                                            {item.quantity}×
                                        </Text>
                                    </View>

                                    <View className="flex-1">
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-1 pr-2">
                                                <Text className={`text-text font-semibold ${isTablet ? 'text-base' : 'text-sm'}`} numberOfLines={2}>
                                                    {item.name}
                                                </Text>
                                            </View>

                                            <Text className={`text-text font-bold ml-2 ${isTablet ? 'text-base' : 'text-sm'}`}>
                                                €{(item.unitPrice * item.quantity).toFixed(2)}
                                            </Text>
                                        </View>

                                        {item.notes && (
                                            <View className="mt-2 bg-warning/10 rounded-lg px-2.5 py-2">
                                                <Text className={`text-warning mt-0.5 ${isTablet ? 'text-sm' : 'text-xs'}`}>
                                                    {item.notes}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {index < visibleItems.length - 1 && (
                                    <View
                                        className="mt-2 h-px w-full"
                                        style={{ backgroundColor: 'rgba(255,255,255,0.45)' }}
                                    />
                                )}
                            </View>
                        ))}

                        {shouldCollapseItems && (
                            <TouchableOpacity
                                className="mt-1 mb-1 self-start flex-row items-center"
                                onPress={() => toggleExpandedItems(order.id)}
                                activeOpacity={0.8}
                            >
                                <Text className="text-white font-bold text-sm">
                                    {isExpanded
                                        ? t('orders.show_less_items', 'Show less')
                                        : t('orders.show_all_items', 'Show all')} {hiddenItemsCount > 0 ? `(${hiddenItemsCount} ${t('orders.more_items', 'more')})` : ''}
                                </Text>
                                <Ionicons
                                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color="#ffffff"
                                    style={{ marginLeft: 4 }}
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* ── Total - Compact ── */}
                    <View className="mx-3 pt-2 pb-2.5 border-t border-gray-700 flex-row items-center justify-between">
                        <Text className={`text-subtext font-semibold ${isTablet ? 'text-base' : 'text-sm'}`}>{t('orders.total', 'Total')}</Text>
                        <Text className={`text-success font-extrabold ${isTablet ? 'text-3xl' : 'text-2xl'}`}>€{businessSubtotal.toFixed(2)}</Text>
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
                                <Text className="text-danger font-bold text-sm ml-1.5">{t('orders.reject', 'Reject')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-[2] py-3 flex-row items-center justify-center"
                                style={{ backgroundColor: '#10b98115' }}
                                onPress={() => handleAcceptTap(order.id)}
                            >
                                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                                <Text className="text-success font-bold text-sm ml-1.5">{t('orders.accept', 'Accept')}</Text>
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
                            <Text className="text-success font-bold text-sm ml-1.5">{t('orders.mark_ready', 'Mark Ready')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>

            {/* ── Operations Bar (Option A) ── */}
            <View className="px-3 pt-2 pb-1">
                <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                        className="flex-1 rounded-xl px-3 py-2.5 border"
                        style={{
                            backgroundColor: isStoreClosed ? '#ef444420' : '#10b98120',
                            borderColor: isStoreClosed ? '#ef444455' : '#10b98155',
                        }}
                        onPress={() => {
                            if (isStoreClosed) {
                                handleOpenStore();
                            } else {
                                setClosingReason(storeCloseReason);
                                setStoreCloseModalVisible(true);
                            }
                        }}
                        disabled={updatingBusinessOps}
                    >
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <Ionicons
                                    name={isStoreClosed ? 'close-circle' : 'checkmark-circle'}
                                    size={16}
                                    color={isStoreClosed ? '#ef4444' : '#10b981'}
                                />
                                <Text
                                    className="font-bold text-sm ml-1.5"
                                    style={{ color: isStoreClosed ? '#ef4444' : '#10b981' }}
                                >
                                    {isStoreClosed
                                        ? t('orders.store_closed', 'Store Closed')
                                        : t('orders.store_open', 'Store Open')}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />
                        </View>
                        {isStoreClosed && storeCloseReason ? (
                            <Text className="text-xs text-white/85 mt-1" numberOfLines={1}>
                                {storeCloseReason}
                            </Text>
                        ) : null}
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="rounded-xl px-3 py-2.5 border"
                        style={{
                            minWidth: 132,
                            backgroundColor: '#3b82f620',
                            borderColor: '#3b82f655',
                        }}
                        onPress={() => {
                            setSelectedPrepTime(avgPrepTime);
                            setCustomPrepTime('');
                            setPrepModalVisible(true);
                        }}
                        disabled={updatingBusinessOps}
                    >
                        <View className="flex-row items-center justify-center">
                            <Ionicons name="timer-outline" size={15} color="#60a5fa" />
                            <Text className="text-[#60a5fa] font-bold text-sm ml-1.5">
                                {t('orders.avg_prep', 'Avg Prep')} {avgPrepTime}m
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Orders List ── */}
            {loading && !data ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#7C3AED" />
                    <Text className="text-subtext mt-4">{t('orders.loading_orders', 'Loading orders...')}</Text>
                </View>
            ) : (
                <FlatList
                    data={sortedOrders}
                    keyExtractor={(item) => item.id}
                    renderItem={renderOrderCard}
                    refreshControl={
                        <RefreshControl refreshing={false} onRefresh={refetch} tintColor="#7C3AED" />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center">
                            <View
                                className="w-24 h-24 rounded-2xl items-center justify-center mb-4"
                                style={{
                                    borderWidth: 2,
                                    borderStyle: 'dashed',
                                    borderColor: '#475569',
                                    backgroundColor: '#1E293B',
                                }}
                            >
                                <Ionicons name="image-outline" size={36} color="#94A3B8" />
                            </View>
                            <Text className="text-text text-lg font-bold mb-1">
                                {t('orders.no_orders_now', 'No orders for now')}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={
                        sortedOrders.length === 0
                            ? { flexGrow: 1, justifyContent: 'center', paddingBottom: 20 }
                            : { paddingTop: 6, paddingBottom: 20 }
                    }
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
                        style={{ width: '95%', maxWidth: 680 }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <View className="p-6 pb-4 items-center border-b border-gray-700">
                            <View className="w-16 h-16 rounded-full bg-success/20 items-center justify-center mb-4">
                                <Ionicons name="time" size={32} color="#10b981" />
                            </View>
                            <Text className="text-text font-bold text-2xl mb-1">{t('orders.prep_time', 'Preparation Time')}</Text>
                            <Text className="text-subtext text-base text-center">
                                {t('orders.prep_time_question', 'How long will it take to prepare this order?')}
                            </Text>
                        </View>

                        {/* ETA Options */}
                        <View className="p-6 pt-5 flex-row flex-wrap justify-center gap-3">
                            {ETA_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    className="py-4 px-6 rounded-2xl items-center"
                                    style={{
                                        minWidth: 100,
                                        backgroundColor:
                                            selectedEta === option.value ? '#7C3AED' : '#374151',
                                    }}
                                    onPress={() => {
                                        setSelectedEta(option.value);
                                        setCustomEta('');
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
                                        {t('orders.minutes', 'minutes')}
                                    </Text>
                                </TouchableOpacity>
                            ))}

                            <View className="w-full mt-2">
                                <Text className="text-subtext text-sm mb-2">
                                    {t('orders.custom_minutes', 'Custom minutes')}
                                </Text>
                                <TextInput
                                    value={customEta}
                                    onChangeText={(value) => {
                                        const sanitized = value.replace(/[^0-9]/g, '');
                                        setCustomEta(sanitized);
                                    }}
                                    keyboardType="number-pad"
                                    placeholder={t('orders.write_minutes', 'Write minutes...')}
                                    placeholderTextColor="#6b7280"
                                    className="bg-background text-text rounded-xl px-4 py-3 border border-gray-700"
                                />
                            </View>
                        </View>

                        {/* Modal Actions */}
                        <View className="p-6 pt-2 flex-row gap-3">
                            <TouchableOpacity
                                className="flex-1 py-4 rounded-2xl bg-gray-700 items-center"
                                onPress={() => setEtaModalVisible(false)}
                            >
                                <Text className="text-subtext font-bold text-base">{t('common.cancel', 'Cancel')}</Text>
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
                                            Accept — {(customEta.trim() ? customEta : String(selectedEta))} min
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── Close Store Modal ── */}
            <Modal
                visible={storeCloseModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setStoreCloseModalVisible(false)}
            >
                <Pressable
                    className="flex-1 items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                    onPress={() => setStoreCloseModalVisible(false)}
                >
                    <Pressable
                        className="bg-card rounded-3xl overflow-hidden"
                        style={{ width: '92%', maxWidth: 560 }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View className="p-5 border-b border-gray-700">
                            <Text className="text-text font-bold text-xl">
                                {t('orders.close_store', 'Close Store')}
                            </Text>
                            <Text className="text-subtext mt-1">
                                {t('orders.close_store_hint', 'Customers will see your store as closed until you reopen it.')}
                            </Text>
                        </View>

                        <View className="p-5">
                            <Text className="text-subtext text-sm mb-2">
                                {t('orders.close_reason', 'Reason')}
                            </Text>
                            <TextInput
                                value={closingReason}
                                onChangeText={setClosingReason}
                                placeholder={t('orders.close_reason_placeholder', 'e.g. High load, kitchen maintenance...')}
                                placeholderTextColor="#6b7280"
                                className="bg-background text-text rounded-xl px-4 py-3 border border-gray-700"
                                multiline
                            />
                        </View>

                        <View className="p-5 pt-0 flex-row gap-3">
                            <TouchableOpacity
                                className="flex-1 py-3 rounded-xl bg-gray-700 items-center"
                                onPress={() => setStoreCloseModalVisible(false)}
                            >
                                <Text className="text-subtext font-bold">{t('common.cancel', 'Cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 py-3 rounded-xl bg-danger items-center"
                                onPress={handleCloseStore}
                                disabled={updatingBusinessOps}
                            >
                                {updatingBusinessOps ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white font-bold">{t('orders.close_store', 'Close Store')}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── Avg Prep Time Modal ── */}
            <Modal
                visible={prepModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPrepModalVisible(false)}
            >
                <Pressable
                    className="flex-1 items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                    onPress={() => setPrepModalVisible(false)}
                >
                    <Pressable
                        className="bg-card rounded-3xl overflow-hidden"
                        style={{ width: '92%', maxWidth: 560 }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View className="p-5 border-b border-gray-700">
                            <Text className="text-text font-bold text-xl">
                                {t('orders.avg_prep_time', 'Average Preparation Time')}
                            </Text>
                            <Text className="text-subtext mt-1">
                                {t('orders.avg_prep_hint', 'Used as default when accepting new orders.')}
                            </Text>
                        </View>

                        <View className="p-5 pt-4 flex-row flex-wrap justify-center gap-2">
                            {PREP_PRESET_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    className="px-4 py-2.5 rounded-xl"
                                    style={{
                                        backgroundColor: selectedPrepTime === option ? '#3b82f6' : '#374151',
                                        minWidth: 72,
                                        alignItems: 'center',
                                    }}
                                    onPress={() => {
                                        setSelectedPrepTime(option);
                                        setCustomPrepTime('');
                                    }}
                                >
                                    <Text
                                        className="font-bold"
                                        style={{ color: selectedPrepTime === option ? '#fff' : '#9ca3af' }}
                                    >
                                        {option}m
                                    </Text>
                                </TouchableOpacity>
                            ))}

                            <View className="w-full mt-2">
                                <Text className="text-subtext text-sm mb-2">
                                    {t('orders.custom_minutes', 'Custom minutes')}
                                </Text>
                                <TextInput
                                    value={customPrepTime}
                                    onChangeText={(value) => {
                                        const sanitized = value.replace(/[^0-9]/g, '');
                                        setCustomPrepTime(sanitized);
                                    }}
                                    keyboardType="number-pad"
                                    placeholder={t('orders.write_minutes', 'Write minutes...')}
                                    placeholderTextColor="#6b7280"
                                    className="bg-background text-text rounded-xl px-4 py-3 border border-gray-700"
                                />
                            </View>
                        </View>

                        <View className="p-5 pt-2 flex-row gap-3">
                            <TouchableOpacity
                                className="flex-1 py-3 rounded-xl bg-gray-700 items-center"
                                onPress={() => setPrepModalVisible(false)}
                            >
                                <Text className="text-subtext font-bold">{t('common.cancel', 'Cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 py-3 rounded-xl bg-primary items-center"
                                onPress={handleSaveAvgPrepTime}
                                disabled={updatingBusinessOps}
                            >
                                {updatingBusinessOps ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white font-bold">{t('common.save', 'Save')}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}
