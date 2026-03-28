import { useMemo, useState } from 'react';
import { View, SectionList, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useOrders } from '../hooks/useOrders';
import { Order } from '@/gql/graphql';
import { OrderSummarySheet } from './OrderSummarySheet';

type StatusStyles = {
    color: string;
    background: string;
};

const getStatusStyles = (status: string, fallback: string): StatusStyles => {
    switch (status) {
        case 'PENDING': return { color: '#F59E0B', background: '#F59E0B18' };
        case 'PREPARING': return { color: '#F97316', background: '#F9731618' };
        case 'READY': return { color: '#3B82F6', background: '#3B82F618' };
        case 'OUT_FOR_DELIVERY': return { color: '#22C55E', background: '#22C55E18' };
        case 'DELIVERED': return { color: '#22C55E', background: '#22C55E18' };
        case 'CANCELLED': return { color: '#EF4444', background: '#EF444418' };
        default: return { color: fallback, background: `${fallback}18` };
    }
};

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    PENDING: 'time-outline',
    PREPARING: 'flame-outline',
    READY: 'checkmark-circle-outline',
    OUT_FOR_DELIVERY: 'bicycle-outline',
    DELIVERED: 'checkmark-done-circle-outline',
    CANCELLED: 'close-circle-outline',
};

function getMonthKey(value: string | null | undefined): string {
    if (!value) return 'Unknown';
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'Unknown';
    const now = new Date();
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return 'This Month';
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() - 1) return 'Last Month';
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatOrderDate(value: string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short',
        ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
}

