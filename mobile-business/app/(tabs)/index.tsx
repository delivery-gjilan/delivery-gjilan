import { useEffect, useState, useCallback, useRef, useMemo, useReducer } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useApolloClient, useQuery, useMutation, useSubscription } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import {
    GET_BUSINESS_ORDERS,
    UPDATE_ORDER_STATUS,
    START_PREPARING,
    ORDERS_SUBSCRIPTION,
    UPDATE_PREPARATION_TIME,
    REMOVE_ORDER_ITEM,
} from '@/graphql/orders';
import { GET_BUSINESS_OPERATIONS, UPDATE_BUSINESS_OPERATIONS } from '@/graphql/business';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import { OrderStatus as GqlOrderStatus } from '@/gql/graphql';
import * as Haptics from 'expo-haptics';

import {
    Order,
    ScreenState,
    ScreenAction,
    UPCOMING_ORDER_STATUSES,
    STATUS_PRIORITY,
} from '@/components/orders/types';
import { StatusRail } from '@/components/orders/StatusRail';
import { OrderCard } from '@/components/orders/OrderCard';
import { OrderDetailPanel } from '@/components/orders/OrderDetailPanel';
import { EtaModal } from '@/components/orders/EtaModal';
import { StoreCloseModal } from '@/components/orders/StoreCloseModal';
import { PrepTimeModal } from '@/components/orders/PrepTimeModal';
import { AddTimeModal } from '@/components/orders/AddTimeModal';
import { ProductImagesModal } from '@/components/orders/ProductImagesModal';
import { RemoveItemModal } from '@/components/orders/RemoveItemModal';
import { DirectDispatchSheet } from '@/components/orders/DirectDispatchSheet';
import { GET_STORE_STATUS } from '@/graphql/store';

// ─── State ────────────────────────────────────────────────────────────────────

const initialScreenState: ScreenState = {
    etaModal: { visible: false, orderId: null, selectedEta: 10, customEta: '' },
    storeCloseModal: { visible: false, reason: '' },
    prepModal: { visible: false, selectedTime: 20, customTime: '' },
    productModalOrder: null,
    addTimeModal: { order: null, amount: 10, customTime: '' },
    removeItemModal: { data: null, reason: '', quantityToRemove: 1 },
    completedView: { show: false, page: 0 },
    selectedOrder: null,
};

