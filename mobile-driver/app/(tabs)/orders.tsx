import { useState, useMemo, useEffect } from 'react';
import {
    View, Text, ScrollView, Pressable, ActivityIndicator,
    RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useQuery } from '@apollo/client/react';
import { useAuthStore } from '@/store/authStore';
import { GET_ORDERS } from '@/graphql/operations/orders';
import { format, startOfDay, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import type { GetOrdersQuery } from '@/gql/graphql';

type DeliveredOrder = GetOrdersQuery['orders']['orders'][number];
type Period = 'today' | 'week' | 'month' | 'last_month' | 'all';

function getPeriodDates(period: Period): { startDate?: string; endDate?: string } {
    const now = new Date();
    const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);
    switch (period) {
        case 'today': return { startDate: startOfDay(now).toISOString(), endDate: endOfToday.toISOString() };
        case 'week': return { startDate: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), endDate: endOfToday.toISOString() };
        case 'month': return { startDate: startOfMonth(now).toISOString(), endDate: endOfToday.toISOString() };
        case 'last_month': {
            const prev = subMonths(now, 1);
            const start = startOfMonth(prev);
            const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString() };
        }
        default: return {};
    }
}

function formatCurrency(amount: number) { return `€${amount.toFixed(2)}`; }
function formatDateTime(dateStr?: string | null) {
    if (!dateStr) return '—';
    try { return format(new Date(dateStr), 'MMM d, HH:mm'); } catch { return '—'; }
}

