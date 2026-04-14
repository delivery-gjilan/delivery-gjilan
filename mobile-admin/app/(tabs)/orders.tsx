import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApolloClient, useQuery, useSubscription, useMutation } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { BottomSheet } from '@/components/BottomSheet';
import {
    GET_ORDERS,
    ALL_ORDERS_SUBSCRIPTION,
    ASSIGN_DRIVER_TO_ORDER,
    UPDATE_ORDER_STATUS,
    START_PREPARING,
    APPROVE_ORDER,
} from '@/graphql/orders';
import { GET_DRIVERS } from '@/graphql/drivers';
import { ORDER_STATUS_COLORS } from '@/utils/constants';
import { formatRelativeTime, formatCurrency } from '@/utils/helpers';

const QUICK_PREPARATION_MINUTES = 20;
const ACTIVE_ORDER_STATUSES = ['AWAITING_APPROVAL', 'PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] as const;
const ORDER_STATUS_OPTIONS = [
    { value: 'AWAITING_APPROVAL', label: 'Awaiting Approval' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PREPARING', label: 'Preparing' },
    { value: 'READY', label: 'Ready' },
    { value: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export default function OrdersScreen() {
    const apolloClient = useApolloClient();
    const theme = useTheme();
    const { t } = useTranslations();
    const router = useRouter();

    const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
    const [statusOrderId, setStatusOrderId] = useState<string | null>(null);
    const [showCompleted, setShowCompleted] = useState(true);
    const orderQueryVariables = useMemo(() => ({ limit: 200, offset: 0 }), []);
    const { data, loading, refetch } = useQuery(GET_ORDERS, {
        variables: orderQueryVariables,
        fetchPolicy: 'network-only',
        nextFetchPolicy: 'cache-and-network',
        notifyOnNetworkStatusChange: true,
    });
    const { data: driversData } = useQuery(GET_DRIVERS);
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

    useSubscription(ALL_ORDERS_SUBSCRIPTION, {
        onData: ({ data: subscriptionData }) => {
            const incomingOrders = subscriptionData.data?.allOrdersUpdated;
            if (!incomingOrders || incomingOrders.length === 0) {
                scheduleRefetch();
                return;
            }

            apolloClient.cache.updateQuery({ query: GET_ORDERS, variables: orderQueryVariables }, (existing) => {
                const currentConnection = existing?.orders;
                const currentOrders = Array.isArray(currentConnection?.orders) ? currentConnection.orders : [];
                const byId = new Map(currentOrders.map((order) => [String(order?.id), order]));

                incomingOrders.forEach((order) => {
                    const existingOrder = byId.get(String(order?.id));
                    if (existingOrder && typeof existingOrder === 'object') {
                        byId.set(String(order?.id), { ...existingOrder, ...order });
                    } else {
                        byId.set(String(order?.id), order);
                    }
                });

                return {
                    ...(existing ?? {}),
                    orders: {
                        ...(currentConnection ?? {}),
                        orders: Array.from(byId.values()),
                    },
                };
            });
        },
    });

    const orders = data?.orders?.orders || [];
    const onlineDrivers = useMemo(
        () => (driversData?.drivers || []).filter((driver) => driver.driverConnection?.connectionStatus === 'CONNECTED'),
        [driversData],
    );

    const [assignDriver, { loading: assigningDriver }] = useMutation(ASSIGN_DRIVER_TO_ORDER);
    const [updateStatus, { loading: updatingStatus }] = useMutation(UPDATE_ORDER_STATUS);
    const [startPreparing, { loading: startingPrep }] = useMutation(START_PREPARING);
    const [approveOrder, { loading: approvingOrder }] = useMutation(APPROVE_ORDER);

    const sortedOrders = useMemo(
        () => [...orders].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()),
        [orders],
    );

    const activeOrders = useMemo(
        () => sortedOrders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status)),
        [sortedOrders],
    );

    const completedOrders = useMemo(
        () => sortedOrders.filter((o) => ['DELIVERED', 'CANCELLED'].includes(o.status)),
        [sortedOrders],
    );

    const selectedOrderForAssign = useMemo(
        () => orders.find((order) => order.id === assignOrderId) || null,
        [orders, assignOrderId],
    );

    const selectedOrderForStatus = useMemo(
        () => orders.find((order) => order.id === statusOrderId) || null,
        [orders, statusOrderId],
    );

    const parseApprovalReason = useCallback((reason: string) => {
        const value = String(reason || '').toUpperCase();
        if (value.includes('FIRST')) return { label: 'First Order', color: '#22c55e' };
        if (value.includes('HIGH')) return { label: 'High Value', color: '#f59e0b' };
        if (value.includes('ZONE') || value.includes('LOCATION')) return { label: 'Out of Zone', color: '#fb923c' };
        return { label: reason, color: '#94a3b8' };
    }, []);

    const getQuickActionLabel = useCallback(
        (order: (typeof orders)[number]) => {
            if (order.status === 'AWAITING_APPROVAL') return 'Approve';
            if (order.status === 'PENDING') return t.orders.detail.startPreparing;
            if (order.status === 'PREPARING') return t.orders.detail.markReady;
            if (order.status === 'READY') return 'Start Delivery';
            if (order.status === 'OUT_FOR_DELIVERY') return 'Mark Delivered';
            return null;
        },
        [t],
    );

    const handleAssignDriver = useCallback(
        async (driverId: string) => {
            if (!assignOrderId) return;

            try {
                await assignDriver({ variables: { id: assignOrderId, driverId } });
                setAssignOrderId(null);
                await refetch();
            } catch (err: unknown) {
                Alert.alert('Error', (err as Error)?.message || 'Failed to assign driver');
            }
        },
        [assignDriver, assignOrderId, refetch],
    );

    const handleQuickProgress = useCallback(
        async (order: (typeof orders)[number]) => {
            try {
                if (order.status === 'AWAITING_APPROVAL') {
                    await approveOrder({ variables: { id: order.id } });
                    await refetch();
                    return;
                }

                if (order.status === 'PENDING') {
                    await startPreparing({
                        variables: {
                            id: order.id,
                            preparationMinutes: QUICK_PREPARATION_MINUTES,
                        },
                    });
                    await refetch();
                    return;
                }

                if (order.status === 'PREPARING') {
                    await updateStatus({ variables: { id: order.id, status: 'READY' } });
                    await refetch();
                    return;
                }

                if (order.status === 'READY') {
                    if (!order.driver?.id) {
                        Alert.alert('Driver required', 'Assign a driver before starting delivery.');
                        return;
                    }
                    await updateStatus({ variables: { id: order.id, status: 'OUT_FOR_DELIVERY' } });
                    await refetch();
                    return;
                }

                if (order.status === 'OUT_FOR_DELIVERY') {
                    await updateStatus({ variables: { id: order.id, status: 'DELIVERED' } });
                    await refetch();
                }
            } catch (err: unknown) {
                Alert.alert('Error', (err as Error)?.message || 'Failed to update order');
            }
        },
        [approveOrder, refetch, startPreparing, updateStatus],
    );

    const handleSelectStatus = useCallback(
        async (status: string) => {
            if (!statusOrderId) return;

            try {
                await updateStatus({ variables: { id: statusOrderId, status } });
                setStatusOrderId(null);
                await refetch();
            } catch (err: unknown) {
                Alert.alert('Error', (err as Error)?.message || 'Failed to update status');
            }
        },
        [refetch, statusOrderId, updateStatus],
    );

    const renderOrderCard = useCallback(
        (order: (typeof orders)[number], completed = false) => {
            const items = (order.businesses || []).flatMap((businessBlock) => businessBlock.items || []);
            const previewItems = items.slice(0, 3);
            const hasMoreItems = items.length > previewItems.length;
            const statusColor = ORDER_STATUS_COLORS[order.status] || '#6b7280';

            return (
            <TouchableOpacity
                key={order.id}
                className="mx-5 mb-3 p-4 rounded-2xl"
                style={{
                    backgroundColor: theme.colors.card,
                    borderWidth: 1,
                    borderColor: `${statusColor}55`,
                    borderLeftWidth: 4,
                    borderLeftColor: statusColor,
                    opacity: completed ? 0.86 : 1,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 2,
                }}
                onPress={() => router.push(`/order/${order.id}`)}
                activeOpacity={0.7}>
                <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                        <StatusBadge status={order.status} label={t.orders.status[order.status as keyof typeof t.orders.status]} />
                        {order.locationFlagged && !completed && (
                            <Ionicons name="warning" size={14} color="#f59e0b" style={{ marginLeft: 6 }} />
                        )}
                    </View>
                    <Text className="text-xs font-medium" style={{ color: theme.colors.subtext }}>
                        {formatRelativeTime(order.orderDate)}
                    </Text>
                </View>

                <Text className="text-xs mb-2" style={{ color: theme.colors.subtext }}>
                    #{order.displayId || order.id.slice(-6)}
                </Text>

                {!!order.approvalReasons?.length && !completed && (
                    <View className="flex-row flex-wrap mb-2" style={{ gap: 6 }}>
                        {order.approvalReasons.slice(0, 3).map((reason: string, idx: number) => {
                            const parsed = parseApprovalReason(reason);
                            return (
                                <View key={`${order.id}-reason-${idx}`} className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${parsed.color}22` }}>
                                    <Text className="text-[10px] font-semibold" style={{ color: parsed.color }}>
                                        {parsed.label}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                <View className="py-2 mb-2" style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                    <View className="flex-row items-center mb-1">
                        <Ionicons name="person-outline" size={14} color={theme.colors.subtext} />
                        <Text className="text-sm ml-1.5 flex-1" style={{ color: theme.colors.text }} numberOfLines={1}>
                            {order.user?.firstName} {order.user?.lastName}
                        </Text>
                        {order.user?.phoneNumber && (
                            <Text className="text-xs" style={{ color: theme.colors.subtext }} numberOfLines={1}>
                                {order.user.phoneNumber}
                            </Text>
                        )}
                    </View>
                    <View className="flex-row items-center">
                        <Ionicons name="bicycle-outline" size={14} color={theme.colors.subtext} />
                        <Text className="text-sm ml-1.5" style={{ color: theme.colors.subtext }} numberOfLines={1}>
                            {order.driver ? `${order.driver.firstName} ${order.driver.lastName}` : t.orders.detail.unassigned}
                        </Text>
                    </View>
                </View>

                <View className="mb-3">
                    {order.businesses?.map((b, i: number) => (
                        <View key={i} className="flex-row items-center mb-1">
                            <Ionicons
                                name={b.business?.businessType === 'RESTAURANT' ? 'restaurant' : 'storefront'}
                                size={16}
                                color={theme.colors.subtext}
                            />
                            <Text className="text-base font-semibold ml-2" style={{ color: theme.colors.text }}>
                                {b.business?.name}
                            </Text>
                        </View>
                    ))}

                    {previewItems.map((item, index: number) => (
                        <Text key={`${order.id}-item-${index}`} className="text-xs ml-6" style={{ color: theme.colors.subtext }} numberOfLines={1}>
                            x{item.quantity} {item.name}
                        </Text>
                    ))}
                    {hasMoreItems && (
                        <Text className="text-xs ml-6 mt-0.5" style={{ color: theme.colors.subtext }}>
                            +{items.length - previewItems.length} more items
                        </Text>
                    )}
                </View>

                {!!order.dropOffLocation?.address && (
                    <View className="flex-row items-center mb-3">
                        <Ionicons name="location-outline" size={14} color={theme.colors.subtext} />
                        <Text className="text-xs ml-1.5 flex-1" style={{ color: theme.colors.subtext }} numberOfLines={1}>
                            {order.dropOffLocation.address}
                        </Text>
                    </View>
                )}

                <View className="flex-row items-center justify-between">
                    <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                        {formatCurrency(order.totalPrice)}
                    </Text>
                    <TouchableOpacity
                        className="px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: `${theme.colors.primary}20` }}
                        onPress={() => router.push(`/order/${order.id}`)}>
                        <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
                            Details
                        </Text>
                    </TouchableOpacity>
                </View>

                {order.status === 'PREPARING' && order.estimatedReadyAt && (
                    <View className="flex-row items-center mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                        <Ionicons name="timer-outline" size={14} color="#6366f1" />
                        <Text className="text-sm ml-1.5 font-medium" style={{ color: '#6366f1' }}>
                            Ready ~{new Date(order.estimatedReadyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {order.preparationMinutes && ` (${order.preparationMinutes} min)`}
                        </Text>
                    </View>
                )}

                {!completed && getQuickActionLabel(order) && (
                    <View className="flex-row items-center mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                        <TouchableOpacity
                            className="flex-1 rounded-xl py-2.5 items-center mr-2"
                            style={{ backgroundColor: theme.colors.primary }}
                            onPress={() => setAssignOrderId(order.id)}>
                            <Text className="text-xs font-semibold text-white">
                                {order.driver ? 'Reassign Driver' : 'Assign Driver'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 rounded-xl py-2.5 items-center"
                            style={{ backgroundColor: '#0f172a' }}
                            onPress={() => handleQuickProgress(order)}>
                            <Text className="text-xs font-semibold text-white">{getQuickActionLabel(order)}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!completed && (
                    <View className="mt-2">
                        <TouchableOpacity
                            className="rounded-xl py-2.5 items-center"
                            style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}
                            onPress={() => setStatusOrderId(order.id)}>
                            <Text className="text-xs font-semibold" style={{ color: theme.colors.text }}>
                                Change Status
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
            );
        },
        [theme, t, router, parseApprovalReason, getQuickActionLabel, handleQuickProgress],
    );

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <View className="px-5 pt-3 pb-4">
                <Text className="text-3xl font-bold" style={{ color: theme.colors.text }}>
                    {t.orders.title}
                </Text>
                <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                    Active: {activeOrders.length} · Completed: {completedOrders.length}
                </Text>
            </View>

            <ScrollView
                refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />}
                contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}>
                <View className="px-5 mb-2">
                    <Text className="text-xs font-semibold uppercase" style={{ color: theme.colors.subtext }}>
                        Active Orders
                    </Text>
                </View>

                {activeOrders.length === 0 ? (
                    <EmptyState icon="receipt-outline" title="No active orders" message="Waiting for incoming orders" />
                ) : (
                    activeOrders.map((order) => renderOrderCard(order, false))
                )}

                <View className="px-5 mt-2 mb-2">
                    <TouchableOpacity
                        className="rounded-xl py-2.5 px-3 flex-row items-center justify-center"
                        style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}
                        onPress={() => setShowCompleted((prev) => !prev)}>
                        <Ionicons name={showCompleted ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.subtext} />
                        <Text className="text-xs font-semibold ml-1.5" style={{ color: theme.colors.subtext }}>
                            {showCompleted ? 'Hide completed orders' : `Show completed orders (${completedOrders.length})`}
                        </Text>
                    </TouchableOpacity>
                </View>

                {showCompleted &&
                    (completedOrders.length === 0 ? (
                        <EmptyState icon="checkmark-done-outline" title="No completed orders" message="Delivered and cancelled orders will appear here" />
                    ) : (
                        completedOrders.map((order) => renderOrderCard(order, true))
                    ))}
            </ScrollView>

            <BottomSheet visible={Boolean(assignOrderId)} onClose={() => setAssignOrderId(null)} title="Assign Driver">
                {!selectedOrderForAssign ? (
                    <Text className="text-sm py-6 text-center" style={{ color: theme.colors.subtext }}>
                        Order not found
                    </Text>
                ) : onlineDrivers.length === 0 ? (
                    <Text className="text-sm py-6 text-center" style={{ color: theme.colors.subtext }}>
                        No drivers online
                    </Text>
                ) : (
                    onlineDrivers.map((driver) => (
                        <TouchableOpacity
                            key={driver.id}
                            className="flex-row items-center p-3 rounded-xl mb-2"
                            style={{ backgroundColor: theme.colors.card }}
                            onPress={() => handleAssignDriver(driver.id)}>
                            <View className="w-10 h-10 rounded-full bg-green-500 items-center justify-center mr-3">
                                <Text className="text-white font-bold">
                                    {driver.firstName?.[0]}
                                    {driver.lastName?.[0]}
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                    {driver.firstName} {driver.lastName}
                                </Text>
                                <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                                    {driver.phoneNumber || driver.email}
                                </Text>
                            </View>
                            {selectedOrderForAssign.driver?.id === driver.id && <Ionicons name="checkmark-circle" size={20} color="#22c55e" />}
                        </TouchableOpacity>
                    ))
                )}
            </BottomSheet>

            <BottomSheet visible={Boolean(statusOrderId)} onClose={() => setStatusOrderId(null)} title="Change Status">
                {!selectedOrderForStatus ? (
                    <Text className="text-sm py-6 text-center" style={{ color: theme.colors.subtext }}>
                        Order not found
                    </Text>
                ) : (
                    ORDER_STATUS_OPTIONS.map((option) => {
                        const selected = selectedOrderForStatus.status === option.value;

                        return (
                            <TouchableOpacity
                                key={option.value}
                                className="flex-row items-center p-3 rounded-xl mb-2"
                                style={{ backgroundColor: theme.colors.card }}
                                onPress={() => handleSelectStatus(option.value)}>
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                        {option.label}
                                    </Text>
                                </View>
                                {selected && <Ionicons name="checkmark-circle" size={20} color="#22c55e" />}
                            </TouchableOpacity>
                        );
                    })
                )}
            </BottomSheet>
        </SafeAreaView>
    );
}
