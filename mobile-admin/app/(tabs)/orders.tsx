import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useSubscription } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { StatusBadge, FilterChip } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { GET_ORDERS, ALL_ORDERS_SUBSCRIPTION } from '@/graphql/orders';
import { ORDER_STATUS_COLORS } from '@/utils/constants';
import { formatRelativeTime, formatCurrency } from '@/utils/helpers';

type StatusTab = 'ALL' | 'PENDING' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export default function OrdersScreen() {
    const theme = useTheme();
    const { t } = useTranslations();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
    const { data, loading, refetch }: any = useQuery(GET_ORDERS, { pollInterval: 30000 });

    useSubscription(ALL_ORDERS_SUBSCRIPTION, {
        onData: () => refetch(),
    });

    const orders = data?.orders || [];

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
                    <StatusBadge status={order.status} label={t.orders.status[order.status as keyof typeof t.orders.status]} />
                    <Text className="text-xs font-medium" style={{ color: theme.colors.subtext }}>
                        {formatRelativeTime(order.orderDate)}
                    </Text>
                </View>

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
            </TouchableOpacity>
        ),
        [theme, t, router],
    );

    const TABS: StatusTab[] = ['ALL', 'PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

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
        </SafeAreaView>
    );
}