export default function OrdersScreen() {
    const theme = useTheme();
    const { t } = useTranslations();
    const user = useAuthStore((state) => state.user);
    const PAGE_SIZE = 20;
    const [period, setPeriod] = useState<Period>('month');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<DeliveredOrder | null>(null);

    // Reset visible count when period changes
    useEffect(() => { setVisibleCount(PAGE_SIZE); }, [period]);

    const PERIODS: { key: Period; label: string }[] = [
        { key: 'today', label: t.earnings.period_today ?? 'Today' },
        { key: 'week', label: t.earnings.period_week ?? 'This Week' },
        { key: 'month', label: t.earnings.period_month ?? 'This Month' },
        { key: 'last_month', label: t.earnings.period_last_month ?? 'Last Month' },
        { key: 'all', label: t.earnings.period_all ?? 'All Time' },
    ];

    const { startDate, endDate } = getPeriodDates(period);

    const { data: ordersData, loading: ordersLoading, refetch } = useQuery(GET_ORDERS, {
        fetchPolicy: 'cache-and-network',
    });

    const deliveredOrders = useMemo(() => {
        const rows = ordersData?.orders?.orders ?? [];
        return rows
            .filter((o) => o.status === 'DELIVERED')
            .filter((o) => !user?.id || o.driver?.id === user.id)
            .filter((o) =>
                (!startDate || new Date(o.orderDate) >= new Date(startDate)) &&
                (!endDate || new Date(o.orderDate) <= new Date(endDate))
            )
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }, [ordersData, user?.id, startDate, endDate]);

    const onRefresh = async () => {
        setRefreshing(true);
        setVisibleCount(PAGE_SIZE);
        await refetch();
        setRefreshing(false);
    };

    const visibleOrders = deliveredOrders.slice(0, visibleCount);
    const hasMore = visibleCount < deliveredOrders.length;

    const selectedOrderItems = useMemo(() => {
        if (!selectedOrder) return [];
        return (selectedOrder.businesses ?? [])
            .filter((b) => b.business?.id === user?.businessId || true)
            .flatMap((b) => b.items ?? []);
    }, [selectedOrder, user?.businessId]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            {/* Header */}
            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.text }}>
                        {t.earnings.delivered_orders ?? 'Order History'}
                    </Text>
                    <Text style={{ fontSize: 13, color: theme.colors.subtext, marginTop: 2 }}>
                        {deliveredOrders.length} {deliveredOrders.length === 1 ? (t.earnings.delivery ?? 'delivery') : (t.earnings.deliveries ?? 'deliveries')}
                    </Text>
                </View>
            </View>

            {/* Period selector */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}
            >
                {PERIODS.map((p) => {
                    const active = period === p.key;
                    return (
                        <Pressable
                            key={p.key}
                            onPress={() => setPeriod(p.key)}
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 7,
                                borderRadius: 999,
                                backgroundColor: active ? theme.colors.primary : theme.colors.card,
                                borderWidth: 1,
                                borderColor: active ? theme.colors.primary : theme.colors.border,
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : theme.colors.subtext }}>
                                {p.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                {ordersLoading && deliveredOrders.length === 0 ? (
                    <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
                ) : deliveredOrders.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                        <Text style={{ fontSize: 36, marginBottom: 12 }}>📦</Text>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>
                            {t.earnings.no_earnings_title ?? 'No deliveries yet'}
                        </Text>
                        <Text style={{ fontSize: 13, color: theme.colors.subtext, marginTop: 4 }}>
                            {t.earnings.no_earnings_sub ?? 'Delivered orders will appear here'}
                        </Text>
                    </View>
                ) : (
                    visibleOrders.map((order) => {
                        const businessNames = (order.businesses ?? []).map((b) => b.business?.name).filter(Boolean).join(', ') || '—';
                        const takeHome = Number(order.driverTakeHomePreview ?? 0);
                        const tip = Number(order.driverTip ?? 0);
                        return (
                            <Pressable
                                key={order.id}
                                onPress={() => setSelectedOrder(order)}
                                style={{
                                    borderRadius: 16,
                                    padding: 14,
                                    backgroundColor: theme.colors.card,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                }}
                            >
                                {/* Top row */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                                        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: theme.colors.primary }} />
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                            #{order.displayId ?? order.id.slice(-6)}
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: 17, fontWeight: '800', color: takeHome >= 0 ? theme.colors.income : '#f59e0b' }}>
                                        {takeHome >= 0 ? '+' : ''}{formatCurrency(takeHome)}
                                    </Text>
                                </View>

                                {/* Chips */}
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                                    <View style={{ backgroundColor: theme.colors.income + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                                        <Text style={{ fontSize: 9, color: theme.colors.subtext, textTransform: 'uppercase', letterSpacing: 0.4 }}>Take-home</Text>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.income }}>{formatCurrency(takeHome)}</Text>
                                    </View>
                                    {tip > 0 && (
                                        <View style={{ backgroundColor: '#22c55e18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                                            <Text style={{ fontSize: 9, color: theme.colors.subtext, textTransform: 'uppercase', letterSpacing: 0.4 }}>Tip</Text>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#22c55e' }}>+{formatCurrency(tip)}</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Meta */}
                                <View style={{ gap: 4 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="storefront-outline" size={12} color={theme.colors.subtext} />
                                        <Text style={{ fontSize: 12, color: theme.colors.subtext, flex: 1 }} numberOfLines={1}>{businessNames}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="location-outline" size={12} color={theme.colors.subtext} />
                                        <Text style={{ fontSize: 12, color: theme.colors.subtext, flex: 1 }} numberOfLines={1}>
                                            {order.dropOffLocation?.address ?? '—'}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 11, color: theme.colors.subtext }}>{formatDateTime(order.orderDate)}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22c55e18', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                                            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#22c55e' }} />
                                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#22c55e' }}>Delivered</Text>
                                        </View>
                                    </View>
                                </View>
                            </Pressable>
                        );
                    })
                )}

                {hasMore && (
                    <Pressable
                        onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}
                        style={{
                            marginTop: 4,
                            marginBottom: 8,
                            borderRadius: 14,
                            paddingVertical: 14,
                            alignItems: 'center',
                            backgroundColor: theme.colors.card,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                        }}
                    >
                        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.primary }}>
                            Show more · {deliveredOrders.length - visibleCount} remaining
                        </Text>
                    </Pressable>
                )}
            </ScrollView>

            {/* Order Detail Modal */}
            <Modal
                visible={selectedOrder !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedOrder(null)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' }}
                    onPress={() => setSelectedOrder(null)}
                >
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: theme.colors.card,
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            borderTopWidth: 1,
                            borderColor: theme.colors.border,
                            maxHeight: '90%',
                        }}
                    >
                        {(() => {
                            const o = selectedOrder;
                            if (!o) return null;
                            const takeHome = Number(o.driverTakeHomePreview ?? 0);
                            const tip = Number(o.driverTip ?? 0);
                            const businessNames = (o.businesses ?? []).map((b) => b.business?.name).filter(Boolean).join(', ') || '—';
                            const allItems = (o.businesses ?? []).flatMap((b) => b.items ?? []);
                            return (
                                <ScrollView
                                    bounces={false}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                        <View>
                                            <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.text }}>
                                                Order #{o.displayId ?? o.id.slice(-6)}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: theme.colors.subtext, marginTop: 3 }}>
                                                {formatDateTime(o.orderDate)}
                                            </Text>
                                        </View>
                                        <Pressable onPress={() => setSelectedOrder(null)}>
                                            <Ionicons name="close-circle" size={28} color={theme.colors.subtext} />
                                        </Pressable>
                                    </View>

                                    {/* Summary chips */}
                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                                        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.colors.income + '18', borderWidth: 1, borderColor: theme.colors.income + '30' }}>
                                            <Text style={{ fontSize: 9, color: theme.colors.subtext, textTransform: 'uppercase', letterSpacing: 0.6 }}>Take-home</Text>
                                            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.income }}>{formatCurrency(takeHome)}</Text>
                                        </View>
                                        {tip > 0 && (
                                            <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#22c55e18', borderWidth: 1, borderColor: '#22c55e30' }}>
                                                <Text style={{ fontSize: 9, color: theme.colors.subtext, textTransform: 'uppercase', letterSpacing: 0.6 }}>Tip</Text>
                                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#22c55e' }}>+{formatCurrency(tip)}</Text>
                                            </View>
                                        )}
                                        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border }}>
                                            <Text style={{ fontSize: 9, color: theme.colors.subtext, textTransform: 'uppercase', letterSpacing: 0.6 }}>Status</Text>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#22c55e' }}>Delivered</Text>
                                        </View>
                                    </View>

                                    {/* Route */}
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.subtext, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Route</Text>
                                    <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', marginBottom: 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: theme.colors.background }}>
                                            <Ionicons name="storefront-outline" size={14} color={theme.colors.subtext} />
                                            <Text style={{ fontSize: 13, color: theme.colors.text, flex: 1 }} numberOfLines={2}>
                                                {businessNames}
                                            </Text>
                                        </View>
                                        <View style={{ height: 1, backgroundColor: theme.colors.border }} />
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: theme.colors.background }}>
                                            <Ionicons name="location-outline" size={14} color={theme.colors.subtext} />
                                            <Text style={{ fontSize: 13, color: theme.colors.text, flex: 1 }} numberOfLines={2}>
                                                {o.dropOffLocation?.address ?? '—'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Items */}
                                    {allItems.length > 0 && (
                                        <>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.subtext, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Items</Text>
                                            <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', marginBottom: 16 }}>
                                                {allItems.map((item: any, i: number) => (
                                                    <View key={item.id ?? i} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: i % 2 === 0 ? theme.colors.background : theme.colors.card }}>
                                                        <Text style={{ fontSize: 13, color: theme.colors.text, flex: 1 }}>{item.quantity}× {item.name}</Text>
                                                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>
                                                            €{(Number(item.unitPrice) * Number(item.quantity)).toFixed(2)}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </>
                                    )}

                                    {/* Note about settlements */}
                                    <View style={{ borderRadius: 12, padding: 12, backgroundColor: theme.colors.primary + '12', borderWidth: 1, borderColor: theme.colors.primary + '30', marginBottom: 20 }}>
                                        <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: '600', marginBottom: 2 }}>Settlement details</Text>
                                        <Text style={{ fontSize: 12, color: theme.colors.subtext, lineHeight: 17 }}>
                                            To view deductions, commissions and settlement lines for this order, go to the Earnings tab and drill into a category.
                                        </Text>
                                    </View>

                                    <Pressable
                                        onPress={() => setSelectedOrder(null)}
                                        style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}
                                    >
                                        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.subtext }}>Close</Text>
                                    </Pressable>
                                </ScrollView>
                            );
                        })()}
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}
