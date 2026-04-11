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
    ScrollView,
    Image,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useApolloClient, useQuery, useMutation, useSubscription } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import {
    GET_BUSINESS_ORDERS,
    GET_BUSINESS_ORDER_REVIEWS,
    UPDATE_ORDER_STATUS,
    START_PREPARING,
    ORDERS_SUBSCRIPTION,
    UPDATE_PREPARATION_TIME,
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
    PREPARING: '#f97316',
    READY: '#22c55e',
    OUT_FOR_DELIVERY: '#22c55e',
    DELIVERED: '#6b7280',
    CANCELLED: '#ef4444',
};

const STATUS_BG: Record<OrderStatus, string> = {
    PENDING: '#f59e0b22',
    PREPARING: '#f9731622',
    READY: '#22c55e22',
    OUT_FOR_DELIVERY: '#22c55e22',
    DELIVERED: '#6b728022',
    CANCELLED: '#ef444422',
};

const STATUS_CARD_BG: Record<OrderStatus, string> = {
    PENDING: '#f59e0b14',
    PREPARING: '#f9731614',
    READY: '#22c55e14',
    OUT_FOR_DELIVERY: '#22c55e14',
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
    const isMarket = user?.business?.businessType === 'MARKET';
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
    const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingOrderIdsRef = useRef<Set<string>>(new Set());
    const soundRef = useRef<Audio.Sound | null>(null);
    const [productModalOrder, setProductModalOrder] = useState<Order | null>(null);
    const [addTimeModalOrder, setAddTimeModalOrder] = useState<Order | null>(null);
    const [addTimeAmount, setAddTimeAmount] = useState(10);
    const [customAddTime, setCustomAddTime] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);
    const [completedPage, setCompletedPage] = useState(0);
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    const businessId = user?.businessId ?? '';

    // Tick every 1s to keep elapsed timers fresh
    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    // Load beep sound
    useEffect(() => {
        Audio.Sound.createAsync(require('@/assets/beep.wav')).then(({ sound }) => {
            soundRef.current = sound;
        }).catch(() => {});
        return () => {
            soundRef.current?.unloadAsync();
        };
    }, []);

    // Play beep × 3 with 1000 ms gaps: beep → 1000ms → beep → 1000ms → beep
    const playBeepPeriod = useCallback(() => {
        const beep = () => soundRef.current?.replayAsync().catch(() => {});
        beep();
        setTimeout(beep, 1000);
        setTimeout(beep, 2000);
    }, []);

    // Single period is 3 beeps 2100ms apart (4200ms total); cycle = period + 15s cooldown
    const playTwoPeriods = useCallback(() => {
        playBeepPeriod();
    }, [playBeepPeriod]);

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
                    const currentOrders = Array.isArray(existing?.orders?.orders) ? existing.orders.orders : [];
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
                        orders: {
                            ...(existing?.orders ?? {}),
                            orders: Array.from(byId.values()),
                        },
                    };
                });
                return;
            }

            scheduleRefetch();
        },
    });

    const [updateStatus] = useMutation(UPDATE_ORDER_STATUS);
    const [startPreparing, { loading: startingPrep }] = useMutation(START_PREPARING);
    const [updatePreparationTimeMutation] = useMutation(UPDATE_PREPARATION_TIME);
    const { data: reviewsData, loading: reviewsLoading } = useQuery(GET_BUSINESS_ORDER_REVIEWS, {
        variables: { limit: 25, offset: 0 },
    });
    const [updateBusinessOperations, { loading: updatingBusinessOps }] = useMutation(UPDATE_BUSINESS_OPERATIONS);

    const businessOps = businessData?.business;
    const isStoreClosed = Boolean(businessOps?.isTemporarilyClosed);
    const storeCloseReason = businessOps?.temporaryClosureReason ?? '';
    const avgPrepTime = businessOps?.avgPrepTimeMinutes ?? 20;

    // Show only upcoming orders for this business.
    const _allOrders = (data?.orders?.orders as unknown as Order[]) || [];
    const businessOrders = _allOrders.filter((order: any) => {
        const belongsToBusiness = order.businesses?.some((b: any) => b.business.id === user?.businessId);
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

    const COMPLETED_PAGE_SIZE = 10;
    const completedOrders = _allOrders
        .filter((order: any) => {
            const belongsToBusiness = order.businesses?.some((b: any) => b.business.id === user?.businessId);
            return belongsToBusiness && (order.status === 'DELIVERED' || order.status === 'CANCELLED');
        })
        .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    const visibleCompletedOrders = completedOrders.slice(0, (completedPage + 1) * COMPLETED_PAGE_SIZE);
    const hasMoreCompleted = visibleCompletedOrders.length < completedOrders.length;

    useEffect(() => {
        const pendingIds = new Set(sortedOrders.filter((order) => order.status === 'PENDING').map((order) => order.id));
        const hadPendingBefore = pendingOrderIdsRef.current;

        const hasNewPending = Array.from(pendingIds).some((id) => !hadPendingBefore.has(id));
        pendingOrderIdsRef.current = pendingIds;

        if (hasNewPending) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            playBeepPeriod();
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400);
        }
    }, [sortedOrders, playBeepPeriod]);

    useEffect(() => {
        if (!hasPendingOrders) {
            return;
        }

        // 2 periods immediately, then every 19.5 s (2×period + 15 s cooldown)
        playTwoPeriods();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const interval = setInterval(() => {
            playTwoPeriods();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 17000);

        return () => clearInterval(interval);
    }, [hasPendingOrders, playTwoPeriods]);

    const handleDoubleTap = useCallback((order: Order) => {
        const now = Date.now();
        const lastTap = lastTapRef.current[order.id] || 0;
        if (now - lastTap < 400) {
            // Double tap — cancel any pending single-tap and act
            if (singleTapTimerRef.current) {
                clearTimeout(singleTapTimerRef.current);
                singleTapTimerRef.current = null;
            }
            if (order.status === 'PENDING') {
                if (isMarket) {
                    // Market orders skip PREPARING — jump straight to READY
                    handleMarkReady(order.id);
                } else {
                    setSelectedOrderId(order.id);
                    setSelectedEta(10);
                    setCustomEta('');
                    setEtaModalVisible(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
            } else if (order.status === 'PREPARING') {
                handleMarkReady(order.id);
            }
            lastTapRef.current[order.id] = 0;
        } else {
            lastTapRef.current[order.id] = now;
            // Single tap on market order — show product images after delay
            if (isMarket) {
                singleTapTimerRef.current = setTimeout(() => {
                    singleTapTimerRef.current = null;
                    setProductModalOrder(order);
                }, 420);
            }
        }
    }, [isMarket]);

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
        PREPARING: isMarket ? t('orders.packing', 'Packing') : t('orders.preparing', 'Preparing'),

        READY: t('orders.ready_pickup', 'Ready for Pickup'),
        OUT_FOR_DELIVERY: t('orders.out_for_delivery', 'Out for Delivery'),
        DELIVERED: t('orders.delivered', 'Delivered'),
        CANCELLED: t('orders.cancelled', 'Cancelled'),
    };

    const handleAcceptTap = (orderId: string) => {
        if (isMarket) {
            // Market orders skip PREPARING — jump straight to READY
            handleMarkReady(orderId);
            return;
        }
        setSelectedOrderId(orderId);
        setSelectedEta(10);
        setCustomEta('');
        setEtaModalVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const ADD_TIME_PRESETS = [5, 10, 15, 20, 30];

    const handleAddTime = async () => {
        if (!addTimeModalOrder) return;
        const customVal = customAddTime.trim() ? Number(customAddTime.trim()) : NaN;
        const extra = Number.isFinite(customVal) && customVal > 0 ? customVal : addTimeAmount;
        const currentMinutes = addTimeModalOrder.preparationMinutes ?? 0;
        const newMinutes = Math.min(180, currentMinutes + Math.round(extra));
        try {
            await updatePreparationTimeMutation({
                variables: { id: addTimeModalOrder.id, preparationMinutes: newMinutes },
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setAddTimeModalOrder(null);
            setCustomAddTime('');
            refetch();
        } catch (error: any) {
            Alert.alert(t('common.error', 'Error'), error.message);
        }
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
        try {
            await updateBusinessOperations({
                variables: {
                    id: businessId,
                    input: {
                        isTemporarilyClosed: true,
                        temporaryClosureReason: reason || null,
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
        const customerName = order.user
            ? `${order.user.firstName} ${order.user.lastName}`.trim()
            : t('orders.customer', 'Customer');
        const customerPhone = order.user?.phoneNumber?.trim();

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
            <View style={isTablet ? { flex: 1 } : undefined}>
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
                        marginHorizontal: 8,
                        flex: isTablet ? 1 : undefined,
                        width: isTablet ? undefined : '100%' as const,
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

                    {/* ── Customer ── */}
                    <View className="px-3 pb-2">
                        <View className="rounded-xl px-2.5 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                            <View className="flex-row items-center">
                                <Ionicons name="person-outline" size={14} color="#cbd5e1" />
                                <Text className={`text-text font-semibold ml-1.5 ${isTablet ? 'text-sm' : 'text-xs'}`} numberOfLines={1}>
                                    {customerName}
                                </Text>
                            </View>
                            {customerPhone ? (
                                <View className="flex-row items-center mt-1">
                                    <Ionicons name="call-outline" size={12} color="#94a3b8" />
                                    <Text className={`text-subtext ml-1.5 ${isTablet ? 'text-sm' : 'text-xs'}`} numberOfLines={1}>
                                        {customerPhone}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
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

                                    {isMarket && item.imageUrl ? (
                                        <Image
                                            source={{ uri: item.imageUrl }}
                                            style={{
                                                width: isTablet ? 52 : 44,
                                                height: isTablet ? 52 : 44,
                                                borderRadius: 10,
                                                marginRight: 10,
                                                backgroundColor: '#1e293b',
                                            }}
                                            resizeMode="cover"
                                        />
                                    ) : null}

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
                        <View className="flex-row border-t border-gray-700">
                            <TouchableOpacity
                                className="py-3 flex-row items-center justify-center border-r border-gray-700"
                                style={{ flex: 1, backgroundColor: '#f59e0b15' }}
                                onPress={() => {
                                    setAddTimeModalOrder(order);
                                    setAddTimeAmount(10);
                                    setCustomAddTime('');
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <Ionicons name="add-circle-outline" size={18} color="#f59e0b" />
                                <Text className="font-bold text-sm ml-1.5" style={{ color: '#f59e0b' }}>{t('orders.add_time', 'Add Time')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="py-3 flex-row items-center justify-center"
                                style={{ flex: 2, backgroundColor: '#10b98115' }}
                                onPress={() => handleMarkReady(order.id)}
                            >
                                <Ionicons name="checkmark-done-circle" size={18} color="#10b981" />
                                <Text className="text-success font-bold text-sm ml-1.5">{t('orders.mark_ready', 'Mark Ready')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Pressable>
            </View>
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
                    key={isTablet ? 'two-col' : 'one-col'}
                    numColumns={isTablet ? 2 : 1}
                    columnWrapperStyle={isTablet ? { paddingHorizontal: 8 } : undefined}
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
                    ListFooterComponent={
                        completedOrders.length > 0 ? (
                            <View style={{ paddingHorizontal: 4, paddingTop: 16 }}>
                                <TouchableOpacity
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingVertical: 14,
                                        borderRadius: 16,
                                        backgroundColor: showCompleted ? '#374151' : '#1E293B',
                                        borderWidth: 1,
                                        borderColor: showCompleted ? '#6b7280' : '#475569',
                                    }}
                                    onPress={() => {
                                        setShowCompleted((prev) => !prev);
                                        if (!showCompleted) setCompletedPage(0);
                                    }}
                                >
                                    <Ionicons
                                        name={showCompleted ? 'chevron-up' : 'checkbox-outline'}
                                        size={18}
                                        color="#9ca3af"
                                    />
                                    <Text style={{ color: '#9ca3af', fontWeight: '700', fontSize: 14, marginLeft: 8 }}>
                                        {showCompleted
                                            ? t('orders.hide_completed', 'Hide Completed')
                                            : t('orders.show_completed', 'Show Completed') + ` (${completedOrders.length})`}
                                    </Text>
                                </TouchableOpacity>

                                {showCompleted && (
                                    <View style={{ marginTop: 12 }}>
                                        {visibleCompletedOrders.map((order) => {
                                            const businessOrder = order.businesses.find((b) => b.business.id === user?.businessId);
                                            if (!businessOrder) return null;
                                            const businessSubtotal = businessOrder.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
                                            const isCancelled = order.status === 'CANCELLED';
                                            return (
                                                <View
                                                    key={order.id}
                                                    style={{
                                                        backgroundColor: '#1E293B',
                                                        borderRadius: 16,
                                                        padding: 14,
                                                        marginBottom: 10,
                                                        borderWidth: 1,
                                                        borderColor: isCancelled ? '#ef444440' : '#22c55e40',
                                                        opacity: 0.85,
                                                    }}
                                                >
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <View style={{
                                                                paddingHorizontal: 8,
                                                                paddingVertical: 3,
                                                                borderRadius: 8,
                                                                backgroundColor: isCancelled ? '#ef444420' : '#22c55e20',
                                                            }}>
                                                                <Text style={{
                                                                    color: isCancelled ? '#ef4444' : '#22c55e',
                                                                    fontSize: 11,
                                                                    fontWeight: '700',
                                                                }}>
                                                                    {isCancelled ? t('orders.cancelled', 'Cancelled') : t('orders.delivered', 'Delivered')}
                                                                </Text>
                                                            </View>
                                                            <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600', marginLeft: 8 }}>
                                                                #{order.displayId}
                                                            </Text>
                                                        </View>
                                                        <Text style={{ color: '#64748b', fontSize: 12 }}>
                                                            {timeAgo(order.orderDate)}
                                                        </Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Text style={{ color: '#cbd5e1', fontSize: 13 }} numberOfLines={1}>
                                                            {businessOrder.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                                                        </Text>
                                                        <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '700', marginLeft: 8 }}>
                                                            {businessSubtotal.toFixed(2)}€
                                                        </Text>
                                                    </View>
                                                </View>
                                            );
                                        })}

                                        {hasMoreCompleted && (
                                            <TouchableOpacity
                                                style={{
                                                    alignItems: 'center',
                                                    paddingVertical: 12,
                                                    borderRadius: 12,
                                                    backgroundColor: '#374151',
                                                    marginTop: 4,
                                                }}
                                                onPress={() => setCompletedPage((p) => p + 1)}
                                            >
                                                <Text style={{ color: '#9ca3af', fontWeight: '600', fontSize: 13 }}>
                                                    {t('orders.load_more', 'Load More')}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}

                                <View style={{ marginTop: 14 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={{ color: '#cbd5e1', fontSize: 14, fontWeight: '700' }}>
                                            {t('orders.reviews_title', 'Recent Customer Reviews')}
                                        </Text>
                                        {reviewsLoading ? (
                                            <ActivityIndicator size="small" color="#94a3b8" />
                                        ) : null}
                                    </View>

                                    {((reviewsData?.businessOrderReviews as any[]) ?? []).length === 0 ? (
                                        <View
                                            style={{
                                                backgroundColor: '#1E293B',
                                                borderRadius: 14,
                                                borderWidth: 1,
                                                borderColor: '#334155',
                                                paddingVertical: 12,
                                                paddingHorizontal: 12,
                                            }}
                                        >
                                            <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                                {t('orders.reviews_empty', 'No private reviews yet.')}
                                            </Text>
                                        </View>
                                    ) : (
                                        ((reviewsData?.businessOrderReviews as any[]) ?? []).slice(0, 8).map((review: any) => {
                                            const stars = '★'.repeat(Math.max(0, Number(review?.rating ?? 0))).padEnd(5, '☆');
                                            const quick = Array.isArray(review?.quickFeedback) ? review.quickFeedback : [];
                                            const comment = String(review?.comment ?? '').trim();
                                            return (
                                                <View
                                                    key={String(review.id)}
                                                    style={{
                                                        backgroundColor: '#1E293B',
                                                        borderRadius: 14,
                                                        borderWidth: 1,
                                                        borderColor: '#334155',
                                                        paddingVertical: 12,
                                                        paddingHorizontal: 12,
                                                        marginBottom: 8,
                                                    }}
                                                >
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Text style={{ color: '#fbbf24', fontSize: 14, fontWeight: '700' }}>{stars}</Text>
                                                        <Text style={{ color: '#64748b', fontSize: 11 }}>
                                                            #{review.orderId?.slice?.(0, 8) ?? ''} · {timeAgo(String(review.createdAt))}
                                                        </Text>
                                                    </View>

                                                    {quick.length > 0 ? (
                                                        <Text style={{ color: '#cbd5e1', fontSize: 12, marginTop: 6 }}>
                                                            {quick.join(' • ')}
                                                        </Text>
                                                    ) : null}

                                                    {comment ? (
                                                        <Text style={{ color: '#e2e8f0', fontSize: 13, marginTop: 6, lineHeight: 18 }}>
                                                            {comment}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            );
                                        })
                                    )}
                                </View>
                            </View>
                        ) : null
                    }
                    contentContainerStyle={
                        sortedOrders.length === 0 && completedOrders.length === 0
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

            {/* ── Add Time Modal ── */}
            <Modal
                visible={!!addTimeModalOrder}
                transparent
                animationType="fade"
                onRequestClose={() => setAddTimeModalOrder(null)}
            >
                <Pressable
                    className="flex-1 items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                    onPress={() => setAddTimeModalOrder(null)}
                >
                    <Pressable
                        className="bg-card rounded-3xl overflow-hidden"
                        style={{ width: '92%', maxWidth: 560 }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View className="p-5 border-b border-gray-700 items-center">
                            <View className="w-14 h-14 rounded-full items-center justify-center mb-3" style={{ backgroundColor: '#f59e0b22' }}>
                                <Ionicons name="add-circle-outline" size={28} color="#f59e0b" />
                            </View>
                            <Text className="text-text font-bold text-xl mb-1">
                                {t('orders.add_time_title', 'Extend Preparation Time')}
                            </Text>
                            {addTimeModalOrder && (
                                <Text className="text-subtext text-sm">
                                    #{addTimeModalOrder.displayId} · {t('orders.prep_time', 'Preparation Time')}: {addTimeModalOrder.preparationMinutes ?? 0} min
                                </Text>
                            )}
                            <Text className="text-subtext text-sm text-center mt-1">
                                {t('orders.add_time_subtext', 'How many extra minutes does this order need?')}
                            </Text>
                        </View>

                        <View className="p-5 pt-4 flex-row flex-wrap justify-center gap-2">
                            {ADD_TIME_PRESETS.map((preset) => (
                                <TouchableOpacity
                                    key={preset}
                                    className="px-4 py-2.5 rounded-xl"
                                    style={{
                                        backgroundColor: addTimeAmount === preset ? '#f59e0b' : '#374151',
                                        minWidth: 72,
                                        alignItems: 'center',
                                    }}
                                    onPress={() => {
                                        setAddTimeAmount(preset);
                                        setCustomAddTime('');
                                    }}
                                >
                                    <Text
                                        className="font-bold"
                                        style={{ color: addTimeAmount === preset ? '#fff' : '#9ca3af' }}
                                    >
                                        +{preset}m
                                    </Text>
                                </TouchableOpacity>
                            ))}

                            <View className="w-full mt-2">
                                <Text className="text-subtext text-sm mb-2">
                                    {t('orders.custom_minutes', 'Custom minutes')}
                                </Text>
                                <TextInput
                                    value={customAddTime}
                                    onChangeText={(value) => {
                                        const sanitized = value.replace(/[^0-9]/g, '');
                                        setCustomAddTime(sanitized);
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
                                onPress={() => setAddTimeModalOrder(null)}
                            >
                                <Text className="text-subtext font-bold">{t('common.cancel', 'Cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 py-3 rounded-xl items-center"
                                style={{ backgroundColor: '#f59e0b' }}
                                onPress={handleAddTime}
                            >
                                <Text className="text-white font-bold">{t('orders.add_time_confirm', 'Confirm')}</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── Product Images Modal (Market only) ── */}
            <Modal
                visible={!!productModalOrder}
                transparent
                animationType="slide"
                onRequestClose={() => setProductModalOrder(null)}
            >
                <Pressable
                    className="flex-1 justify-end"
                    style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
                    onPress={() => setProductModalOrder(null)}
                >
                    <Pressable
                        style={{
                            backgroundColor: '#0f172a',
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            maxHeight: '88%',
                            paddingBottom: 32,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.08)',
                        }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Handle bar */}
                        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                        </View>

                        {/* Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
                            <View>
                                <Text style={{ color: '#f1f5f9', fontSize: 20, fontWeight: '700' }}>
                                    #{productModalOrder?.displayId}
                                </Text>
                                <Text style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
                                    {productModalOrder?.businesses.find((b) => b.business.id === user?.businessId)?.items.length ?? 0} items
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => setProductModalOrder(null)}
                                hitSlop={12}
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 10,
                                    backgroundColor: 'rgba(255,255,255,0.07)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons name="close" size={18} color="#64748b" />
                            </Pressable>
                        </View>

                        <ScrollView
                            style={{ paddingHorizontal: 16 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {productModalOrder?.businesses
                                .find((b) => b.business.id === user?.businessId)
                                ?.items.map((item, index) => (
                                    <View
                                        key={index}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            backgroundColor: '#1e293b',
                                            borderRadius: 18,
                                            padding: 14,
                                            marginBottom: 12,
                                            borderWidth: 1,
                                            borderColor: 'rgba(255,255,255,0.07)',
                                        }}
                                    >
                                        {/* Product image or placeholder */}
                                        {item.imageUrl ? (
                                            <Image
                                                source={{ uri: item.imageUrl }}
                                                style={{
                                                    width: 80,
                                                    height: 80,
                                                    borderRadius: 14,
                                                    backgroundColor: '#0f172a',
                                                    marginRight: 14,
                                                    flexShrink: 0,
                                                }}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View
                                                style={{
                                                    width: 80,
                                                    height: 80,
                                                    borderRadius: 14,
                                                    backgroundColor: '#0f172a',
                                                    marginRight: 14,
                                                    flexShrink: 0,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderWidth: 1,
                                                    borderColor: 'rgba(255,255,255,0.06)',
                                                }}
                                            >
                                                <Ionicons name="image-outline" size={28} color="#334155" />
                                            </View>
                                        )}

                                        {/* Item info */}
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: '#f1f5f9', fontSize: 16, fontWeight: '700', lineHeight: 22 }}>
                                                {item.name}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                                                <View style={{
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 3,
                                                    borderRadius: 20,
                                                    backgroundColor: '#7c3aed22',
                                                    borderWidth: 1,
                                                    borderColor: '#7c3aed44',
                                                }}>
                                                    <Text style={{ color: '#c4b5fd', fontSize: 12, fontWeight: '700' }}>
                                                        ×{item.quantity}
                                                    </Text>
                                                </View>
                                                <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                                                    €{item.unitPrice.toFixed(2)} each
                                                </Text>
                                            </View>
                                            <Text style={{ color: '#10b981', fontSize: 16, fontWeight: '800', marginTop: 6 }}>
                                                €{(item.unitPrice * item.quantity).toFixed(2)}
                                            </Text>
                                            {item.notes ? (
                                                <View style={{
                                                    marginTop: 8,
                                                    backgroundColor: '#f59e0b18',
                                                    borderRadius: 10,
                                                    padding: 8,
                                                    borderWidth: 1,
                                                    borderColor: '#f59e0b33',
                                                }}>
                                                    <Text style={{ color: '#fcd34d', fontSize: 12 }}>{item.notes}</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    </View>
                                ))
                            }
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}
