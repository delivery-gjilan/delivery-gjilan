import { useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { GET_BUSINESS_ORDERS } from '@/graphql/orders';
import { GET_BUSINESS_PRODUCTS } from '@/graphql/products';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';

type ProductSale = {
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
    imageUrl?: string | null;
};

function getStartOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getStartOfWeek(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    return new Date(now.getFullYear(), now.getMonth(), diff);
}

function getStartOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default function DashboardScreen() {
    const { t } = useTranslation();
    const [refreshing, setRefreshing] = useState(false);
    const businessId = useAuthStore((state) => state.user?.businessId);

    const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } = useQuery(GET_BUSINESS_ORDERS, {
        pollInterval: 30000,
    });

    const { data: productsData, loading: productsLoading, refetch: refetchProducts } = useQuery(GET_BUSINESS_PRODUCTS, {
        variables: { businessId: businessId || '' },
        skip: !businessId,
    });

    const businessOrders = useMemo(() => {
        if (!businessId) {
            return [];
        }
        return (ordersData?.orders?.orders || []).filter((order: any) =>
            (order.businesses || []).some((b: any) => b.business?.id === businessId),
        );
    }, [ordersData?.orders?.orders, businessId]);

    const deliveredOrders = useMemo(
        () => businessOrders.filter((order: any) => order.status === 'DELIVERED'),
        [businessOrders],
    );

    const todayStats = useMemo(() => {
        const start = getStartOfToday();
        const todayOrders = businessOrders.filter((order: any) => new Date(order.orderDate) >= start);
        const deliveredToday = todayOrders.filter((order: any) => order.status === 'DELIVERED');

        return {
            todayOrders: todayOrders.length,
            deliveredToday: deliveredToday.length,
            todayRevenue: deliveredToday.reduce((sum: number, order: any) => sum + Number(order.totalPrice || 0), 0),
        };
    }, [businessOrders]);

    const weekRevenue = useMemo(() => {
        const start = getStartOfWeek();
        return deliveredOrders
            .filter((order: any) => new Date(order.orderDate) >= start)
            .reduce((sum: number, order: any) => sum + Number(order.totalPrice || 0), 0);
    }, [deliveredOrders]);

    const activeOrders = useMemo(
        () =>
            businessOrders.filter((order: any) =>
                ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(order.status),
            ).length,
        [businessOrders],
    );

    const topProducts = useMemo<ProductSale[]>(() => {
        if (!businessId) {
            return [];
        }

        const aggregate = new Map<string, ProductSale>();

        deliveredOrders.forEach((order: any) => {
            (order.businesses || [])
                .filter((b: any) => b.business?.id === businessId)
                .forEach((businessChunk: any) => {
                    (businessChunk.items || []).forEach((item: any) => {
                        const key = item.productId || item.name;
                        const existing = aggregate.get(key) || {
                            productId: key,
                            name: item.name || t('dashboard.unknown_product', 'Unknown product'),
                            quantity: 0,
                            revenue: 0,
                            imageUrl: item.imageUrl ?? null,
                        };
                        const quantity = Number(item.quantity || 0);
                        const unitPrice = Number(item.unitPrice || 0);

                        existing.quantity += quantity;
                        existing.revenue += quantity * unitPrice;
                        if (!existing.imageUrl && item.imageUrl) {
                            existing.imageUrl = item.imageUrl;
                        }
                        aggregate.set(key, existing);
                    });
                });
        });

        return Array.from(aggregate.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
    }, [deliveredOrders, businessId, t]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([refetchOrders(), refetchProducts()]);
        } finally {
            setRefreshing(false);
        }
    };

    const loading = ordersLoading || productsLoading;

    const StatBox = ({
        label,
        value,
        icon,
    }: {
        label: string;
        value: string | number;
        icon: keyof typeof Ionicons.glyphMap;
    }) => (
        <View className="w-[48%] bg-card rounded-2xl p-3.5 mb-3">
            <View className="w-8 h-8 rounded-full bg-primary/15 items-center justify-center mb-2.5">
                <Ionicons name={icon} size={15} color="#7C3AED" />
            </View>
            <Text className="text-subtext text-xs mb-1">{label}</Text>
            <Text className="text-text text-xl font-bold">{value}</Text>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView
                contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7C3AED" />
                }
            >
                {loading ? (
                    <View className="py-20 items-center justify-center">
                        <ActivityIndicator size="large" color="#7C3AED" />
                    </View>
                ) : (
                    <>
                        <View className="mb-4">
                            <View className="flex-row flex-wrap justify-between">
                                <StatBox icon="receipt-outline" label={t('dashboard.today_orders', 'Today Orders')} value={todayStats.todayOrders} />
                                <StatBox icon="pulse-outline" label={t('dashboard.active_orders', 'Active Orders')} value={activeOrders} />
                                <StatBox icon="cash-outline" label={t('dashboard.today_revenue', 'Today Revenue')} value={`€${todayStats.todayRevenue.toFixed(2)}`} />
                                <StatBox icon="calendar-outline" label={t('dashboard.week_revenue', 'Week Revenue')} value={`€${weekRevenue.toFixed(2)}`} />
                            </View>
                        </View>

                        <View className="mb-4">
                            <Text className="text-text font-bold text-lg mb-3">{t('dashboard.top_products', 'Top Products')}</Text>
                            <View className="overflow-hidden bg-card rounded-2xl p-2">
                                {topProducts.length === 0 ? (
                                    <View className="py-4">
                                        <Text className="text-subtext">{t('dashboard.no_sales_yet', 'No delivered sales yet.')}</Text>
                                    </View>
                                ) : (
                                    topProducts.map((product, index) => (
                                        <View key={product.productId} className="my-1 py-2.5 px-2.5 bg-background rounded-xl flex-row items-center">
                                            <View className="w-10 h-10 rounded-xl overflow-hidden bg-primary/10 items-center justify-center mr-3">
                                                {product.imageUrl ? (
                                                    <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                                ) : (
                                                    <Ionicons name="image-outline" size={18} color="#94A3B8" />
                                                )}
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-text font-semibold" numberOfLines={1}>
                                                    {index + 1}. {product.name}
                                                </Text>
                                                <Text className="text-subtext text-xs">
                                                    {product.quantity} {t('dashboard.sold_units', 'sold')}
                                                </Text>
                                            </View>
                                            <Text className="text-success font-semibold">€{product.revenue.toFixed(2)}</Text>
                                        </View>
                                    ))
                                )}
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
