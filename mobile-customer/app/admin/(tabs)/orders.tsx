import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { AdminStatusBadge, AdminFilterChip } from '@/components/admin/AdminComponents';
import { ADMIN_GET_ORDERS } from '@/graphql/operations/admin/orders';
import { adminFormatRelativeTime, adminFormatCurrency, ADMIN_ORDER_STATUS_COLORS } from '@/utils/adminHelpers';

type StatusTab = 'ALL' | 'PENDING' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export default function AdminOrdersScreen() {
    const theme = useTheme();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
    const { data, loading, refetch }: any = useQuery(ADMIN_GET_ORDERS);

    const orders = data?.orders || [];

    const filteredOrders = useMemo(
        () => (activeTab === 'ALL' ? orders : orders.filter((o: any) => o.status === activeTab)),
        [orders, activeTab],
    );

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { ALL: orders.length };
        orders.forEach((o: any) => { counts[o.status] = (counts[o.status] || 0) + 1; });
        return counts;
    }, [orders]);

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
                onPress={() => router.push(`/admin/order/${order.id}` as any)}
                activeOpacity={0.7}>
                <View className="flex-row items-center justify-between mb-3">
                    <AdminStatusBadge status={order.status} />
                    <Text className="text-xs font-medium" style={{ color: theme.colors.subtext }}>
                        {adminFormatRelativeTime(order.orderDate)}
                    </Text>
                </View>

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
                        {adminFormatCurrency(order.totalPrice)}
                    </Text>
                </View>

                {order.status === 'PREPARING' && order.estimatedReadyAt && (
                    <View
                        className="flex-row items-center mt-3 pt-3"
                        style={{ borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                        <Ionicons name="timer-outline" size={14} color="#6366f1" />
                        <Text className="text-sm ml-1.5 font-medium" style={{ color: '#6366f1' }}>
                            Ready ~{new Date(order.estimatedReadyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {order.preparationMinutes ? ` (${order.preparationMinutes} min)` : ''}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        ),
        [theme, router],
    );

    const TABS: StatusTab[] = ['ALL', 'PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    const TAB_LABELS: Record<StatusTab, string> = {
        ALL: 'All',
        PENDING: 'Pending',
        PREPARING: 'Preparing',
        READY: 'Ready',
        OUT_FOR_DELIVERY: 'Delivering',
        DELIVERED: 'Delivered',
        CANCELLED: 'Cancelled',
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <View className="px-5 pt-3 pb-4">
                <Text className="text-3xl font-bold" style={{ color: theme.colors.text }}>
                    Orders
                </Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="pb-4 max-h-14"
                contentContainerStyle={{ paddingHorizontal: 20, alignItems: 'center' }}>
                {TABS.map((tab) => (
                    <AdminFilterChip
                        key={tab}
                        label={TAB_LABELS[tab]}
                        count={statusCounts[tab] ?? 0}
                        active={activeTab === tab}
                        color={tab === 'ALL' ? theme.colors.primary : ADMIN_ORDER_STATUS_COLORS[tab]}
                        onPress={() => setActiveTab(tab)}
                    />
                ))}
            </ScrollView>

            <FlatList
                data={filteredOrders}
                keyExtractor={(item: any) => item.id}
                renderItem={renderOrderItem}
                contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={refetch}
                        tintColor={theme.colors.primary}
                    />
                }
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <Ionicons name="receipt-outline" size={40} color={theme.colors.subtext} />
                        <Text className="text-sm mt-3" style={{ color: theme.colors.subtext }}>
                            No orders
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
