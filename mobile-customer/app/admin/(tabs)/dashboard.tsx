import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { AdminStatCard, AdminStatusBadge } from '@/components/admin/AdminComponents';
import { ADMIN_GET_ORDERS } from '@/graphql/operations/admin/orders';
import { ADMIN_GET_DRIVERS } from '@/graphql/operations/admin/drivers';
import { adminFormatCurrency, adminFormatRelativeTime } from '@/utils/adminHelpers';

export default function AdminDashboard() {
    const theme = useTheme();
    const router = useRouter();

    const { data: ordersData, loading: ordersLoading, refetch: refetchOrders }: any = useQuery(ADMIN_GET_ORDERS);
    const { data: driversData, loading: driversLoading, refetch: refetchDrivers }: any = useQuery(ADMIN_GET_DRIVERS);

    const orders = ordersData?.orders || [];
    const drivers = driversData?.drivers || [];

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = orders.filter((o: any) => new Date(o.orderDate) >= today);
        const activeOrders = orders.filter((o: any) =>
            ['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status),
        );
        const todayRevenue = todayOrders
            .filter((o: any) => o.status === 'DELIVERED')
            .reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0);
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

    const recentOrders = useMemo(
        () =>
            [...orders]
                .sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
                .slice(0, 10),
        [orders],
    );

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={
                    <RefreshControl
                        refreshing={ordersLoading || driversLoading}
                        onRefresh={() => { refetchOrders(); refetchDrivers(); }}
                        tintColor={theme.colors.primary}
                    />
                }>
                {/* Header */}
                <View className="px-5 pt-3 pb-4 flex-row items-center">
                    <View className="flex-1">
                        <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                            Dashboard
                        </Text>
                        <Text className="text-sm mt-0.5" style={{ color: theme.colors.subtext }}>
                            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                        </Text>
                    </View>
                </View>

                {/* Stat Cards Row 1 */}
                <View className="flex-row px-4 gap-3 mb-3">
                    <AdminStatCard
                        title="Today's Orders"
                        value={stats.todayOrders}
                        icon={<Ionicons name="receipt" size={16} color={theme.colors.primary} />}
                        color={theme.colors.primary}
                    />
                    <AdminStatCard
                        title="Active"
                        value={stats.activeOrders}
                        icon={<Ionicons name="flash" size={16} color="#f59e0b" />}
                        color="#f59e0b"
                    />
                </View>

                {/* Stat Cards Row 2 */}
                <View className="flex-row px-4 gap-3 mb-4">
                    <AdminStatCard
                        title="Revenue"
                        value={adminFormatCurrency(stats.revenue)}
                        icon={<Ionicons name="cash" size={16} color="#22c55e" />}
                        color="#22c55e"
                    />
                    <AdminStatCard
                        title="Drivers Online"
                        value={`${stats.onlineDrivers}/${stats.totalDrivers}`}
                        icon={<Ionicons name="bicycle" size={16} color="#3b82f6" />}
                        color="#3b82f6"
                    />
                </View>

                {/* Active Breakdown */}
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
                            Recent Orders
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/admin/(tabs)/orders' as any)}>
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
                            onPress={() => router.push(`/admin/order/${order.id}` as any)}
                            activeOpacity={0.7}>
                            <View className="flex-1">
                                <View className="flex-row items-center mb-1">
                                    <AdminStatusBadge status={order.status} />
                                    <Text className="text-xs ml-2" style={{ color: theme.colors.subtext }}>
                                        {adminFormatRelativeTime(order.orderDate)}
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
                                {adminFormatCurrency(order.totalPrice)}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    {recentOrders.length === 0 && !ordersLoading && (
                        <View className="items-center py-12">
                            <Ionicons name="receipt-outline" size={40} color={theme.colors.subtext} />
                            <Text className="text-sm mt-3" style={{ color: theme.colors.subtext }}>
                                No orders yet
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