const OrderHistoryItem = ({ order, onPress }: { order: Order; onPress: () => void }) => {
    const theme = useTheme();
    const { t } = useTranslations();
    const status = order.status ?? 'UNKNOWN';
    const statusStyles = getStatusStyles(status, theme.colors.subtext);
    const statusIcon = STATUS_ICONS[status] ?? 'help-circle-outline';

    const totalItems = order.businesses.reduce(
        (sum, business) => sum + business.items.reduce((s, item) => s + item.quantity, 0), 0,
    );
    const firstBusiness = order.businesses[0]?.business;
    const firstItem = order.businesses[0]?.items[0];
    const extraBusinesses = order.businesses.length - 1;

    // Build item names preview
    const itemNames = order.businesses
        .flatMap((b) => b.items.map((i) => i.name))
        .filter(Boolean)
        .slice(0, 2)
        .join(', ');
    const hasMoreItems = totalItems > 2;

    const statusLabel = (() => {
        switch (status) {
            case 'PENDING': return t.orders.status.pending;
            case 'PREPARING': return t.orders.status.preparing;
            case 'READY': return t.orders.status.ready;
            case 'OUT_FOR_DELIVERY': return t.orders.status.out_for_delivery;
            case 'DELIVERED': return t.orders.status.delivered;
            case 'CANCELLED': return t.orders.status.cancelled;
            default: return t.orders.status.in_progress;
        }
    })();

    const isFinished = status === 'DELIVERED' || status === 'CANCELLED';

    return (
        <TouchableOpacity
            activeOpacity={0.75}
            onPress={onPress}
            style={{
                backgroundColor: theme.colors.card,
                borderRadius: 16,
                marginBottom: 12,
                marginHorizontal: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.colors.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: theme.dark ? 0.25 : 0.07,
                shadowRadius: 8,
                elevation: 3,
            }}
        >
            {/* Hero image or placeholder */}
            <View style={{ height: 110, backgroundColor: theme.dark ? '#1A1A22' : '#F3F4F6' }}>
                {firstItem?.imageUrl ? (
                    <Image
                        source={{ uri: firstItem.imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                    />
                ) : firstBusiness?.imageUrl ? (
                    <Image
                        source={{ uri: firstBusiness.imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                    />
                ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="restaurant-outline" size={36} color={theme.colors.subtext} />
                    </View>
                )}
                {/* Status badge over image */}
                <View style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 20,
                }}>
                    <Ionicons name={statusIcon} size={11} color={statusStyles.color} />
                    <Text style={{ color: statusStyles.color, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {statusLabel}
                    </Text>
                </View>
                {/* Item count badge */}
                {totalItems > 1 && (
                    <View style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        backgroundColor: 'rgba(0,0,0,0.55)',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 20,
                    }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                            {totalItems} items
                        </Text>
                    </View>
                )}
            </View>

            {/* Bottom content row */}
            <View style={{ padding: 12 }}>
                {/* Business name + extra businesses */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 }} numberOfLines={1}>
                        {firstBusiness?.name || t.orders.restaurant_fallback}
                        {extraBusinesses > 0 && (
                            <Text style={{ color: theme.colors.subtext, fontWeight: '500', fontSize: 13 }}> +{extraBusinesses} more</Text>
                        )}
                    </Text>
                    <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 }}>
                        €{order.totalPrice.toFixed(2)}
                    </Text>
                </View>

                {/* Item names preview + date */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.subtext, fontSize: 12, flex: 1, marginRight: 8 }} numberOfLines={1}>
                        {itemNames
                            ? `${itemNames}${hasMoreItems ? ` +${totalItems - 2} more` : ''}`
                            : `${totalItems} ${totalItems !== 1 ? t.orders.item_plural : t.orders.item_singular}`}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: theme.colors.subtext, fontSize: 12, fontWeight: '500' }}>
                            {formatOrderDate(order.orderDate)}
                        </Text>
                        {isFinished && (
                            <Ionicons name="chevron-forward" size={13} color={theme.colors.subtext} />
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export const OrderHistoryList = () => {
    const router = useRouter();
    const theme = useTheme();
    const { t } = useTranslations();
    const { orders, loading, loadMore, hasMore } = useOrders();
    const [summaryOrderId, setSummaryOrderId] = useState<string | null>(null);

    const handleOrderPress = (order: Order) => {
        const status = order.status ?? 'UNKNOWN';
        if (status === 'DELIVERED' || status === 'CANCELLED') {
            setSummaryOrderId(order.id);
        } else {
            router.push(`/orders/${order.id}` as `/orders/${string}`);
        }
    };

    const sections = useMemo(() => {
        const sorted = [...orders].sort((a, b) => {
            const aTime = a.orderDate ? new Date(a.orderDate).getTime() : 0;
            const bTime = b.orderDate ? new Date(b.orderDate).getTime() : 0;
            return bTime - aTime;
        });

        const groups: Record<string, Order[]> = {};
        for (const order of sorted) {
            const key = getMonthKey(order.orderDate);
            if (!groups[key]) groups[key] = [];
            groups[key].push(order);
        }

        // Preserve insertion order (sorted newest-first already)
        return Object.entries(groups).map(([title, data]) => ({ title, data }));
    }, [orders]);

    const header = (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingTop: 8, paddingHorizontal: 16 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.text, flex: 1 }}>
                {t.orders.order_history}
            </Text>
            {orders.length > 0 && (
                <View style={{ backgroundColor: theme.colors.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                    <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '700' }}>
                        {orders.length}
                    </Text>
                </View>
            )}
        </View>
    );

    if (loading && orders.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                {header}
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (sections.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                {header}
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                    <View style={{
                        width: 96,
                        height: 96,
                        borderRadius: 48,
                        backgroundColor: theme.colors.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 20,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                    }}>
                        <Ionicons name="receipt-outline" size={44} color={theme.colors.subtext} />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: 8 }}>
                        {t.orders.no_past_orders}
                    </Text>
                    <Text style={{ fontSize: 14, color: theme.colors.subtext, textAlign: 'center', lineHeight: 20 }}>
                        {t.orders.no_past_orders_subtitle}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <OrderHistoryItem order={item} onPress={() => handleOrderPress(item)} />}
                renderSectionHeader={({ section: { title, data } }) => (
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingTop: 20,
                        paddingBottom: 10,
                    }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.subtext, textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 }}>
                            {title}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.colors.subtext }}>
                            {data.length} {data.length !== 1 ? t.orders.item_plural : t.orders.item_singular}
                        </Text>
                    </View>
                )}
                ListHeaderComponent={header}
                ListFooterComponent={
                    loading && orders.length > 0 ? (
                        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        </View>
                    ) : null
                }
                onEndReached={() => { if (hasMore && !loading) loadMore(); }}
                onEndReachedThreshold={0.3}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32 }}
                stickySectionHeadersEnabled={false}
                style={{ backgroundColor: theme.colors.background }}
            />
            <OrderSummarySheet
                orderId={summaryOrderId}
                onClose={() => setSummaryOrderId(null)}
            />
        </SafeAreaView>
    );
};