function screenReducer(state: ScreenState, action: ScreenAction): ScreenState {
    switch (action.type) {
        case 'OPEN_ETA_MODAL':
            return { ...state, etaModal: { visible: true, orderId: action.orderId, selectedEta: 10, customEta: '' } };
        case 'CLOSE_ETA_MODAL':
            return { ...state, etaModal: { ...state.etaModal, visible: false, orderId: null, customEta: '' } };
        case 'SET_ETA':
            return { ...state, etaModal: { ...state.etaModal, selectedEta: action.eta, customEta: '' } };
        case 'SET_CUSTOM_ETA':
            return { ...state, etaModal: { ...state.etaModal, customEta: action.value } };
        case 'OPEN_STORE_CLOSE_MODAL':
            return { ...state, storeCloseModal: { visible: true, reason: action.reason ?? '' } };
        case 'CLOSE_STORE_CLOSE_MODAL':
            return { ...state, storeCloseModal: { visible: false, reason: '' } };
        case 'SET_CLOSING_REASON':
            return { ...state, storeCloseModal: { ...state.storeCloseModal, reason: action.reason } };
        case 'OPEN_PREP_MODAL':
            return { ...state, prepModal: { visible: true, selectedTime: action.time, customTime: '' } };
        case 'CLOSE_PREP_MODAL':
            return { ...state, prepModal: { ...state.prepModal, visible: false, customTime: '' } };
        case 'SET_PREP_TIME':
            return { ...state, prepModal: { ...state.prepModal, selectedTime: action.time, customTime: '' } };
        case 'SET_CUSTOM_PREP_TIME':
            return { ...state, prepModal: { ...state.prepModal, customTime: action.value } };
        case 'OPEN_PRODUCT_MODAL':
            return { ...state, productModalOrder: action.order };
        case 'CLOSE_PRODUCT_MODAL':
            return { ...state, productModalOrder: null };
        case 'OPEN_ADD_TIME_MODAL':
            return { ...state, addTimeModal: { order: action.order, amount: 10, customTime: '' } };
        case 'CLOSE_ADD_TIME_MODAL':
            return { ...state, addTimeModal: { ...state.addTimeModal, order: null, customTime: '' } };
        case 'SET_ADD_TIME_AMOUNT':
            return { ...state, addTimeModal: { ...state.addTimeModal, amount: action.amount, customTime: '' } };
        case 'SET_CUSTOM_ADD_TIME':
            return { ...state, addTimeModal: { ...state.addTimeModal, customTime: action.value } };
        case 'OPEN_REMOVE_ITEM_MODAL':
            return { ...state, removeItemModal: { data: action.data, reason: '', quantityToRemove: 1 } };
        case 'CLOSE_REMOVE_ITEM_MODAL':
            return { ...state, removeItemModal: { data: null, reason: '', quantityToRemove: 1 } };
        case 'SET_REMOVE_ITEM_REASON':
            return { ...state, removeItemModal: { ...state.removeItemModal, reason: action.reason } };
        case 'SET_REMOVE_ITEM_QUANTITY':
            return { ...state, removeItemModal: { ...state.removeItemModal, quantityToRemove: action.quantity } };
        case 'TOGGLE_COMPLETED':
            return { ...state, completedView: { show: !state.completedView.show, page: !state.completedView.show ? 0 : state.completedView.page } };
        case 'SET_COMPLETED_PAGE':
            return { ...state, completedView: { ...state.completedView, page: action.page } };
        case 'SELECT_ORDER':
            return { ...state, selectedOrder: action.order };
        default:
            return state;
    }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type StatusFilter = 'PENDING' | 'PREPARING' | 'READY';

export default function OrdersScreen() {
    const { t } = useTranslation();
    const apolloClient = useApolloClient();
    const { user } = useAuthStore();
    const isMarket = user?.business?.businessType === 'MARKET';
    const [tick, setTick] = useState(0);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
    const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
    const [screenState, dispatch] = useReducer(screenReducer, initialScreenState);
    const {
        etaModal,
        storeCloseModal,
        prepModal,
        productModalOrder,
        addTimeModal,
        removeItemModal: removeItemModalState,
        completedView,
        selectedOrder,
    } = screenState;

    const { width } = useWindowDimensions();
    const isTablet = useMemo(() => width >= 768, [width]);
    const businessId = user?.businessId ?? '';

    const lastTapRef = useRef<Record<string, number>>({});
    const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingOrderIdsRef = useRef<Set<string>>(new Set());
    const soundRef = useRef<Audio.Sound | null>(null);
    const refetchCooldownRef = useRef(0);
    const refetchInFlightRef = useRef(false);
    const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Tick every 1s for elapsed timers ──
    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    // ── Load beep sound ──
    useEffect(() => {
        Audio.Sound.createAsync(require('@/assets/beep.wav')).then(({ sound }) => {
            soundRef.current = sound;
        }).catch(() => {
            console.warn('[Orders] Failed to load beep sound — haptic fallback will be used');
        });
        return () => {
            soundRef.current?.unloadAsync();
        };
    }, []);

    useEffect(() => {
        return () => {
            if (refetchTimerRef.current) {
                clearTimeout(refetchTimerRef.current);
                refetchTimerRef.current = null;
            }
        };
    }, []);

    const playBeepPeriod = useCallback(() => {
        if (soundRef.current) {
            const beep = () => soundRef.current?.replayAsync().catch(() => {});
            beep();
            setTimeout(beep, 1000);
            setTimeout(beep, 2000);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}), 1000);
            setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}), 2000);
        }
    }, []);

    const playTwoPeriods = useCallback(() => {
        playBeepPeriod();
    }, [playBeepPeriod]);

    // ── Queries ──
    const { data, loading, refetch } = useQuery(GET_BUSINESS_ORDERS);
    const { data: businessData, refetch: refetchBusinessOperations } = useQuery(GET_BUSINESS_OPERATIONS, {
        variables: { id: businessId },
        skip: !businessId,
        fetchPolicy: 'network-only',
    });

    const scheduleRefetch = useCallback(() => {
        const now = Date.now();
        const canRunNow = now - refetchCooldownRef.current >= 1200 && !refetchInFlightRef.current;
        if (!canRunNow) {
            if (refetchTimerRef.current) return;
            refetchTimerRef.current = setTimeout(() => {
                refetchTimerRef.current = null;
                if (refetchInFlightRef.current) return;
                refetchInFlightRef.current = true;
                refetchCooldownRef.current = Date.now();
                refetch().finally(() => { refetchInFlightRef.current = false; });
            }, 350);
            return;
        }
        refetchInFlightRef.current = true;
        refetchCooldownRef.current = now;
        refetch().finally(() => { refetchInFlightRef.current = false; });
    }, [refetch]);

    useSubscription(ORDERS_SUBSCRIPTION, {
        onData: ({ data: subscriptionData }) => {
            const incomingOrders = subscriptionData.data?.allOrdersUpdated;
            if (incomingOrders && incomingOrders.length > 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                apolloClient.cache.updateQuery({ query: GET_BUSINESS_ORDERS }, (existing) => {
                    const currentOrders = Array.isArray(existing?.orders?.orders) ? existing.orders.orders : [];
                    const byId = new Map(currentOrders.map((order: any) => [String(order?.id), order]));
                    incomingOrders.forEach((order: any) => {
                        const existingOrder = byId.get(String(order?.id));
                        byId.set(String(order?.id), { ...(existingOrder && typeof existingOrder === 'object' ? existingOrder : {}), ...order });
                    });
                    return { ...(existing ?? {}), orders: { ...(existing?.orders ?? {}), orders: Array.from(byId.values()) } } as any;
                });
                return;
            }
            scheduleRefetch();
        },
    });

    // ── Mutations ──
    const [updateStatus] = useMutation(UPDATE_ORDER_STATUS);
    const [startPreparing, { loading: startingPrep }] = useMutation(START_PREPARING);
    const [updatePreparationTimeMutation] = useMutation(UPDATE_PREPARATION_TIME);
    const [removeOrderItemMut, { loading: removingItem }] = useMutation(REMOVE_ORDER_ITEM);
    const [updateBusinessOperations, { loading: updatingBusinessOps }] = useMutation(UPDATE_BUSINESS_OPERATIONS);

    const businessOps = businessData?.business;
    const isStoreClosed = Boolean(businessOps?.isTemporarilyClosed);
    const storeCloseReason = businessOps?.temporaryClosureReason ?? '';
    const avgPrepTime = businessOps?.avgPrepTimeMinutes ?? 20;

    // ── Direct Dispatch ──
    const { data: storeStatusData } = useQuery(GET_STORE_STATUS);
    const [showDispatchSheet, setShowDispatchSheet] = useState(false);
    const directDispatchEnabled =
        Boolean(storeStatusData?.getStoreStatus?.directDispatchEnabled) &&
        Boolean(businessOps?.directDispatchEnabled);

    // ── Order lists ──
    const _allOrders = (data?.orders?.orders as unknown as Order[]) || [];

    const businessOrders = useMemo(() => {
        return _allOrders.filter((order: any) => {
            const belongsToBusiness = order.businesses?.some((b: any) => b.business.id === user?.businessId);
            const isUpcoming = UPCOMING_ORDER_STATUSES.includes(order.status);
            return belongsToBusiness && isUpcoming;
        });
    }, [_allOrders, user?.businessId]);

    const sortedOrders = useMemo(() => {
        return [...businessOrders].sort((a, b) => {
            const pDiff = (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99);
            if (pDiff !== 0) return pDiff;
            return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
        });
    }, [businessOrders]);

    const statusCounts = useMemo(() => ({
        PENDING: sortedOrders.filter((o) => o.status === 'PENDING').length,
        PREPARING: sortedOrders.filter((o) => o.status === 'PREPARING').length,
        READY: sortedOrders.filter((o) => o.status === 'READY').length,
    }), [sortedOrders]);

    const filteredOrders = useMemo(() => {
        return sortedOrders.filter((o) => o.status === statusFilter);
    }, [sortedOrders, statusFilter]);

    const hasPendingOrders = statusCounts.PENDING > 0;

    const COMPLETED_PAGE_SIZE = 10;
    const completedOrders = useMemo(() => {
        return _allOrders
            .filter((order: any) => {
                const belongsToBusiness = order.businesses?.some((b: any) => b.business.id === user?.businessId);
                return belongsToBusiness && (order.status === 'DELIVERED' || order.status === 'CANCELLED');
            })
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }, [_allOrders, user?.businessId]);

    const visibleCompletedOrders = completedOrders.slice(0, (completedView.page + 1) * COMPLETED_PAGE_SIZE);

    // ── Audio/haptic alerts ──
    useEffect(() => {
        const pendingIds = new Set(sortedOrders.filter((order) => order.status === 'PENDING').map((order) => order.id));
        const hadPendingBefore = pendingOrderIdsRef.current;
        const hasNewPending = Array.from(pendingIds).some((id) => !hadPendingBefore.has(id));
        pendingOrderIdsRef.current = pendingIds;
        if (hasNewPending) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            playBeepPeriod();
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400);
            // Auto-switch rail to PENDING when new order arrives
            setStatusFilter('PENDING');
        }
    }, [sortedOrders, playBeepPeriod]);

    useEffect(() => {
        if (!hasPendingOrders) return;
        playTwoPeriods();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const interval = setInterval(() => {
            playTwoPeriods();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 17000);
        return () => clearInterval(interval);
    }, [hasPendingOrders, playTwoPeriods]);

    // ── Sync selectedOrder with live data ──
    useEffect(() => {
        if (!selectedOrder) return;
        const updated = sortedOrders.find((o) => o.id === selectedOrder.id);
        if (updated) {
            dispatch({ type: 'SELECT_ORDER', order: updated });
        } else {
            // Order left active list (completed/cancelled)
            dispatch({ type: 'SELECT_ORDER', order: null });
        }
    }, [sortedOrders]);

    // ── Tap handlers ──
    const handleCardPress = useCallback((order: Order) => {
        const now = Date.now();
        const lastTap = lastTapRef.current[order.id] || 0;

        if (now - lastTap < 400) {
            // Double-tap
            if (singleTapTimerRef.current) {
                clearTimeout(singleTapTimerRef.current);
                singleTapTimerRef.current = null;
            }
            if (order.status === 'PENDING') {
                if (isMarket) {
                    handleMarkReady(order.id);
                } else {
                    dispatch({ type: 'OPEN_ETA_MODAL', orderId: order.id });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
            } else if (order.status === 'PREPARING') {
                handleMarkReady(order.id);
            }
            lastTapRef.current[order.id] = 0;
        } else {
            lastTapRef.current[order.id] = now;
            // Single tap — open detail panel
            singleTapTimerRef.current = setTimeout(() => {
                singleTapTimerRef.current = null;
                dispatch({ type: 'SELECT_ORDER', order });
                if (isMarket && !isTablet) {
                    dispatch({ type: 'OPEN_PRODUCT_MODAL', order });
                }
            }, 420);
        }
    }, [isMarket, isTablet]);

    // ── Action handlers ──
    const handleAcceptTap = useCallback((orderId: string) => {
        if (isMarket) {
            handleMarkReady(orderId);
            setStatusFilter('READY');
            return;
        }
        dispatch({ type: 'OPEN_ETA_MODAL', orderId });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [isMarket]);

    const handleAcceptWithEta = async () => {
        const orderId = etaModal.orderId;
        if (!orderId) return;
        const customEtaNumber = etaModal.customEta.trim() ? Number(etaModal.customEta.trim()) : NaN;
        const finalEta = Number.isFinite(customEtaNumber) && customEtaNumber > 0 ? customEtaNumber : etaModal.selectedEta;
        if (!Number.isFinite(finalEta) || finalEta <= 0) {
            Alert.alert(t('common.error', 'Error'), t('orders.invalid_minutes', 'Please enter valid minutes.'));
            return;
        }
        try {
            await startPreparing({ variables: { id: orderId, preparationMinutes: Math.round(finalEta) } });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            dispatch({ type: 'CLOSE_ETA_MODAL' });
            setStatusFilter('PREPARING');
            refetch();
        } catch (error: unknown) {
            Alert.alert(t('common.error', 'Error'), error instanceof Error ? error.message : 'Failed');
        }
    };

    const handleMarkReady = async (orderId: string) => {
        try {
            await updateStatus({ variables: { id: orderId, status: GqlOrderStatus.Ready } });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            refetch();
        } catch (error: unknown) {
            Alert.alert(t('common.error', 'Error'), error instanceof Error ? error.message : 'Failed');
        }
    };

    const handleRejectOrder = (orderId: string) => {
        Alert.alert(
            t('orders.cancel_order_title', 'Reject Order'),
            t('orders.cancel_order_prompt', 'Are you sure you want to reject this order?'),
            [
                { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                {
                    text: t('orders.yes_reject', 'Yes, Reject'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await updateStatus({ variables: { id: orderId, status: GqlOrderStatus.Cancelled } });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            dispatch({ type: 'SELECT_ORDER', order: null });
                            refetch();
                        } catch (error: unknown) {
                            Alert.alert(t('common.error', 'Error'), error instanceof Error ? error.message : 'Failed');
                        }
                    },
                },
            ],
        );
    };

    const handleRemoveItemConfirm = async () => {
        const { data: removeData, reason, quantityToRemove } = removeItemModalState;
        if (!removeData || !reason.trim()) return;
        try {
            await removeOrderItemMut({
                variables: { orderId: removeData.orderId, orderItemId: removeData.itemId, reason: reason.trim(), quantity: quantityToRemove },
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            dispatch({ type: 'CLOSE_REMOVE_ITEM_MODAL' });
            dispatch({ type: 'CLOSE_PRODUCT_MODAL' });
            refetch();
        } catch (error: unknown) {
            Alert.alert(t('common.error', 'Error'), error instanceof Error ? error.message : 'Failed');
        }
    };

    const handleAddTime = async () => {
        const { order: addTimeOrder, amount, customTime } = addTimeModal;
        if (!addTimeOrder) return;
        const customVal = customTime.trim() ? Number(customTime.trim()) : NaN;
        const extra = Number.isFinite(customVal) && customVal > 0 ? customVal : amount;
        const newMinutes = Math.min(180, (addTimeOrder.preparationMinutes ?? 0) + Math.round(extra));
        try {
            await updatePreparationTimeMutation({ variables: { id: addTimeOrder.id, preparationMinutes: newMinutes } });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            dispatch({ type: 'CLOSE_ADD_TIME_MODAL' });
            refetch();
        } catch (error: unknown) {
            Alert.alert(t('common.error', 'Error'), error instanceof Error ? error.message : 'Failed');
        }
    };

    const handleOpenStore = async () => {
        if (!businessId) return;
        try {
            await updateBusinessOperations({ variables: { id: businessId, input: { isTemporarilyClosed: false, temporaryClosureReason: null } } });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await refetchBusinessOperations();
        } catch (error: unknown) {
            Alert.alert(t('common.error', 'Error'), error instanceof Error ? error.message : 'Failed to open store');
        }
    };

    const handleCloseStore = async () => {
        if (!businessId) return;
        const reason = storeCloseModal.reason.trim();
        try {
            await updateBusinessOperations({ variables: { id: businessId, input: { isTemporarilyClosed: true, temporaryClosureReason: reason || null } } });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            dispatch({ type: 'CLOSE_STORE_CLOSE_MODAL' });
            await refetchBusinessOperations();
        } catch (error: unknown) {
            Alert.alert(t('common.error', 'Error'), error instanceof Error ? error.message : 'Failed to close store');
        }
    };

    const handleSaveAvgPrepTime = async () => {
        if (!businessId) return;
        const customValue = prepModal.customTime.trim() ? Number(prepModal.customTime.trim()) : NaN;
        const finalValue = Number.isFinite(customValue) && customValue > 0 ? customValue : prepModal.selectedTime;
        if (!Number.isFinite(finalValue) || finalValue < 1 || finalValue > 240) {
            Alert.alert(t('common.error', 'Error'), t('orders.invalid_prep_time', 'Preparation time must be between 1 and 240 minutes.'));
            return;
        }
        try {
            await updateBusinessOperations({ variables: { id: businessId, input: { avgPrepTimeMinutes: Math.round(finalValue) } } });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            dispatch({ type: 'CLOSE_PREP_MODAL' });
            await refetchBusinessOperations();
        } catch (error: unknown) {
            Alert.alert(t('common.error', 'Error'), error instanceof Error ? error.message : 'Failed to update prep time');
        }
    };

    const toggleExpandedItems = (orderId: string) => {
        setExpandedOrderIds((prev) => {
            const next = new Set(prev);
            if (next.has(orderId)) { next.delete(orderId); } else { next.add(orderId); }
            return next;
        });
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>

            {/* ── Main layout: [StatusRail | List | DetailPanel] ── */}
            <View style={{ flex: 1, flexDirection: 'row' }}>

                {/* Status Rail */}
                <StatusRail
                    activeFilter={statusFilter}
                    counts={statusCounts}
                    tick={tick}
                    isStoreClosed={isStoreClosed}
                    avgPrepTime={avgPrepTime}
                    directDispatchEnabled={directDispatchEnabled}
                    controlsDisabled={updatingBusinessOps}
                    onSelect={setStatusFilter}
                    onToggleStore={() => {
                        if (isStoreClosed) {
                            handleOpenStore();
                        } else {
                            dispatch({ type: 'OPEN_STORE_CLOSE_MODAL', reason: storeCloseReason });
                        }
                    }}
                    onEditPrepTime={() => dispatch({ type: 'OPEN_PREP_MODAL', time: avgPrepTime })}
                    onOpenDirectDispatch={() => setShowDispatchSheet(true)}
                />

                {/* Order list */}
                {loading && !data ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color="#7C3AED" />
                        <Text className="text-subtext mt-4">{t('orders.loading_orders', 'Loading orders...')}</Text>
                    </View>
                ) : (
                    <FlatList
                        style={{ flex: 1 }}
                        data={filteredOrders}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item: order }) => (
                            <OrderCard
                                order={order}
                                businessId={businessId}
                                isTablet={isTablet}
                                isMarket={isMarket}
                                tick={tick}
                                isSelected={selectedOrder?.id === order.id}
                                isExpanded={expandedOrderIds.has(order.id)}
                                onPress={() => handleCardPress(order)}
                                onDoubleTap={() => {}}
                                onAccept={() => handleAcceptTap(order.id)}
                                onMarkReady={() => handleMarkReady(order.id)}
                                onReject={() => handleRejectOrder(order.id)}
                                onAddTime={() => {
                                    dispatch({ type: 'OPEN_ADD_TIME_MODAL', order });
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                                onRemoveItem={(data) => dispatch({ type: 'OPEN_REMOVE_ITEM_MODAL', data })}
                                onToggleExpand={() => toggleExpandedItems(order.id)}
                            />
                        )}
                        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#7C3AED" />}
                        ListEmptyComponent={
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
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
                                            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                            paddingVertical: 14, borderRadius: 16,
                                            backgroundColor: completedView.show ? '#374151' : '#1E293B',
                                            borderWidth: 1, borderColor: completedView.show ? '#6b7280' : '#475569',
                                        }}
                                        onPress={() => dispatch({ type: 'TOGGLE_COMPLETED' })}
                                    >
                                        <Ionicons name={completedView.show ? 'chevron-up' : 'checkbox-outline'} size={18} color="#9ca3af" />
                                        <Text style={{ color: '#9ca3af', fontWeight: '700', fontSize: 14, marginLeft: 8 }}>
                                            {completedView.show
                                                ? t('orders.hide_completed', 'Hide Completed')
                                                : `${t('orders.show_completed', 'Show Completed')} (${completedOrders.length})`}
                                        </Text>
                                    </TouchableOpacity>

                                    {completedView.show && (
                                        <View style={{ marginTop: 12 }}>
                                            {visibleCompletedOrders.map((order) => {
                                                const businessOrder = order.businesses.find((b: any) => b.business.id === user?.businessId);
                                                if (!businessOrder) return null;
                                                const businessSubtotal = (businessOrder as any).items.reduce((sum: number, i: any) => sum + i.unitPrice * i.quantity, 0);
                                                const isCancelled = order.status === 'CANCELLED';
                                                return (
                                                    <View
                                                        key={order.id}
                                                        style={{
                                                            backgroundColor: '#1E293B', borderRadius: 16, padding: 14, marginBottom: 10,
                                                            borderWidth: 1, borderColor: isCancelled ? '#ef444440' : '#22c55e40', opacity: 0.85,
                                                        }}
                                                    >
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: isCancelled ? '#ef444420' : '#22c55e20' }}>
                                                                    <Text style={{ color: isCancelled ? '#ef4444' : '#22c55e', fontSize: 11, fontWeight: '700' }}>
                                                                        {isCancelled ? t('orders.cancelled', 'Cancelled') : t('orders.delivered', 'Delivered')}
                                                                    </Text>
                                                                </View>
                                                                <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600', marginLeft: 8 }}>
                                                                    #{order.displayId}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Text style={{ color: '#cbd5e1', fontSize: 13 }} numberOfLines={1}>
                                                                {(businessOrder as any).items.map((i: any) => `${i.quantity}× ${i.name}`).join(', ')}
                                                            </Text>
                                                            <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '700', marginLeft: 8 }}>
                                                                {businessSubtotal.toFixed(2)}€
                                                            </Text>
                                                        </View>
                                                    </View>
                                                );
                                            })}

                                            {visibleCompletedOrders.length < completedOrders.length && (
                                                <TouchableOpacity
                                                    onPress={() => dispatch({ type: 'SET_COMPLETED_PAGE', page: completedView.page + 1 })}
                                                    style={{ alignItems: 'center', paddingVertical: 12 }}
                                                >
                                                    <Text style={{ color: '#7C3AED', fontWeight: '700' }}>
                                                        {t('orders.load_more', 'Load more')}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>
                            ) : null
                        }
                        contentContainerStyle={{ flexGrow: 1, paddingTop: 6, paddingBottom: 20, paddingHorizontal: 4 }}
                    />
                )}

                {/* Detail panel (tablet: persistent sidebar; phone: bottom-sheet modal) */}
                <OrderDetailPanel
                    order={selectedOrder}
                    businessId={businessId}
                    isTablet={isTablet}
                    isMarket={isMarket}
                    tick={tick}
                    onClose={() => dispatch({ type: 'SELECT_ORDER', order: null })}
                    onAccept={handleAcceptTap}
                    onMarkReady={handleMarkReady}
                    onReject={handleRejectOrder}
                    onAddTime={(order) => {
                        dispatch({ type: 'OPEN_ADD_TIME_MODAL', order });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    onRemoveItem={(data) => dispatch({ type: 'OPEN_REMOVE_ITEM_MODAL', data })}
                />
            </View>

            {/* ── Modals ── */}
            <EtaModal
                visible={etaModal.visible}
                selectedEta={etaModal.selectedEta}
                customEta={etaModal.customEta}
                loading={startingPrep}
                onClose={() => dispatch({ type: 'CLOSE_ETA_MODAL' })}
                onSelectEta={(eta) => dispatch({ type: 'SET_ETA', eta })}
                onChangeCustomEta={(value) => dispatch({ type: 'SET_CUSTOM_ETA', value })}
                onConfirm={handleAcceptWithEta}
            />

            <StoreCloseModal
                visible={storeCloseModal.visible}
                reason={storeCloseModal.reason}
                loading={updatingBusinessOps}
                onClose={() => dispatch({ type: 'CLOSE_STORE_CLOSE_MODAL' })}
                onChangeReason={(reason) => dispatch({ type: 'SET_CLOSING_REASON', reason })}
                onConfirm={handleCloseStore}
            />

            <PrepTimeModal
                visible={prepModal.visible}
                selectedTime={prepModal.selectedTime}
                customTime={prepModal.customTime}
                loading={updatingBusinessOps}
                onClose={() => dispatch({ type: 'CLOSE_PREP_MODAL' })}
                onSelectTime={(time) => dispatch({ type: 'SET_PREP_TIME', time })}
                onChangeCustomTime={(value) => dispatch({ type: 'SET_CUSTOM_PREP_TIME', value })}
                onConfirm={handleSaveAvgPrepTime}
            />

            <AddTimeModal
                order={addTimeModal.order}
                amount={addTimeModal.amount}
                customTime={addTimeModal.customTime}
                onClose={() => dispatch({ type: 'CLOSE_ADD_TIME_MODAL' })}
                onSelectAmount={(amount) => dispatch({ type: 'SET_ADD_TIME_AMOUNT', amount })}
                onChangeCustomTime={(value) => dispatch({ type: 'SET_CUSTOM_ADD_TIME', value })}
                onConfirm={handleAddTime}
            />

            <ProductImagesModal
                order={productModalOrder}
                businessId={businessId}
                onClose={() => dispatch({ type: 'CLOSE_PRODUCT_MODAL' })}
                onRemoveItem={(data) => dispatch({ type: 'OPEN_REMOVE_ITEM_MODAL', data })}
            />

            <RemoveItemModal
                data={removeItemModalState.data}
                reason={removeItemModalState.reason}
                quantity={removeItemModalState.quantityToRemove}
                loading={removingItem}
                onClose={() => dispatch({ type: 'CLOSE_REMOVE_ITEM_MODAL' })}
                onChangeReason={(reason) => dispatch({ type: 'SET_REMOVE_ITEM_REASON', reason })}
                onChangeQuantity={(quantity) => dispatch({ type: 'SET_REMOVE_ITEM_QUANTITY', quantity })}
                onConfirm={handleRemoveItemConfirm}
            />

            <DirectDispatchSheet
                visible={showDispatchSheet}
                onClose={() => setShowDispatchSheet(false)}
                onCreated={() => refetch()}
                t={t}
            />

        </SafeAreaView>
    );
}
