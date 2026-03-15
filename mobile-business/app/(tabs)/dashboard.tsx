import { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { GET_BUSINESS_ORDERS } from '@/graphql/orders';
import { GET_BUSINESS_PRODUCTS } from '@/graphql/products';
import { useAuthStore } from '@/store/authStore';
import { LinearGradient } from 'expo-linear-gradient';

interface DashboardStats {
    todayOrders: number;
    todayRevenue: number;
    pendingOrders: number;
    preparingOrders: number;
    completedToday: number;
    totalProducts: number;
    unavailableProducts: number;
}

export default function DashboardScreen() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<DashboardStats>({
        todayOrders: 0,
        todayRevenue: 0,
        pendingOrders: 0,
        preparingOrders: 0,
        completedToday: 0,
        totalProducts: 0,
        unavailableProducts: 0,
    });

    const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } = useQuery(GET_BUSINESS_ORDERS, {
        pollInterval: 15000,
    });

    const { data: productsData, loading: productsLoading, refetch: refetchProducts } = useQuery(
        GET_BUSINESS_PRODUCTS,
        {
            variables: { businessId: user?.businessId || '' },
            skip: !user?.businessId,
        }
    );

    useEffect(() => {
        if (ordersData && productsData) {
            calculateStats();
        }
    }, [ordersData, productsData]);

    const calculateStats = () => {
        const orders = (ordersData?.orders || []).filter((order: any) =>
            order.businesses.some((b: any) => b.business.id === user?.businessId)
        );

        const products = productsData?.products || [];

        // Today's date (start of day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayOrders = orders.filter((order: any) => new Date(order.orderDate) >= today);

        const newStats: DashboardStats = {
            todayOrders: todayOrders.length,
            todayRevenue: todayOrders.reduce((sum: number, order: any) => sum + order.totalPrice, 0),
            pendingOrders: orders.filter((order: any) => order.status === 'PENDING').length,
            preparingOrders: orders.filter((order: any) => order.status === 'PREPARING').length,
            completedToday: todayOrders.filter((order: any) => order.status === 'DELIVERED').length,
            totalProducts: products.length,
            unavailableProducts: products.filter((p: any) => !p.isAvailable).length,
        };

        setStats(newStats);
    };

    const handleRefresh = () => {
        refetchOrders();
        refetchProducts();
    };

    const StatCard = ({
        icon,
        label,
        value,
        subtitle,
        color,
        gradientColors,
    }: {
        icon: keyof typeof Ionicons.glyphMap;
        label: string;
        value: string | number;
        subtitle?: string;
        color: string;
        gradientColors: string[];
    }) => (
        <View className="flex-1 min-w-[160px] m-2">
            <LinearGradient
                colors={gradientColors as [string, string, ...string[]]}
                className="rounded-2xl p-4"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View
                    className="w-12 h-12 rounded-full items-center justify-center mb-3"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                    <Ionicons name={icon} size={24} color="white" />
                </View>
                <Text className="text-white/80 text-sm mb-1">{label}</Text>
                <Text className="text-white text-2xl font-bold">{value}</Text>
                {subtitle && <Text className="text-white/70 text-xs mt-1">{subtitle}</Text>}
            </LinearGradient>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="px-4 py-3 border-b border-gray-800">
                <Text className="text-text text-2xl font-bold mb-1">Dashboard</Text>
                <Text className="text-subtext">{user?.business?.name}</Text>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 8 }}
                refreshControl={
                    <RefreshControl refreshing={ordersLoading || productsLoading} onRefresh={handleRefresh} tintColor="#0b89a9" />
                }
            >
                {/* Today's Overview */}
                <View className="px-2 mb-4">
                    <Text className="text-text font-bold text-lg mb-2">Today's Overview</Text>
                    <View className="flex-row flex-wrap">
                        <StatCard
                            icon="receipt"
                            label="Total Orders"
                            value={stats.todayOrders}
                            color="#0b89a9"
                            gradientColors={['#0b89a9', '#0ea5e9']}
                        />
                        <StatCard
                            icon="cash"
                            label="Revenue"
                            value={`$${stats.todayRevenue.toFixed(2)}`}
                            color="#10b981"
                            gradientColors={['#10b981', '#34d399']}
                        />
                        <StatCard
                            icon="checkmark-circle"
                            label="Completed"
                            value={stats.completedToday}
                            subtitle={stats.todayOrders > 0 ? `${Math.round((stats.completedToday / stats.todayOrders) * 100)}% completion` : undefined}
                            color="#8b5cf6"
                            gradientColors={['#8b5cf6', '#a78bfa']}
                        />
                    </View>
                </View>

                {/* Active Orders */}
                <View className="px-2 mb-4">
                    <Text className="text-text font-bold text-lg mb-2">Active Orders</Text>
                    <View className="flex-row flex-wrap">
                        <StatCard
                            icon="alert-circle"
                            label="Pending"
                            value={stats.pendingOrders}
                            subtitle="Awaiting acceptance"
                            color="#f59e0b"
                            gradientColors={['#f59e0b', '#fbbf24']}
                        />
                        <StatCard
                            icon="flame"
                            label="Preparing"
                            value={stats.preparingOrders}
                            subtitle="In progress"
                            color="#3b82f6"
                            gradientColors={['#3b82f6', '#60a5fa']}
                        />
                    </View>
                </View>

                {/* Products Status */}
                <View className="px-2 mb-4">
                    <Text className="text-text font-bold text-lg mb-2">Products</Text>
                    <View className="flex-row flex-wrap">
                        <StatCard
                            icon="fast-food"
                            label="Total Products"
                            value={stats.totalProducts}
                            color="#06b6d4"
                            gradientColors={['#06b6d4', '#22d3ee']}
                        />
                        <StatCard
                            icon="eye-off"
                            label="Unavailable"
                            value={stats.unavailableProducts}
                            color="#ef4444"
                            gradientColors={['#ef4444', '#f87171']}
                        />
                    </View>
                </View>

                {/* Quick Actions */}
                <View className="px-2 mb-4">
                    <Text className="text-text font-bold text-lg mb-2">Quick Actions</Text>
                    <View className="bg-card rounded-2xl p-4">
                        <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-700">
                            <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
                                <Ionicons name="notifications" size={20} color="#0b89a9" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-text font-semibold">Notifications</Text>
                                <Text className="text-subtext text-xs">Manage notification settings</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                        </TouchableOpacity>

                        <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-700">
                            <View className="w-10 h-10 rounded-full bg-success/20 items-center justify-center mr-3">
                                <Ionicons name="time" size={20} color="#10b981" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-text font-semibold">Business Hours</Text>
                                <Text className="text-subtext text-xs">Update opening hours</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                        </TouchableOpacity>

                        <TouchableOpacity className="flex-row items-center py-3">
                            <View className="w-10 h-10 rounded-full bg-warning/20 items-center justify-center mr-3">
                                <Ionicons name="document-text" size={20} color="#f59e0b" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-text font-semibold">Reports</Text>
                                <Text className="text-subtext text-xs">View detailed analytics</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
