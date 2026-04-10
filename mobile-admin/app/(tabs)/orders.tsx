import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApolloClient, useQuery, useSubscription, useMutation } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { StatusBadge, FilterChip } from '@/components/StatusBadge';
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

type StatusTab =
    | 'ALL'
    | 'AWAITING_APPROVAL'
    | 'PENDING'
    | 'PREPARING'
    | 'READY'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'CANCELLED';

const QUICK_PREPARATION_MINUTES = 20;

export default function OrdersScreen() {
    const apolloClient = useApolloClient();
    const theme = useTheme();
    const { t } = useTranslations();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
    const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
    const { data, loading, refetch }: any = useQuery(GET_ORDERS);
    const { data: driversData }: any = useQuery(GET_DRIVERS);
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
            const incomingOrders = subscriptionData.data?.allOrdersUpdated as any[] | undefined;
            if (!incomingOrders || incomingOrders.length === 0) {
                scheduleRefetch();
                return;
            }

            apolloClient.cache.updateQuery({ query: GET_ORDERS }, (existing: any) => {
                const currentOrders = Array.isArray(existing?.orders) ? existing.orders : [];
                const byId = new Map(currentOrders.map((order: any) => [String(order?.id), order]));

                incomingOrders.forEach((order: any) => {
                    const existingOrder = byId.get(String(order?.id));
                    byId.set(String(order?.id), { ...existingOrder, ...order });
                });

                return {
                    ...(existing ?? {}),
                    orders: Array.from(byId.values()),
                };
            });
        },
    });

    const orders = data?.orders || [];
    const onlineDrivers = useMemo(
        () => (driversData?.drivers || []).filter((driver: any) => driver.driverConnection?.connectionStatus === 'CONNECTED'),
        [driversData],
    );

    const [assignDriver, { loading: assigningDriver }] = useMutation(ASSIGN_DRIVER_TO_ORDER);
    const [updateStatus, { loading: updatingStatus }] = useMutation(UPDATE_ORDER_STATUS);
    const [startPreparing, { loading: startingPrep }] = useMutation(START_PREPARING);
    const [approveOrder, { loading: approvingOrder }] = useMutation(APPROVE_ORDER);

    const filteredOrders = useMemo(() => {
        if (activeTab === 'ALL') return orders;
        return orders.filter((o: any) => o.status === activeTab);
    }, [orders, activeTab]);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { ALL: orders.length };
        orders.forEach((o: any) => {
            counts[o.status] = (counts[o.status] || 0) + 1;
        });
        return counts;
    }, [orders]);

    const selectedOrderForAssign = useMemo(
        () => orders.find((order: any) => order.id === assignOrderId) || null,
        [orders, assignOrderId],
    );

    const getQuickActionLabel = useCallback(
        (order: any) => {
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
            } catch (err: any) {
                Alert.alert('Error', err?.message || 'Failed to assign driver');
            }
        },
        [assignDriver, assignOrderId, refetch],
    );

    const handleQuickProgress = useCallback(
        async (order: any) => {
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
            } catch (err: any) {
                Alert.alert('Error', err?.message || 'Failed to update order');
            }
        },
        [approveOrder, refetch, startPreparing, updateStatus],
    );

    const renderOrderItem = useCallback(
        ({ item: order }: { item: any }) => (
            <TouchableOpacity
                className="mx-5 mb-3 p-4 rounded-2xl"
                style={{
                    backgroundColor: theme.colors.card,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 2,
                }}
                onPress={() => router.push(`/order/${order.id}`)}
                activeOpacity={0.7}>
                {/* Header */}
                <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                        <StatusBadge status={order.status} label={t.orders.status[order.status as keyof typeof t.orders.status]} />
                        {order.needsApproval && (
                            <View className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f9731625' }}>
                                <Text className="text-[10px] font-semibold" style={{ color: '#f97316' }}>
                                    Approval
                                </Text>
                            </View>
                        )}
                        {order.locationFlagged && (
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

                {/* Business & Items */}
                <View className="mb-3">
                    {order.businesses?.map((b: any, i: number) => (
                        <View key={i} className="flex-row items-center mb-1">
                            <Ionicons
                                name={b.business?.businessType === 'RESTAURANT' ? 'restaurant' : 'storefront'}
                                size={16}
                                color={theme.colors.subtext}
                            />
                            <Text className="text-base font-semibold ml-2" style={{ color: theme.colors.text }}>
                                {b.business?.name}
                            </Text>
                            <Text className="text-sm ml-1.5" style={{ color: theme.colors.subtext }}>
                                ({b.items?.length} {b.items?.length === 1 ? 'item' : 'items'})
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Customer & Price */}
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <Ionicons name="person-outline" size={14} color={theme.colors.subtext} />
                        <Text className="text-sm ml-1.5 flex-1" style={{ color: theme.colors.subtext }} numberOfLines={1}>
                            {order.user?.firstName} {order.user?.lastName}
                        </Text>
                    </View>
                    {order.driver && (
                        <View className="flex-row items-center mx-3">
                            <Ionicons name="bicycle-outline" size={14} color={theme.colors.primary} />
                            <Text className="text-sm ml-1" style={{ color: theme.colors.primary }} numberOfLines={1}>
                                {order.driver.firstName}
                            </Text>
                        </View>
                    )}
                    <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                        {formatCurrency(order.totalPrice)}
                    </Text>
                </View>

                {/* Prep time if preparing */}
                {order.status === 'PREPARING' && order.estimatedReadyAt && (
                    <View className="flex-row items-center mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                        <Ionicons name="timer-outline" size={14} color="#6366f1" />
                        <Text className="text-sm ml-1.5 font-medium" style={{ color: '#6366f1' }}>
                            Ready ~{new Date(order.estimatedReadyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {order.preparationMinutes && ` (${order.preparationMinutes} min)`}
                        </Text>
                    </View>
                )}

                {getQuickActionLabel(order) && (
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
            </TouchableOpacity>
        ),
        [theme, t, router, getQuickActionLabel, handleQuickProgress],
    );

    const TABS: StatusTab[] = ['ALL', 'AWAITING_APPROVAL', 'PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            {/* Header */}
            <View className="px-5 pt-3 pb-4">
                <Text className="text-3xl font-bold" style={{ color: theme.colors.text }}>
                    {t.orders.title}
                </Text>
            </View>

            {/* Status Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="pb-4"
                contentContainerStyle={{ paddingHorizontal: 20 }}>
                {TABS.map((tab) => (
                    <FilterChip
                        key={tab}
                        label={`${tab === 'ALL' ? 'All' : t.orders.status[tab as keyof typeof t.orders.status]} ${statusCounts[tab] ? `(${statusCounts[tab]})` : ''}`}
                        active={activeTab === tab}
                        onPress={() => setActiveTab(tab)}
                        color={tab !== 'ALL' ? ORDER_STATUS_COLORS[tab] : undefined}
                    />
                ))}
            </ScrollView>

            {/* Orders List */}
            <FlatList
                data={filteredOrders}
                keyExtractor={(item: any) => item.id}
                renderItem={renderOrderItem}
                contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />}
                ListEmptyComponent={
                    <EmptyState icon="receipt-outline" title={t.orders.empty} message="No orders match the selected filter" />
                }
            />

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
                    onlineDrivers.map((driver: any) => (
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
        </SafeAreaView>
    );
}
