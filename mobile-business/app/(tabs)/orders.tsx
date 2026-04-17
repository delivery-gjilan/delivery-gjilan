import { useState, useMemo, useEffect } from 'react';
import {
    View, Text, ScrollView, Pressable, ActivityIndicator,
    RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client/react';
import { format, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { GET_BUSINESS_ORDERS } from '@/graphql/orders';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import type { GetBusinessOrdersQuery } from '@/gql/graphql';

type BusinessOrder = GetBusinessOrdersQuery['orders']['orders'][number];
type Period = 'today' | 'week' | 'month' | 'all';

function getPeriodDates(period: Period): { startDate?: string; endDate?: string } {
    const now = new Date();
    const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);
    switch (period) {
        case 'today': return { startDate: startOfDay(now).toISOString(), endDate: endOfToday.toISOString() };
        case 'week': return { startDate: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), endDate: endOfToday.toISOString() };
        case 'month': return { startDate: startOfMonth(now).toISOString(), endDate: endOfToday.toISOString() };
        default: return {};
    }
}

function formatCurrency(amount: number) { return `€${amount.toFixed(2)}`; }
function formatDateTime(dateStr?: string | null) {
    if (!dateStr) return '—';
    try { return format(new Date(dateStr), 'MMM d, HH:mm'); } catch { return '—'; }
}

