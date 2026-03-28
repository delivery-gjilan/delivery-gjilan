import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { GET_ORDERS } from '@/graphql/orders';
import { GET_DRIVERS } from '@/graphql/drivers';
import { formatCurrency, formatRelativeTime } from '@/utils/helpers';

export default function DashboardScreen() {
    const theme = useTheme();
    const { t } = useTranslations();
    const router = useRouter();

    const { data: ordersData, loading: ordersLoading, refetch: refetchOrders }: any = useQuery(GET_ORDERS);
    const { data: driversData, loading: driversLoading, refetch: refetchDrivers }: any = useQuery(GET_DRIVERS);

    const orders = ordersData?.orders || [];
    const drivers = driversData?.drivers || [];

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayOrders = orders.filter((o: any) => new Date(o.orderDate) >= today);
        const activeOrders = orders.filter((o: any) =>
            ['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status),
        );
        const todayDelivered = todayOrders.filter((o: any) => o.status === 'DELIVERED');
        const todayRevenue = todayDelivered.reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0);
        const onlineDrivers = drivers.filter(
            (d: any) => d.driverConnection?.connectionStatus === 'CONNECTED',
        );

        return {
            todayOrders: todayOrders.length,
            activeOrders: activeOrders.length,
            revenue: todayRevenue,
            onlineDrivers: onlineDrivers.length,
            totalDrivers: drivers.length,
            pendingCount: activeOrders.filter((o: any) => o.status === 'PENDING').length,
            preparingCount: activeOrders.filter((o: any) => o.status === 'PREPARING').length,
            readyCount: activeOrders.filter((o: any) => o.status === 'READY').length,
            deliveringCount: activeOrders.filter((o: any) => o.status === 'OUT_FOR_DELIVERY').length,
        };
    }, [orders, drivers]);

    const recentOrders = useMemo(() => {
        return [...orders]
            .sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
            .slice(0, 10);
    }, [orders]);

    const handleRefresh = () => {
        refetchOrders();
        refetchDrivers();
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={
                    <RefreshControl
                        refreshing={ordersLoading || driversLoading}
                        onRefresh={handleRefresh}
                        tintColor={theme.colors.primary}
                    />
                }>
                {/* Header */}
                <View className="px-5 pt-3 pb-4">
                    <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                        {t.dashboard.title}
                    </Text>
                    <Text className="text-sm mt-0.5" style={{ color: theme.colors.subtext }}>
                        {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                </View>

                {/* Stat Cards - Row 1 */}
                <View className="flex-row px-4 gap-3 mb-3">
                    <StatCard
                        title={t.dashboard.todayOrders}
                        value={stats.todayOrders}
                        icon={<Ionicons name="receipt" size={16} color={theme.colors.primary} />}
                        color={theme.colors.primary}
                    />
                    <StatCard
                        title={t.dashboard.activeOrders}
                        value={stats.activeOrders}
                        icon={<Ionicons name="flash" size={16} color="#f59e0b" />}
                        color="#f59e0b"
                    />
                </View>

                {/* Stat Cards - Row 2 */}
                <View className="flex-row px-4 gap-3 mb-3">
                    <StatCard
                        title={t.dashboard.revenue}
                        value={formatCurrency(stats.revenue)}
                        icon={<Ionicons name="cash" size={16} color="#22c55e" />}
                        color="#22c55e"
                    />
                    <StatCard
                        title={t.dashboard.onlineDrivers}
                        value={`${stats.onlineDrivers}/${stats.totalDrivers}`}
                        icon={<Ionicons name="bicycle" size={16} color="#3b82f6" />}
                        color="#3b82f6"
                    />
                </View>

                {/* Active Orders Breakdown */}
                <View className="mx-4 rounded-2xl p-4 mb-4" style={{ backgroundColor: theme.colors.card }}>
                    <Text className="text-sm font-semibold mb-3" style={{ color: theme.colors.text }}>
                        Active Orders Breakdown
                    </Text>
                    <View className="flex-row justify-between">
                        {[
                            { label: 'Pending', count: stats.pendingCount, color: '#f59e0b' },
                            { label: 'Preparing', count: stats.preparingCount, color: '#6366f1' },
                            { label: 'Ready', count: stats.readyCount, color: '#22c55e' },
                            { label: 'Delivering', count: stats.deliveringCount, color: '#3b82f6' },
                        ].map((item) => (
                            <View key={item.label} className="items-center flex-1">
                                <View
                                    className="w-10 h-10 rounded-xl items-center justify-center mb-1"
                                    style={{ backgroundColor: `${item.color}15` }}>
                                    <Text className="text-lg font-bold" style={{ color: item.color }}>
                                        {item.count}
                                    </Text>
                                </View>
                                <Text className="text-[10px] font-medium" style={{ color: theme.colors.subtext }}>
                                    {item.label}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Recent Orders */}
                <View className="px-4">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                            {t.dashboard.recentOrders}
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
                            <Text className="text-sm font-medium" style={{ color: theme.colors.primary }}>
                                View All
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {recentOrders.map((order: any) => (
                        <TouchableOpacity
                            key={order.id}
                            className="flex-row items-center p-3.5 rounded-xl mb-2"
                            style={{ backgroundColor: theme.colors.card }}
                            onPress={() => router.push(`/order/${order.id}`)}
                            activeOpacity={0.7}>
                            <View className="flex-1">
                                <View className="flex-row items-center mb-1">
                                    <StatusBadge status={order.status} />
                                    <Text className="text-xs ml-2" style={{ color: theme.colors.subtext }}>
                                        {formatRelativeTime(order.orderDate)}
                                    </Text>
                                </View>
                                <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
                                    {order.businesses?.[0]?.business?.name || 'Order'}
                                </Text>
                                <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                                    {order.user?.firstName} {order.user?.lastName}
                                </Text>
                            </View>
                            <Text className="text-base font-bold" style={{ color: theme.colors.text }}>
                                {formatCurrency(order.totalPrice)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