export default function OrdersScreen() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const businessId = user?.businessId ?? '';
    const PAGE_SIZE = 20;
    const [period, setPeriod] = useState<Period>('month');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<BusinessOrder | null>(null);

    // Reset visible count when period changes
    useEffect(() => { setVisibleCount(PAGE_SIZE); }, [period]);

    const PERIODS: { key: Period; label: string }[] = [
        { key: 'today', label: t('finances.today', 'Today') },
        { key: 'week', label: t('finances.this_week', 'This Week') },
        { key: 'month', label: t('finances.this_month', 'This Month') },
        { key: 'all', label: t('finances.all_time', 'All Time') },
    ];

    const { startDate, endDate } = getPeriodDates(period);

    const { data: ordersData, loading: ordersLoading, refetch } = useQuery(GET_BUSINESS_ORDERS, {
        fetchPolicy: 'cache-and-network',
        pollInterval: 60000,
        skip: !businessId,
    });

    const deliveredOrders = useMemo(() => {
        const allOrders = ordersData?.orders?.orders ?? [];
        return allOrders
            .filter((o) => o.status === 'DELIVERED')
            .filter((o) => (o.businesses ?? []).some((b) => b.business?.id === businessId))
            .filter((o) =>
                (!startDate || new Date(o.orderDate) >= new Date(startDate)) &&
                (!endDate || new Date(o.orderDate) <= new Date(endDate))
            )
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }, [ordersData, businessId, startDate, endDate]);

    const onRefresh = async () => {
        setRefreshing(true);
        setVisibleCount(PAGE_SIZE);
        await refetch();
        setRefreshing(false);
    };

    const visibleOrders = deliveredOrders.slice(0, visibleCount);
    const hasMore = visibleCount < deliveredOrders.length;

    const totalRevenue = useMemo(() => {
        return deliveredOrders.reduce((sum, o) => {
            const chunk = (o.businesses ?? []).find((b) => b.business?.id === businessId);
            return sum + (chunk?.items ?? []).reduce((s, i) => s + Number(i.unitPrice ?? 0) * Number(i.quantity ?? 0), 0);
        }, 0);
    }, [deliveredOrders, businessId]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0f1a' }}>
            {/* Header */}
            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>
                    {t('finances.order_history', 'Order History')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                    <Text style={{ fontSize: 13, color: '#6b7280' }}>
                        {deliveredOrders.length} {deliveredOrders.length === 1 ? t('finances.order', 'order') : t('finances.orders', 'orders')}
                    </Text>
                    {totalRevenue > 0 && (
                        <Text style={{ fontSize: 13, color: '#7C3AED', fontWeight: '600' }}>
                            {formatCurrency(totalRevenue)} revenue
                        </Text>
                    )}
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
                                backgroundColor: active ? '#7C3AED' : '#1a2233',
                                borderWidth: 1,
                                borderColor: active ? '#7C3AED' : '#263145',
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : '#8899aa' }}>
                                {p.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
            >
                {ordersLoading && deliveredOrders.length === 0 ? (
                    <ActivityIndicator color="#7C3AED" style={{ marginTop: 40 }} />
                ) : deliveredOrders.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 60, borderRadius: 20, backgroundColor: '#1a2233', borderWidth: 1, borderColor: '#263145', marginTop: 8 }}>
                        <Text style={{ fontSize: 36, marginBottom: 12 }}>📦</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                            {t('finances.no_orders', 'No delivered orders')}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                            {t('finances.no_orders_hint', 'Try a different period')}
                        </Text>
                    </View>
                ) : (
                    visibleOrders.map((order) => {
                        const chunk = (order.businesses ?? []).find((b) => b.business?.id === businessId);
                        const items = chunk?.items ?? [];
                        const revenue = items.reduce((s, i) => s + Number(i.unitPrice ?? 0) * Number(i.quantity ?? 0), 0);
                        const customerName = order.recipientName
                            ?? (order.user ? `${order.user.firstName} ${order.user.lastName}` : null);
                        return (
                            <Pressable
                                key={order.id}
                                onPress={() => setSelectedOrder(order)}
                                style={{
                                    borderRadius: 16,
                                    padding: 14,
                                    backgroundColor: '#1a2233',
                                    borderWidth: 1,
                                    borderColor: '#263145',
                                }}
                            >
                                {/* Top row */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <View style={{ backgroundColor: '#7C3AED18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#7C3AED' }} />
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                            #{order.displayId ?? order.id.slice(-6)}
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: 17, fontWeight: '800', color: '#22c55e' }}>
                                        {formatCurrency(revenue)}
                                    </Text>
                                </View>

                                {/* Chips */}
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                                    <View style={{ backgroundColor: '#22c55e18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                                        <Text style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4 }}>Revenue</Text>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#22c55e' }}>{formatCurrency(revenue)}</Text>
                                    </View>
                                    <View style={{ backgroundColor: '#7C3AED12', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                                        <Text style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4 }}>Items</Text>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#e2e8f0' }}>{items.length}</Text>
                                    </View>
                                </View>

                                {/* Meta */}
                                <View style={{ gap: 4 }}>
                                    {customerName && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Ionicons name="person-outline" size={12} color="#94a3b8" />
                                            <Text style={{ fontSize: 12, color: '#94a3b8', flex: 1 }} numberOfLines={1}>{customerName}</Text>
                                        </View>
                                    )}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="location-outline" size={12} color="#94a3b8" />
                                        <Text style={{ fontSize: 12, color: '#94a3b8', flex: 1 }} numberOfLines={1}>
                                            {order.dropOffLocation?.address ?? '—'}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 11, color: '#6b7280' }}>{formatDateTime(order.orderDate)}</Text>
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
                            backgroundColor: '#1a2233',
                            borderWidth: 1,
                            borderColor: '#263145',
                        }}
                    >
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#7C3AED' }}>
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
                            backgroundColor: '#111827',
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            borderTopWidth: 1,
                            borderColor: '#263145',
                            maxHeight: '90%',
                        }}
                    >
                        {(() => {
                            const o = selectedOrder;
                            if (!o) return null;
                            const chunk = (o.businesses ?? []).find((b) => b.business?.id === businessId);
                            const items = chunk?.items ?? [];
                            const revenue = items.reduce((s, i) => s + Number(i.unitPrice ?? 0) * Number(i.quantity ?? 0), 0);
                            const customerName = o.recipientName
                                ?? (o.user ? `${o.user.firstName} ${o.user.lastName}` : null);

                            return (
                                <ScrollView
                                    bounces={false}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                        <View>
                                            <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>
                                                Order #{o.displayId ?? o.id.slice(-6)}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                                                {formatDateTime(o.orderDate)}
                                            </Text>
                                        </View>
                                        <Pressable onPress={() => setSelectedOrder(null)}>
                                            <Ionicons name="close-circle" size={28} color="#6b7280" />
                                        </Pressable>
                                    </View>

                                    {/* Summary chips */}
                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                                        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#22c55e18', borderWidth: 1, borderColor: '#22c55e30' }}>
                                            <Text style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6 }}>Revenue</Text>
                                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#22c55e' }}>{formatCurrency(revenue)}</Text>
                                        </View>
                                        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#1a2233', borderWidth: 1, borderColor: '#263145' }}>
                                            <Text style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6 }}>Items</Text>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#e2e8f0' }}>{items.length}</Text>
                                        </View>
                                        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#1a2233', borderWidth: 1, borderColor: '#263145' }}>
                                            <Text style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6 }}>Status</Text>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#22c55e' }}>Delivered</Text>
                                        </View>
                                    </View>

                                    {/* Customer / driver */}
                                    {(customerName || o.driver) && (
                                        <>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>People</Text>
                                            <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#263145', overflow: 'hidden', marginBottom: 16 }}>
                                                {customerName && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#0d1421' }}>
                                                        <Ionicons name="person-outline" size={14} color="#94a3b8" />
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ fontSize: 11, color: '#6b7280' }}>Customer</Text>
                                                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#e2e8f0' }}>{customerName}</Text>
                                                            {o.user?.phoneNumber && <Text style={{ fontSize: 12, color: '#6b7280' }}>{o.user.phoneNumber}</Text>}
                                                        </View>
                                                    </View>
                                                )}
                                                {o.driver && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#0a0f1a' }}>
                                                        <Ionicons name="bicycle-outline" size={14} color="#94a3b8" />
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ fontSize: 11, color: '#6b7280' }}>Driver</Text>
                                                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#e2e8f0' }}>{o.driver.firstName} {o.driver.lastName}</Text>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        </>
                                    )}

                                    {/* Items */}
                                    {items.length > 0 && (
                                        <>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Items</Text>
                                            <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#263145', overflow: 'hidden', marginBottom: 16 }}>
                                                {items.map((item, i) => (
                                                    <View key={item.id ?? i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: i % 2 === 0 ? '#0d1421' : '#0a0f1a' }}>
                                                        <Text style={{ fontSize: 13, color: '#e2e8f0', flex: 1 }}>{item.quantity}× {item.name}</Text>
                                                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
                                                            €{(Number(item.unitPrice) * Number(item.quantity)).toFixed(2)}
                                                        </Text>
                                                    </View>
                                                ))}
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#0d1421', borderTopWidth: 1, borderTopColor: '#263145' }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Subtotal</Text>
                                                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#22c55e' }}>{formatCurrency(revenue)}</Text>
                                                </View>
                                            </View>
                                        </>
                                    )}

                                    {/* Destination */}
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Destination</Text>
                                    <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#263145', padding: 12, marginBottom: 16, backgroundColor: '#0d1421' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Ionicons name="location-outline" size={14} color="#94a3b8" />
                                            <Text style={{ fontSize: 13, color: '#e2e8f0', flex: 1 }}>{o.dropOffLocation?.address ?? '—'}</Text>
                                        </View>
                                    </View>

                                    {/* Settlement note */}
                                    <View style={{ borderRadius: 12, padding: 12, backgroundColor: '#7C3AED12', borderWidth: 1, borderColor: '#7C3AED30', marginBottom: 20 }}>
                                        <Text style={{ fontSize: 12, color: '#7C3AED', fontWeight: '600', marginBottom: 2 }}>Settlement details</Text>
                                        <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 17 }}>
                                            To view commissions, deductions and settlement lines for this order, go to the Finances tab and drill into a category group.
                                        </Text>
                                    </View>

                                    <Pressable
                                        onPress={() => setSelectedOrder(null)}
                                        style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: '#1a2233', borderWidth: 1, borderColor: '#263145' }}
                                    >
                                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#9ca3af' }}>{t('common.close', 'Close')}</Text>
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
