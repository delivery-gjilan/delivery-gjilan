import { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Platform,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { useRouter } from 'expo-router';
import { format, startOfDay, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
    GET_MY_BUSINESS_SETTLEMENTS,
    GET_MY_BUSINESS_SETTLEMENT_SUMMARY,
    GET_LAST_BUSINESS_PAID_SETTLEMENT,
    GET_MY_SETTLEMENT_REQUESTS,
    RESPOND_TO_SETTLEMENT_REQUEST,
    GET_BUSINESS_SETTLEMENT_BREAKDOWN,
} from '@/graphql/settlements';
import { GET_BUSINESS_ORDERS, GET_BUSINESS_ORDER_REVIEWS } from '@/graphql/orders';
import { GET_BUSINESS_PRODUCTS } from '@/graphql/products';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import type { GetMyBusinessSettlementsQuery, GetBusinessSettlementBreakdownQuery } from '@/gql/graphql';

type Settlement = GetMyBusinessSettlementsQuery['settlements'][number];
type BreakdownItem = GetBusinessSettlementBreakdownQuery['settlementBreakdown'][number];

// ─── Types ──────────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month' | 'last_settlement' | 'custom' | 'all';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCustomDate(str: string): Date | null {
    // Accepts DD/MM/YYYY
    const parts = str.trim().split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts.map(Number);
    if (!d || !m || !y || y < 2000) return null;
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
}

function getPeriodDates(
    period: Period,
    lastPaidDate: string | null,
    customStart: string,
    customEnd: string,
): { startDate?: string; endDate?: string } {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    switch (period) {
        case 'today': {
            return {
                startDate: startOfDay(now).toISOString(),
                endDate: endOfToday.toISOString(),
            };
        }
        case 'week': {
            return {
                startDate: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
                endDate: endOfToday.toISOString(),
            };
        }
        case 'month': {
            return {
                startDate: startOfMonth(now).toISOString(),
                endDate: endOfToday.toISOString(),
            };
        }
        case 'last_settlement': {
            if (!lastPaidDate) return {};
            const afterSettled = new Date(new Date(lastPaidDate).getTime() + 1);
            return {
                startDate: afterSettled.toISOString(),
                endDate: endOfToday.toISOString(),
            };
        }
        case 'custom': {
            const s = parseCustomDate(customStart);
            const e = parseCustomDate(customEnd);
            if (!s || !e) return {};
            const endOfE = new Date(e);
            endOfE.setHours(23, 59, 59, 999);
            return { startDate: s.toISOString(), endDate: endOfE.toISOString() };
        }
        default:
            return {};
    }
}

function formatCurrency(amount: number) {
    return `€${amount.toFixed(2)}`;
}

function formatDateTime(dateStr?: string | null) {
    if (!dateStr) return '—';
    try {
        return format(new Date(dateStr), 'MMM d, yyyy HH:mm');
    } catch {
        return '—';
    }
}

type SettlementOrderItem = GetMyBusinessSettlementsQuery['settlements'][number]['order'] extends infer O
    ? NonNullable<O> extends { businesses: Array<{ items: Array<infer I> }> } ? I : never
    : never;

function calculateOrderItemSubtotal(item: SettlementOrderItem): number {
    const quantity = Number(item?.quantity ?? 0);
    const unitPrice = Number(item?.unitPrice ?? 0);

    const selectedOptionsTotal = (item?.selectedOptions ?? []).reduce(
        (sum, opt) => sum + Number(opt?.priceAtOrder ?? 0),
        0,
    );

    const childItemsTotal = (item?.childItems ?? []).reduce(
        (sum, child) => sum + calculateOrderItemSubtotal(child as SettlementOrderItem),
        0,
    );

    return unitPrice * quantity + selectedOptionsTotal * quantity + childItemsTotal;
}

function calculateBusinessSubtotal(items: SettlementOrderItem[]): number {
    return (items ?? []).reduce((sum, item) => sum + calculateOrderItemSubtotal(item), 0);
}


// ─── Component ───────────────────────────────────────────────────────────────

type BusinessSettlement = GetMyBusinessSettlementsQuery['settlements'][number];

interface SettlementOrderGroup {
    orderId: string;
    orderDisplayId: string;
    order: BusinessSettlement['order'];
    settlements: BusinessSettlement[];
    totalGross: number;
    totalReceivable: number;
    totalPayable: number;
    latestCreatedAt: string;
}

export default function FinancesScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { user } = useAuthStore();
    const [financeTab, setFinanceTab] = useState<'stats' | 'settlements'>('stats');
    const [period, setPeriod] = useState<Period>('month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [customModalOpen, setCustomModalOpen] = useState(false);
    const [customStartInput, setCustomStartInput] = useState('');
    const [customEndInput, setCustomEndInput] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [allSettlements, setAllSettlements] = useState<GetMyBusinessSettlementsQuery['settlements']>([]);
    const [settlementOffset, setSettlementOffset] = useState(0);
    const [hasMoreSettlements, setHasMoreSettlements] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [disputeModalRequestId, setDisputeModalRequestId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [selectedSettlementOrder, setSelectedSettlementOrder] = useState<SettlementOrderGroup | null>(null);

    // ── Category drill-down state ──
    const [selectedCategory, setSelectedCategory] = useState<{ category: string; label: string; color: string; direction: string } | null>(null);
    const [categorySettlements, setCategorySettlements] = useState<Settlement[]>([]);
    const [highlightCategory, setHighlightCategory] = useState<string | null>(null);

    const businessId = user?.businessId ?? '';

    // ── Stats tab queries ────────────────────────────────────────────────────
    const [statsFilter, setStatsFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');

    const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } = useQuery(GET_BUSINESS_ORDERS, {
        pollInterval: 60000,
        skip: financeTab !== 'stats',
    });

    const { data: productsData, refetch: refetchProducts } = useQuery(GET_BUSINESS_PRODUCTS, {
        variables: { businessId: businessId || '' },
        skip: !businessId || financeTab !== 'stats',
    });

    const { data: reviewsData, loading: reviewsLoading, refetch: refetchReviews } = useQuery(GET_BUSINESS_ORDER_REVIEWS, {
        variables: { limit: 100, offset: 0 },
        skip: financeTab !== 'stats',
    });

    const statsOrders = useMemo(() => {
        if (!businessId) return [];
        return (ordersData?.orders?.orders ?? []).filter((o) =>
            (o.businesses ?? []).some((b) => b.business?.id === businessId),
        );
    }, [ordersData, businessId]);

    const statsFilteredOrders = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        if (statsFilter === 'today') startDate = startOfDay(now);
        else if (statsFilter === 'week') startDate = startOfWeek(now, { weekStartsOn: 1 });
        else if (statsFilter === 'month') startDate = startOfMonth(now);
        else return statsOrders;
        return statsOrders.filter((o) => new Date(o.orderDate) >= startDate);
    }, [statsOrders, statsFilter]);

    const statsDelivered = useMemo(() => statsFilteredOrders.filter((o) => o.status === 'DELIVERED'), [statsFilteredOrders]);

    const statsKPIs = useMemo(() => {
        const revenue = statsDelivered.reduce((sum, o) => {
            const chunk = (o.businesses ?? []).find((b) => b.business?.id === businessId);
            return sum + (chunk?.items ?? []).reduce((s, i) => s + Number(i.unitPrice ?? 0) * Number(i.quantity ?? 0), 0);
        }, 0);
        const cancelled = statsFilteredOrders.filter((o) => o.status === 'CANCELLED').length;
        const total = statsFilteredOrders.length;
        return {
            total,
            delivered: statsDelivered.length,
            revenue,
            avgOrderValue: statsDelivered.length > 0 ? revenue / statsDelivered.length : 0,
            cancelRate: total > 0 ? (cancelled / total) * 100 : 0,
        };
    }, [statsDelivered, statsFilteredOrders, businessId]);

    // Top products by quantity sold
    const topProducts = useMemo(() => {
        const agg = new Map<string, { productId: string; name: string; quantity: number; revenue: number; imageUrl?: string | null }>();
        statsDelivered.forEach((order) => {
            (order.businesses ?? [])
                .filter((b) => b.business?.id === businessId)
                .forEach((chunk) => {
                    (chunk.items ?? []).forEach((item) => {
                        const key = item.productId || item.name;
                        const cur = agg.get(key) ?? { productId: key, name: item.name ?? 'Unknown', quantity: 0, revenue: 0, imageUrl: item.imageUrl ?? null };
                        cur.quantity += Number(item.quantity ?? 0);
                        cur.revenue += Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0);
                        if (!cur.imageUrl && item.imageUrl) cur.imageUrl = item.imageUrl;
                        agg.set(key, cur);
                    });
                });
        });
        return Array.from(agg.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 8);
    }, [statsDelivered, businessId]);

    // Last 7 days revenue chart
    const revenueChart = useMemo(() => {
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = subDays(new Date(), 6 - i);
            return { date: d, label: format(d, 'EEE'), dayStart: startOfDay(d), revenue: 0 };
        });
        statsOrders
            .filter((o) => o.status === 'DELIVERED')
            .forEach((order) => {
                const orderDate = new Date(order.orderDate);
                const day = days.find((d) => {
                    const next = subDays(d.dayStart, -1);
                    return orderDate >= d.dayStart && orderDate < next;
                });
                if (day) {
                    const chunk = (order.businesses ?? []).find((b) => b.business?.id === businessId);
                    day.revenue += (chunk?.items ?? []).reduce((s, i) => s + Number(i.unitPrice ?? 0) * Number(i.quantity ?? 0), 0);
                }
            });
        const max = Math.max(...days.map((d) => d.revenue), 1);
        return days.map((d) => ({ ...d, height: Math.max(4, (d.revenue / max) * 80) }));
    }, [statsOrders, businessId]);

    const reviewsList = useMemo(() => reviewsData?.businessOrderReviews ?? [], [reviewsData]);
    const avgRating = reviewsList.length > 0 ? reviewsList.reduce((s, r) => s + Number(r.rating ?? 0), 0) / reviewsList.length : 0;

    // Fetch last paid settlement to support "From Last Settlement" period
    const { data: lastPaidData, refetch: refetchLastPaid } = useQuery(
        GET_LAST_BUSINESS_PAID_SETTLEMENT,
        {
            variables: { businessId },
            skip: !businessId,
            fetchPolicy: 'network-only',
        },
    );

    const {
        data: requestsData,
        loading: requestsLoading,
        refetch: refetchRequests,
    } = useQuery(GET_MY_SETTLEMENT_REQUESTS, {
        variables: { businessId, status: 'PENDING', limit: 20 },
        skip: !businessId,
        fetchPolicy: 'network-only',
    });

    const [respondToRequest] = useMutation(RESPOND_TO_SETTLEMENT_REQUEST);

    const pendingRequests = requestsData?.settlementRequests ?? [];

    const lastPaidRaw = lastPaidData?.settlements?.[0];
    const lastPaidDate: string | null =
        lastPaidRaw?.paidAt ?? lastPaidRaw?.createdAt ?? null;

    const PERIODS: { key: Period; label: string; disabled?: boolean }[] = [
        { key: 'last_settlement', label: t('finances.from_last_settlement', 'From Last Settlement'), disabled: !lastPaidDate },
        { key: 'today', label: t('finances.today', 'Today') },
        { key: 'week', label: t('finances.this_week', 'This Week') },
        { key: 'month', label: t('finances.this_month', 'This Month') },
        { key: 'custom', label: customStart && customEnd ? `${customStart} – ${customEnd}` : t('finances.custom_range', 'Custom Range') },
        { key: 'all', label: t('finances.all_time', 'All Time') },
    ];

    const { startDate, endDate } = getPeriodDates(period, lastPaidDate, customStart, customEnd);

    const {
        data: summaryData,
        loading: summaryLoading,
        refetch: refetchSummary,
    } = useQuery(GET_MY_BUSINESS_SETTLEMENT_SUMMARY, {
        variables: { businessId, startDate, endDate },
        skip: !businessId,
        fetchPolicy: 'network-only',
    });

    const {
        data: settlementsData,
        loading: settlementsLoading,
        refetch: refetchSettlements,
        fetchMore: fetchMoreSettlements,
    } = useQuery(GET_MY_BUSINESS_SETTLEMENTS, {
        variables: {
            businessId,
            startDate,
            endDate,
            limit: PAGE_SIZE,
            offset: 0,
        },
        skip: !businessId,
        fetchPolicy: 'network-only',
        onCompleted: (data) => {
            const rows = data?.settlements ?? [];
            setAllSettlements(rows);
            setSettlementOffset(rows.length);
            setHasMoreSettlements(rows.length === PAGE_SIZE);
        },
    });

    const {
        data: breakdownData,
        loading: breakdownLoading,
        refetch: refetchBreakdown,
    } = useQuery(GET_BUSINESS_SETTLEMENT_BREAKDOWN, {
        variables: { businessId, startDate, endDate },
        skip: !businessId,
        fetchPolicy: 'network-only',
    });

    const summary = summaryData?.settlementSummary;
    const settlements = allSettlements;
    const breakdownItems = breakdownData?.settlementBreakdown ?? [];

    // ── Category drill-down query ──
    const [fetchCategorySettlements, { loading: categoryLoading }] = useLazyQuery(
        GET_MY_BUSINESS_SETTLEMENTS,
        {
            fetchPolicy: 'network-only',
            onCompleted: (data) => {
                setCategorySettlements(data?.settlements ?? []);
            },
        },
    );

    // Map a settlement line to its computed category (mirrors backend logic)
    const getLineCategory = (s: Settlement): string => {
        if (!s.rule?.id) {
            if (s.reason?.startsWith("Stock item")) return "STOCK_REMITTANCE";
            if (s.reason?.startsWith("Driver tip")) return "DRIVER_TIP";
            if (s.reason?.startsWith("Catalog product")) return "CATALOG_REVENUE";
            return "AUTO_REMITTANCE";
        }
        if (s.rule.promotion?.id) return "PROMOTION_COST";
        if (s.rule.type === "DELIVERY_PRICE") return "DELIVERY_COMMISSION";
        return "PLATFORM_COMMISSION";
    };

    const getCategoryColor = (category: string, direction: string) => {
        const colors: Record<string, string> = {
            AUTO_REMITTANCE: '#ef4444',
            STOCK_REMITTANCE: '#a855f7',
            DELIVERY_COMMISSION: direction === 'PAYABLE' ? '#22c55e' : '#f59e0b',
            PLATFORM_COMMISSION: '#f59e0b',
            PROMOTION_COST: '#f59e0b',
            DRIVER_TIP: '#22c55e',
            CATALOG_REVENUE: '#ef4444',
        };
        return colors[category] ?? '#6b7280';
    };

    const getCategoryIcon = (category: string): string => {
        const icons: Record<string, string> = {
            AUTO_REMITTANCE: 'swap-horizontal-outline',
            STOCK_REMITTANCE: 'cube-outline',
            DELIVERY_COMMISSION: 'bicycle-outline',
            PLATFORM_COMMISSION: 'business-outline',
            PROMOTION_COST: 'pricetag-outline',
            DRIVER_TIP: 'heart-outline',
            CATALOG_REVENUE: 'storefront-outline',
        };
        return icons[category] ?? 'help-circle-outline';
    };

    const getCategoryDescription = (category: string): string => {
        const map: Record<string, string> = {
            AUTO_REMITTANCE: t('finances.desc_auto_remittance', 'Markup & surcharge adjustments'),
            STOCK_REMITTANCE: t('finances.desc_stock_remittance', 'Stock item cost remittance'),
            DELIVERY_COMMISSION: t('finances.desc_delivery_commission', 'Commission on delivery fees'),
            PLATFORM_COMMISSION: t('finances.desc_platform_commission', 'Platform fee on order subtotal'),
            PROMOTION_COST: t('finances.desc_promotion_cost', 'Promotional discount cost share'),
            DRIVER_TIP: t('finances.desc_driver_tip', 'Tips forwarded to drivers'),
            CATALOG_REVENUE: t('finances.desc_catalog_revenue', 'Catalog product revenue'),
        };
        return map[category] ?? '';
    };

    // Group category-filtered settlements by order
    const categoryOrders = useMemo(() => {
        const byOrder = new Map<string, { orderId: string; displayId: string | null; settlement: Settlement; settlements: Settlement[]; totalAmount: number; latestCreatedAt: string }>();
        categorySettlements.forEach((s) => {
            const orderId = String(s.order?.id ?? s.id);
            const existing = byOrder.get(orderId);
            if (existing) {
                existing.settlements.push(s);
                existing.totalAmount += Number(s.amount ?? 0);
                if (new Date(s.createdAt).getTime() > new Date(existing.latestCreatedAt).getTime()) existing.latestCreatedAt = s.createdAt;
                return;
            }
            byOrder.set(orderId, {
                orderId,
                displayId: s.order?.displayId ?? null,
                settlement: s,
                settlements: [s],
                totalAmount: Number(s.amount ?? 0),
                latestCreatedAt: s.createdAt,
            });
        });
        return Array.from(byOrder.values()).sort((a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime());
    }, [categorySettlements]);

    const handleCategoryPress = useCallback((item: BreakdownItem) => {
        const color = getCategoryColor(item.category, item.direction);
        setSelectedCategory({ category: item.category, label: item.label, color, direction: item.direction });
        setCategorySettlements([]);
        fetchCategorySettlements({ variables: { businessId, category: item.category, startDate, endDate, limit: 100, offset: 0 } });
    }, [fetchCategorySettlements, businessId, startDate, endDate]);
    // Compute revenue generated & commission owed from settlement rows
    const computed = useMemo(() => {
        let totalGross = 0;
        let pendingOwed = 0;
        let hasPartiallyPaid = false;

        settlements.forEach((s) => {
            const businessOrder = (s.order?.businesses ?? []).find(
                (entry) => entry?.business?.id === businessId,
            );
            const items = businessOrder?.items ?? [];
            const gross = calculateBusinessSubtotal(items);
            totalGross += gross;

            if (s.direction === 'RECEIVABLE') {
                if (s.status === 'PENDING' || s.status === 'OVERDUE') {
                    pendingOwed += Number(s.amount ?? 0);
                }
                if (s.status === 'PARTIALLY_PAID') {
                    hasPartiallyPaid = true;
                    pendingOwed += Number(s.amount ?? 0);
                }
            }
        });

        return { totalGross, pendingOwed, hasPartiallyPaid };
    }, [settlements, businessId]);

    const filteredSettlements = useMemo(() => settlements, [settlements]);

    // Group settlements by order
    const settlementOrders = useMemo(() => {
        const grouped: Record<string, SettlementOrderGroup> = {};
        filteredSettlements.forEach((s) => {
            const orderId = String(s.order?.id ?? s.id);
            if (!grouped[orderId]) {
                const businessOrder = (s.order?.businesses ?? []).find(
                    (entry) => entry?.business?.id === businessId,
                );
                const items = businessOrder?.items ?? [];
                grouped[orderId] = {
                    orderId,
                    orderDisplayId: s.order?.displayId ?? s.order?.id?.slice(-6) ?? '—',
                    order: s.order,
                    settlements: [],
                    totalGross: calculateBusinessSubtotal(items),
                    totalReceivable: 0,
                    totalPayable: 0,
                    latestCreatedAt: s.createdAt,
                };
            }
            grouped[orderId].settlements.push(s);
            const amount = Number(s.amount ?? 0);
            if (s.direction === 'RECEIVABLE') {
                grouped[orderId].totalReceivable += amount;
            } else {
                grouped[orderId].totalPayable += amount;
            }
            if (new Date(s.createdAt) > new Date(grouped[orderId].latestCreatedAt)) {
                grouped[orderId].latestCreatedAt = s.createdAt;
            }
        });

        return Object.values(grouped).sort(
            (a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime(),
        );
    }, [filteredSettlements, businessId]);

    const handleLoadMoreSettlements = useCallback(async () => {
        if (!hasMoreSettlements || settlementsLoading || loadingMore) return;
        setLoadingMore(true);
        try {
            const result = await fetchMoreSettlements({
                variables: { businessId, startDate, endDate, limit: PAGE_SIZE, offset: settlementOffset },
            });
            const rows = result.data?.settlements ?? [];
            setAllSettlements(prev => [...prev, ...rows]);
            setSettlementOffset(prev => prev + rows.length);
            setHasMoreSettlements(rows.length === PAGE_SIZE);
        } finally {
            setLoadingMore(false);
        }
    }, [hasMoreSettlements, settlementsLoading, loadingMore, fetchMoreSettlements, settlementOffset, businessId, startDate, endDate]);

    const onRefresh = async () => {
        setRefreshing(true);
        if (financeTab === 'stats') {
            await Promise.all([refetchOrders(), refetchProducts(), refetchReviews()]);
        } else {
            await Promise.all([
                refetchSummary(),
                refetchSettlements(),
                refetchLastPaid(),
                refetchRequests(),
                refetchBreakdown(),
            ]);
        }
        setRefreshing(false);
    };

    const handlePeriodChange = (p: Period) => {
        if (p === 'custom') {
            // Pre-fill inputs with existing values or today
            const today = format(new Date(), 'dd/MM/yyyy');
            setCustomStartInput(customStart || today);
            setCustomEndInput(customEnd || today);
            setCustomModalOpen(true);
            return;
        }
        setPeriod(p);
    };

    const handleApplyCustomRange = () => {
        const s = parseCustomDate(customStartInput);
        const e = parseCustomDate(customEndInput);
        if (!s || !e) {
            Alert.alert(t('finances.invalid_date', 'Invalid date'), t('finances.invalid_date_text', 'Please enter dates in DD/MM/YYYY format.'));
            return;
        }
        if (s > e) {
            Alert.alert(t('finances.invalid_range', 'Invalid range'), t('finances.invalid_range_text', 'Start date must be before end date.'));
            return;
        }
        setCustomStart(customStartInput);
        setCustomEnd(customEndInput);
        setPeriod('custom');
        setCustomModalOpen(false);
    };

    const handleAccept = async (requestId: string) => {
        const req = pendingRequests.find((r) => r.id === requestId);
        const requestedAmount = Number(req?.amount ?? 0);
        Alert.alert(
            t('finances.accept_request_title', 'Accept Settlement'),
            Number.isFinite(requestedAmount) && requestedAmount > 0
                ? t('finances.accept_request_text', 'Accepting will settle up to {{amount}} for this request period. Continue?', { amount: formatCurrency(requestedAmount) })
                : t('finances.accept_request_fallback', 'Accept this settlement request?'),
            [
                { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                {
                    text: t('finances.accept', 'Accept'),
                    style: 'default',
                    onPress: async () => {
                        try {
                            setRespondingId(requestId);
                            await respondToRequest({
                                variables: { requestId, action: 'ACCEPT' },
                            });
                            await refetchRequests();
                            await Promise.all([refetchSummary(), refetchSettlements()]);
                        } catch (err: unknown) {
                            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to accept request');
                        } finally {
                            setRespondingId(null);
                        }
                    },
                },
            ],
        );
    };

    const handleOpenDisputeModal = (requestId: string) => {
        setRejectReason('');
        setDisputeModalRequestId(requestId);
    };

    const handleSubmitReject = async () => {
        if (!disputeModalRequestId) return;
        try {
            setRespondingId(disputeModalRequestId);
            await respondToRequest({
                variables: {
                    requestId: disputeModalRequestId,
                    action: 'REJECT',
                    reason: rejectReason.trim() || undefined,
                },
            });
            setDisputeModalRequestId(null);
            await refetchRequests();
        } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to reject request');
        } finally {
            setRespondingId(null);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <SafeAreaView className="flex-1 bg-[#0a0f1a]">
            {/* ── Tab Switcher ── */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, gap: 8 }}>
                {([
                    { key: 'stats' as const, label: t('finances.tab_stats', 'Statistics'), icon: 'bar-chart' as const },
                    { key: 'settlements' as const, label: t('finances.tab_settlements', 'Settlements'), icon: 'cash-outline' as const },
                ] as const).map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => setFinanceTab(tab.key)}
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 10,
                            borderRadius: 14,
                            gap: 6,
                            backgroundColor: financeTab === tab.key ? '#7C3AED' : '#1a2233',
                            borderWidth: 1,
                            borderColor: financeTab === tab.key ? '#7C3AED' : '#263145',
                        }}
                    >
                        <Ionicons name={tab.icon} size={16} color={financeTab === tab.key ? '#fff' : '#9ca3af'} />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: financeTab === tab.key ? '#fff' : '#9ca3af' }}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── Statistics Tab ── */}
            {financeTab === 'stats' ? (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
                >
                    {/* Period filter */}
                    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {([
                                { key: 'today' as const, label: t('finances.today', 'Today') },
                                { key: 'week' as const, label: t('finances.this_week', 'This Week') },
                                { key: 'month' as const, label: t('finances.this_month', 'This Month') },
                                { key: 'all' as const, label: t('finances.all_time', 'All Time') },
                            ] as const).map((p) => (
                                <Pressable
                                    key={p.key}
                                    onPress={() => setStatsFilter(p.key)}
                                    style={{
                                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                                        backgroundColor: statsFilter === p.key ? '#7C3AED' : '#1a2233',
                                        borderWidth: 1,
                                        borderColor: statsFilter === p.key ? '#7C3AED' : '#263145',
                                    }}
                                >
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: statsFilter === p.key ? '#fff' : '#8899aa' }}>
                                        {p.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>

                    {ordersLoading && !ordersData ? (
                        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                            <ActivityIndicator color="#7C3AED" size="large" />
                        </View>
                    ) : (
                        <>
                            {/* KPI cards 2×2 */}
                            <View style={{ paddingHorizontal: 16, paddingTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                {[
                                    { label: t('dashboard.today_orders', 'Total Orders'), value: String(statsKPIs.total), icon: 'receipt-outline' as const, color: '#7C3AED' },
                                    { label: t('orders.delivered', 'Delivered'), value: String(statsKPIs.delivered), icon: 'checkmark-circle-outline' as const, color: '#22c55e' },
                                    { label: t('dashboard.today_revenue', 'Revenue'), value: `€${statsKPIs.revenue.toFixed(2)}`, icon: 'cash-outline' as const, color: '#3b82f6' },
                                    { label: 'Avg Order', value: `€${statsKPIs.avgOrderValue.toFixed(2)}`, icon: 'trending-up-outline' as const, color: '#f59e0b' },
                                    { label: 'Cancel Rate', value: `${statsKPIs.cancelRate.toFixed(1)}%`, icon: 'close-circle-outline' as const, color: '#ef4444' },
                                    { label: 'Reviews', value: reviewsList.length > 0 ? `${avgRating.toFixed(1)}★ (${reviewsList.length})` : '—', icon: 'star-outline' as const, color: '#eab308' },
                                ].map((kpi) => (
                                    <View
                                        key={kpi.label}
                                        style={{
                                            width: '47%',
                                            backgroundColor: '#1a2233',
                                            borderRadius: 18,
                                            padding: 16,
                                            borderWidth: 1,
                                            borderColor: '#263145',
                                            flexGrow: 0,
                                        }}
                                    >
                                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${kpi.color}25`, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                                            <Ionicons name={kpi.icon} size={16} color={kpi.color} />
                                        </View>
                                        <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>{kpi.label}</Text>
                                        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{kpi.value}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Last 7 days bar chart */}
                            <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#1a2233', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#263145' }}>
                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 16 }}>
                                    Revenue — Last 7 Days
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 96 }}>
                                    {revenueChart.map((day, i) => (
                                        <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                                            <Text style={{ color: '#64748b', fontSize: 9, marginBottom: 4 }}>
                                                {day.revenue > 0 ? `€${day.revenue < 10 ? day.revenue.toFixed(1) : Math.round(day.revenue)}` : ''}
                                            </Text>
                                            <View
                                                style={{
                                                    width: 28, height: day.height, borderRadius: 6,
                                                    backgroundColor: i === 6 ? '#7C3AED' : '#334155',
                                                }}
                                            />
                                            <Text style={{ color: '#64748b', fontSize: 10, marginTop: 6 }}>{day.label}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* Top products */}
                            {topProducts.length > 0 && (
                                <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: '#1a2233', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#263145' }}>
                                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 12 }}>
                                        Most Ordered
                                    </Text>
                                    {topProducts.map((product, idx) => (
                                        <View
                                            key={product.productId}
                                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: idx < topProducts.length - 1 ? 10 : 0 }}
                                        >
                                            <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700', width: 20 }}>{idx + 1}</Text>
                                            <View style={{ width: 38, height: 38, borderRadius: 10, overflow: 'hidden', backgroundColor: '#7C3AED1a', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                                {product.imageUrl ? (
                                                    <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                                ) : (
                                                    <Ionicons name="fast-food-outline" size={16} color="#7C3AED" />
                                                )}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: '#e2e8f0', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{product.name}</Text>
                                                <Text style={{ color: '#64748b', fontSize: 11 }}>{product.quantity} sold</Text>
                                            </View>
                                            <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: '700' }}>€{product.revenue.toFixed(2)}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Reviews summary card */}
                            <TouchableOpacity
                                onPress={() => router.push('/reviews')}
                                style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: '#1a2233', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#263145', flexDirection: 'row', alignItems: 'center' }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Customer Reviews</Text>
                                    {reviewsLoading ? (
                                        <ActivityIndicator size="small" color="#7C3AED" style={{ marginTop: 4 }} />
                                    ) : reviewsList.length > 0 ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                                            <Text style={{ color: '#eab308', fontSize: 18, fontWeight: '800' }}>{avgRating.toFixed(1)}</Text>
                                            <View style={{ flexDirection: 'row', gap: 2 }}>
                                                {[1,2,3,4,5].map((s) => (
                                                    <Ionicons key={s} name={s <= Math.round(avgRating) ? 'star' : 'star-outline'} size={13} color="#eab308" />
                                                ))}
                                            </View>
                                            <Text style={{ color: '#64748b', fontSize: 12 }}>({reviewsList.length})</Text>
                                        </View>
                                    ) : (
                                        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>No reviews yet</Text>
                                    )}
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#475569" />
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            ) : (
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#7C3AED"
                    />
                }
            >
                {/* ── Summary Cards ── */}
                <View className="px-5 mt-5" style={{ gap: 12 }}>
                    {summaryLoading || settlementsLoading ? (
                        <View
                            className="rounded-3xl p-8 items-center justify-center"
                            style={{ backgroundColor: '#1a2233' }}
                        >
                            <ActivityIndicator color="#7C3AED" />
                            <Text className="text-xs text-gray-500 mt-2">Loading summary…</Text>
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {/* Revenue Generated */}
                            <View
                                style={{
                                    flex: 1,
                                    borderRadius: 20,
                                    padding: 18,
                                    backgroundColor: '#7C3AED10',
                                    borderWidth: 1,
                                    borderColor: '#7C3AED35',
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 10,
                                        fontWeight: '700',
                                        letterSpacing: 1,
                                        color: '#7C3AED',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {t('finances.revenue', 'Revenue')}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 26,
                                        fontWeight: '800',
                                        color: '#fff',
                                        marginTop: 6,
                                    }}
                                >
                                    {formatCurrency(computed.totalGross)}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                                    {settlementOrders.length}{' '}
                                    {settlementOrders.length === 1 ? t('finances.order', 'order') : t('finances.orders', 'orders')}
                                </Text>
                            </View>

                            {/* Owed to Platform */}
                            <View
                                style={{
                                    flex: 1,
                                    borderRadius: 20,
                                    padding: 18,
                                    backgroundColor: '#1a0a0a',
                                    borderWidth: 1,
                                    borderColor: '#3b1212',
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 10,
                                        fontWeight: '700',
                                        letterSpacing: 1,
                                        color: '#ef4444',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {t('finances.owed', 'Owed')}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 26,
                                        fontWeight: '800',
                                        color: computed.pendingOwed > 0 ? '#ef4444' : '#22c55e',
                                        marginTop: 6,
                                    }}
                                >
                                    {formatCurrency(computed.pendingOwed)}
                                </Text>
                                {computed.hasPartiallyPaid && (
                                    <Text style={{ fontSize: 10, color: '#f59e0b', marginTop: 4 }}>
                                        {t('finances.includes_partial', 'Includes partial balance')}
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}
                </View>

                {/* ── Period Selector ── */}
                <View className="px-5 mt-5">
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8 }}
                    >
                        {PERIODS.map((p) => {
                            const active = period === p.key;
                            const disabled = !!p.disabled;
                            return (
                                <Pressable
                                    key={p.key}
                                    disabled={disabled}
                                    onPress={() => handlePeriodChange(p.key)}
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
                                        borderRadius: 999,
                                        backgroundColor: active ? '#7C3AED' : '#1a2233',
                                        borderWidth: 1,
                                        borderColor: active ? '#7C3AED' : '#263145',
                                        opacity: disabled ? 0.4 : 1,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontWeight: '600',
                                            color: active ? '#fff' : '#8899aa',
                                        }}
                                    >
                                        {p.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* ── Settlement Breakdown ── */}
                {!breakdownLoading && breakdownItems.length > 0 && (
                    <View className="px-5 mt-5">
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: '700',
                                color: '#fff',
                                marginBottom: 10,
                            }}
                        >
                            {t('finances.breakdown_title', 'Cost Breakdown')}
                        </Text>
                        <View style={{ gap: 8 }}>
                            {breakdownItems.map((item, idx) => {
                                const isReceivable = item.direction === 'RECEIVABLE';
                                const color = getCategoryColor(item.category, item.direction);
                                return (
                                    <Pressable
                                        key={`${item.category}-${idx}`}
                                        onPress={() => handleCategoryPress(item)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            borderRadius: 16,
                                            padding: 14,
                                            backgroundColor: '#1a2233',
                                            borderWidth: 1,
                                            borderColor: '#263145',
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                                            <View
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 8,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: color + '18',
                                                }}
                                            >
                                                <Ionicons name={getCategoryIcon(item.category) as any} size={14} color={color} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={{
                                                        fontSize: 13,
                                                        fontWeight: '600',
                                                        color: '#e2e8f0',
                                                    }}
                                                    numberOfLines={1}
                                                >
                                                    {item.label}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }} numberOfLines={1}>
                                                    {getCategoryDescription(item.category)}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                                    {item.count} {item.count === 1 ? t('finances.record', 'record') : t('finances.records', 'records')} · {t('finances.view_orders', 'View Orders')} ›
                                                </Text>
                                            </View>
                                        </View>
                                        <Text
                                            style={{
                                                fontSize: 15,
                                                fontWeight: '700',
                                                color,
                                            }}
                                        >
                                            {isReceivable ? '-' : '+'}{formatCurrency(item.totalAmount)}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* ── Settlement Requests ── */}
                {(requestsLoading || pendingRequests.length > 0) && (
                    <View className="px-5 mt-7">
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: 12,
                                gap: 8,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: '#f59e0b',
                                    }}
                                />
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: '700',
                                        color: '#fff',
                                    }}
                                >
                                    {t('finances.settlement_requests', 'Settlement Requests')}
                                </Text>
                                {pendingRequests.length > 0 && (
                                    <View
                                        style={{
                                            backgroundColor: '#f59e0b20',
                                            borderRadius: 999,
                                            paddingHorizontal: 8,
                                            paddingVertical: 2,
                                            borderWidth: 1,
                                            borderColor: '#f59e0b40',
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 11,
                                                fontWeight: '700',
                                                color: '#f59e0b',
                                            }}
                                        >
                                            {pendingRequests.length} {t('finances.pending', 'pending')}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {requestsLoading ? (
                            <ActivityIndicator color="#f59e0b" />
                        ) : (
                            <View style={{ gap: 10 }}>
                                {pendingRequests.map((req) => {
                                    const isResponding = respondingId === req.id;

                                    return (
                                        <View
                                            key={req.id}
                                            style={{
                                                borderRadius: 20,
                                                padding: 18,
                                                backgroundColor: '#1a1500',
                                                borderWidth: 1,
                                                borderColor: '#3d2e00',
                                            }}
                                        >
                                            {/* Header row */}
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: 10,
                                                }}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <Text
                                                        style={{
                                                            fontSize: 10,
                                                            fontWeight: '700',
                                                            letterSpacing: 1,
                                                            color: '#f59e0b',
                                                            textTransform: 'uppercase',
                                                            marginBottom: 4,
                                                        }}
                                                    >
                                                        Settlement Request
                                                    </Text>
                                                    <Text
                                                        style={{
                                                            fontSize: 28,
                                                            fontWeight: '800',
                                                            color: '#f59e0b',
                                                        }}
                                                    >
                                                        {formatCurrency(Number(req.amount ?? 0))}
                                                    </Text>
                                                </View>
                                                <View
                                                    style={{
                                                        backgroundColor: '#f59e0b20',
                                                        borderRadius: 8,
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 4,
                                                        borderWidth: 1,
                                                        borderColor: '#f59e0b40',
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 10,
                                                            fontWeight: '700',
                                                            color: '#f59e0b',
                                                        }}
                                                    >
                                                        AWAITING RESPONSE
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Details */}
                                            <View style={{ gap: 4, marginBottom: 14 }}>
                                                {req.note ? (
                                                    <Text
                                                        style={{
                                                            fontSize: 12,
                                                            color: '#9ca3af',
                                                            fontStyle: 'italic',
                                                        }}
                                                    >
                                                        "{req.note}"
                                                    </Text>
                                                ) : null}
                                                <Text
                                                    style={{
                                                        fontSize: 11,
                                                        color: '#6b7280',
                                                    }}
                                                >
                                                    {format(new Date(req.createdAt), 'MMM d, yyyy')}
                                                </Text>
                                            </View>

                                            {/* Action buttons */}
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    gap: 10,
                                                }}
                                            >
                                                <Pressable
                                                    onPress={() => handleAccept(req.id)}
                                                    disabled={isResponding}
                                                    style={{
                                                        flex: 1,
                                                        borderRadius: 12,
                                                        paddingVertical: 12,
                                                        alignItems: 'center',
                                                        backgroundColor: isResponding
                                                            ? '#14532d80'
                                                            : '#14532d',
                                                        borderWidth: 1,
                                                        borderColor: '#22c55e40',
                                                    }}
                                                >
                                                    {isResponding ? (
                                                        <ActivityIndicator
                                                            size="small"
                                                            color="#22c55e"
                                                        />
                                                    ) : (
                                                        <Text
                                                            style={{
                                                                fontSize: 13,
                                                                fontWeight: '700',
                                                                color: '#22c55e',
                                                            }}
                                                        >
                                                            {t('finances.accept', 'Accept')}
                                                        </Text>
                                                    )}
                                                </Pressable>
                                                <Pressable
                                                    onPress={() =>
                                                        handleOpenDisputeModal(req.id)
                                                    }
                                                    style={{
                                                        flex: 1,
                                                        borderRadius: 12,
                                                        paddingVertical: 12,
                                                        alignItems: 'center',
                                                        backgroundColor: '#3b0000',
                                                        borderWidth: 1,
                                                        borderColor: '#ef444440',
                                                        opacity: isResponding ? 0.5 : 1,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 13,
                                                            fontWeight: '700',
                                                            color: '#ef4444',
                                                        }}
                                                    >
                                                        {t('finances.reject', 'Reject')}
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                {/* ── Settlement Table ── */}
                <View className="px-5 mt-6">
                    {/* Last settlement timestamp banner */}
                    {period === 'last_settlement' && lastPaidDate && (
                        <View
                            style={{
                                borderRadius: 12,
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                backgroundColor: '#7C3AED10',
                                borderWidth: 1,
                                borderColor: '#7C3AED30',
                                marginBottom: 10,
                                gap: 2,
                            }}
                        >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                Last Settlement
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
                                {formatDateTime(lastPaidDate)}
                            </Text>
                            {computed.hasPartiallyPaid && (
                                <Text style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>
                                    Previous settlement was partially paid · outstanding balance included in Owed
                                </Text>
                            )}
                        </View>
                    )}

                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 10,
                        }}
                    >
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                            {t('finances.settlements', 'Settlements')}
                        </Text>
                        {settlementOrders.length > 0 && (
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                {settlementOrders.length}{' '}
                                {settlementOrders.length === 1 ? t('finances.order', 'order') : t('finances.orders', 'orders')}
                            </Text>
                        )}
                    </View>

                    {settlementsLoading ? (
                        <ActivityIndicator color="#7C3AED" style={{ marginTop: 16 }} />
                    ) : settlementOrders.length === 0 ? (
                        <View
                            style={{
                                alignItems: 'center',
                                paddingVertical: 48,
                                borderRadius: 20,
                                backgroundColor: '#1a2233',
                                borderWidth: 1,
                                borderColor: '#263145',
                            }}
                        >
                            <Text
                                style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}
                            >
                                No settlements found
                            </Text>
                            <Text
                                style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}
                            >
                                Try a different period or filter.
                            </Text>
                        </View>
                    ) : (
                        <View
                            style={{
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: '#263145',
                                overflow: 'hidden',
                            }}
                        >
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View>
                                    {/* Table header */}
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            borderBottomWidth: 1,
                                            borderBottomColor: '#263145',
                                            backgroundColor: '#111827',
                                        }}
                                    >
                                        {[
                                            { label: 'Order', w: 100 },
                                            { label: 'Date', w: 150 },
                                            { label: 'Revenue', w: 100, right: true },
                                            { label: 'Commission', w: 110, right: true },
                                            { label: 'Net', w: 100, right: true },
                                        ].map((col) => (
                                            <Text
                                                key={col.label}
                                                style={{
                                                    width: col.w,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 10,
                                                    fontSize: 10,
                                                    fontWeight: '700',
                                                    color: '#6b7280',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.6,
                                                    textAlign: col.right ? 'right' : 'left',
                                                }}
                                            >
                                                {col.label}
                                            </Text>
                                        ))}
                                    </View>

                                    {/* Table rows — grouped by order */}
                                    {settlementOrders.map((orderGroup, idx) => {
                                        const netAmount = orderGroup.totalPayable - orderGroup.totalReceivable;
                                        const hasPayable = orderGroup.totalPayable > 0;
                                        const rowBg = hasPayable
                                            ? '#071a0f'
                                            : idx % 2 === 0 ? '#0d1421' : '#0a0f1a';

                                        return (
                                            <Pressable
                                                key={orderGroup.orderId}
                                                onPress={() => { setHighlightCategory(null); setSelectedSettlementOrder(orderGroup); }}
                                                style={{
                                                    flexDirection: 'row',
                                                    borderBottomWidth: 1,
                                                    borderBottomColor: '#1a2233',
                                                    backgroundColor: rowBg,
                                                    borderLeftWidth: hasPayable ? 3 : 0,
                                                    borderLeftColor: '#22c55e',
                                                }}
                                            >
                                                {/* Order */}
                                                <View
                                                    style={{
                                                        width: 100,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 12,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 12,
                                                            fontWeight: '700',
                                                            color: '#fff',
                                                        }}
                                                    >
                                                        #{orderGroup.orderDisplayId}
                                                    </Text>
                                                    {orderGroup.settlements.length > 1 && (
                                                        <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                                                            {orderGroup.settlements.length} lines
                                                        </Text>
                                                    )}
                                                </View>

                                                {/* Date */}
                                                <Text
                                                    style={{
                                                        width: 150,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 12,
                                                        fontSize: 11,
                                                        color: '#6b7280',
                                                    }}
                                                >
                                                    {formatDateTime(
                                                        orderGroup.order?.orderDate ?? orderGroup.latestCreatedAt,
                                                    )}
                                                </Text>

                                                {/* Revenue */}
                                                <Text
                                                    style={{
                                                        width: 100,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 12,
                                                        fontSize: 12,
                                                        color: '#e2e8f0',
                                                        textAlign: 'right',
                                                    }}
                                                >
                                                    {formatCurrency(orderGroup.totalGross)}
                                                </Text>

                                                {/* Commission */}
                                                <Text
                                                    style={{
                                                        width: 110,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 12,
                                                        fontSize: 12,
                                                        color: '#f59e0b',
                                                        textAlign: 'right',
                                                    }}
                                                >
                                                    {formatCurrency(orderGroup.totalReceivable)}
                                                </Text>

                                                {/* Net */}
                                                <Text
                                                    style={{
                                                        width: 100,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 12,
                                                        fontSize: 12,
                                                        fontWeight: '700',
                                                        color: netAmount >= 0 ? '#22c55e' : '#ef4444',
                                                        textAlign: 'right',
                                                    }}
                                                >
                                                    {netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount)}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>
                    )}

                    {/* ── Load More ── */}
                    {hasMoreSettlements && settlementOrders.length > 0 && (
                        <Pressable
                            onPress={handleLoadMoreSettlements}
                            disabled={loadingMore}
                            style={{
                                marginTop: 12,
                                borderRadius: 14,
                                paddingVertical: 14,
                                alignItems: 'center',
                                backgroundColor: loadingMore ? '#1a2233' : '#7C3AED',
                                opacity: loadingMore ? 0.7 : 1,
                            }}
                        >
                            {loadingMore ? (
                                <ActivityIndicator size="small" color="#7C3AED" />
                            ) : (
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                                    {t('finances.load_more', 'Load More')}
                                </Text>
                            )}
                        </Pressable>
                    )}
                </View>
            </ScrollView>
            )}

            {/* ── Custom Range Modal ── */}
            <Modal
                visible={customModalOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setCustomModalOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, justifyContent: 'flex-end' }}
                >
                    <Pressable
                        style={{ flex: 1, backgroundColor: '#00000080' }}
                        onPress={() => setCustomModalOpen(false)}
                    />
                    <View
                        style={{
                            backgroundColor: '#111827',
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            padding: 24,
                            paddingBottom: 40,
                            borderTopWidth: 1,
                            borderColor: '#263145',
                            gap: 16,
                        }}
                    >
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>
                            {t('finances.custom_date_range', 'Custom Date Range')}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -8 }}>
                            {t('finances.date_format_hint', 'Enter dates in DD/MM/YYYY format')}
                        </Text>

                        <View style={{ gap: 10 }}>
                            <View>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{t('common.from', 'From')}</Text>
                                <TextInput
                                    value={customStartInput}
                                    onChangeText={setCustomStartInput}
                                    placeholder="DD/MM/YYYY"
                                    placeholderTextColor="#4b5563"
                                    keyboardType="numbers-and-punctuation"
                                    style={{
                                        borderRadius: 12,
                                        paddingHorizontal: 14,
                                        paddingVertical: 12,
                                        color: '#fff',
                                        backgroundColor: '#1a2233',
                                        borderWidth: 1,
                                        borderColor: '#263145',
                                        fontSize: 16,
                                        fontWeight: '600',
                                    }}
                                />
                            </View>
                            <View>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{t('common.to', 'To')}</Text>
                                <TextInput
                                    value={customEndInput}
                                    onChangeText={setCustomEndInput}
                                    placeholder="DD/MM/YYYY"
                                    placeholderTextColor="#4b5563"
                                    keyboardType="numbers-and-punctuation"
                                    style={{
                                        borderRadius: 12,
                                        paddingHorizontal: 14,
                                        paddingVertical: 12,
                                        color: '#fff',
                                        backgroundColor: '#1a2233',
                                        borderWidth: 1,
                                        borderColor: '#263145',
                                        fontSize: 16,
                                        fontWeight: '600',
                                    }}
                                />
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                            <Pressable
                                onPress={() => setCustomModalOpen(false)}
                                style={{
                                    flex: 1,
                                    borderRadius: 12,
                                    paddingVertical: 14,
                                    alignItems: 'center',
                                    backgroundColor: '#1a2233',
                                    borderWidth: 1,
                                    borderColor: '#263145',
                                }}
                            >
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#9ca3af' }}>{t('common.cancel', 'Cancel')}</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleApplyCustomRange}
                                style={{
                                    flex: 2,
                                    borderRadius: 12,
                                    paddingVertical: 14,
                                    alignItems: 'center',
                                    backgroundColor: '#7C3AED',
                                }}
                            >
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{t('finances.apply_range', 'Apply Range')}</Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Category Orders Modal ── */}
            <Modal
                visible={selectedCategory !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedCategory(null)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' }}
                    onPress={() => setSelectedCategory(null)}
                />
                <View style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    backgroundColor: '#0f1724', borderTopLeftRadius: 24, borderTopRightRadius: 24,
                    padding: 24, paddingBottom: 40, maxHeight: '85%',
                    borderTopWidth: 1, borderColor: '#263145',
                }}>
                    {selectedCategory && (
                        <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                    <View style={{
                                        width: 32, height: 32, borderRadius: 8,
                                        alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: selectedCategory.color + '18',
                                    }}>
                                        <Ionicons name={getCategoryIcon(selectedCategory.category) as any} size={16} color={selectedCategory.color} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>
                                            {selectedCategory.label}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                                            {categoryOrders.length} {categoryOrders.length === 1 ? t('finances.order', 'order') : t('finances.orders', 'orders')}
                                        </Text>
                                    </View>
                                </View>
                                <Pressable onPress={() => setSelectedCategory(null)}>
                                    <Ionicons name="close-circle" size={28} color="#6b7280" />
                                </Pressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }} contentContainerStyle={{ gap: 8 }}>
                                {categoryLoading ? (
                                    <ActivityIndicator color={selectedCategory.color} style={{ marginVertical: 24 }} />
                                ) : categoryOrders.length === 0 ? (
                                    <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#6b7280' }}>
                                            {t('finances.no_orders_for_category', 'No orders found for this category')}
                                        </Text>
                                    </View>
                                ) : (
                                    categoryOrders.map((orderGroup) => {
                                        const isPayable = orderGroup.settlements[0]?.direction === 'PAYABLE';
                                        const orderLabel = orderGroup.displayId ? `#${orderGroup.displayId}` : t('finances.order', 'Order');

                                        return (
                                            <Pressable
                                                key={orderGroup.orderId}
                                                onPress={() => {
                                                    // Look up the full OrderGroup from settlementOrders (loaded page)
                                                    const existing = settlementOrders.find((o) => o.orderId === orderGroup.orderId);
                                                    if (existing) {
                                                        setHighlightCategory(selectedCategory.category);
                                                        setSelectedSettlementOrder(existing);
                                                    } else {
                                                        // Build a compatible OrderGroup from category settlements
                                                        const grpSettlements = orderGroup.settlements;
                                                        const firstS = grpSettlements[0];
                                                        const businessOrder = (firstS?.order?.businesses ?? []).find((e) => e?.business?.id === businessId);
                                                        const items = businessOrder?.items ?? [];
                                                        setHighlightCategory(selectedCategory.category);
                                                        setSelectedSettlementOrder({
                                                            orderId: orderGroup.orderId,
                                                            orderDisplayId: orderGroup.displayId ?? firstS?.order?.displayId ?? orderGroup.orderId.slice(-6),
                                                            order: firstS?.order ?? null,
                                                            settlements: grpSettlements,
                                                            totalGross: calculateBusinessSubtotal(items as SettlementOrderItem[]),
                                                            totalReceivable: grpSettlements.filter((s) => s.direction === 'RECEIVABLE').reduce((acc, s) => acc + Number(s.amount ?? 0), 0),
                                                            totalPayable: grpSettlements.filter((s) => s.direction === 'PAYABLE').reduce((acc, s) => acc + Number(s.amount ?? 0), 0),
                                                            latestCreatedAt: orderGroup.latestCreatedAt,
                                                        });
                                                    }
                                                    setSelectedCategory(null);
                                                }}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    borderRadius: 14,
                                                    padding: 14,
                                                    backgroundColor: '#1a2233',
                                                    borderWidth: 1,
                                                    borderColor: selectedCategory.color + '30',
                                                }}
                                            >
                                                <View style={{ flex: 1, gap: 4 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <View style={{
                                                            backgroundColor: '#7C3AED18',
                                                            borderRadius: 6,
                                                            paddingHorizontal: 7,
                                                            paddingVertical: 2,
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                        }}>
                                                            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#7C3AED' }} />
                                                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase' }}>{orderLabel}</Text>
                                                        </View>
                                                        <Text style={{ fontSize: 11, color: '#6b7280' }}>
                                                            {orderGroup.settlements.length} line{orderGroup.settlements.length === 1 ? '' : 's'}
                                                        </Text>
                                                    </View>
                                                    <Text style={{ fontSize: 11, color: '#6b7280' }}>
                                                        {formatDateTime(orderGroup.latestCreatedAt)}
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Text style={{ fontSize: 15, fontWeight: '700', color: selectedCategory.color }}>
                                                        {isPayable ? '+' : '-'}{formatCurrency(orderGroup.totalAmount)}
                                                    </Text>
                                                    <Ionicons name="chevron-forward" size={14} color="#6b7280" />
                                                </View>
                                            </Pressable>
                                        );
                                    })
                                )}
                            </ScrollView>
                        </>
                    )}
                </View>
            </Modal>

            {/* ── Order Detail Modal ── */}
            <Modal
                visible={selectedSettlementOrder !== null}
                transparent
                animationType="slide"
                onRequestClose={() => { setSelectedSettlementOrder(null); setHighlightCategory(null); }}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' }}
                    onPress={() => { setSelectedSettlementOrder(null); setHighlightCategory(null); }}
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
                            const og = selectedSettlementOrder;
                            if (!og) return null;

                            const settlementsForOrder = og.settlements ?? [];
                            const businessOrder = (og.order?.businesses ?? []).find(
                                (e) => e?.business?.id === businessId,
                            );
                            const items = businessOrder?.items ?? [];
                            const grossFromItems = og.totalGross;
                            const netAmount = og.totalPayable - og.totalReceivable;

                            const promotions = og.order?.orderPromotions ?? [];
                            const itemDiscounts = promotions
                                .filter((p) => p.appliesTo === 'PRICE')
                                .reduce((acc, p) => acc + Number(p.discountAmount ?? 0), 0);
                            const deliveryDiscounts = promotions
                                .filter((p) => p.appliesTo === 'DELIVERY')
                                .reduce((acc, p) => acc + Number(p.discountAmount ?? 0), 0);
                            const totalDiscounts = itemDiscounts + deliveryDiscounts;

                            return (
                                <ScrollView
                                    bounces={false}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
                                >
                                    {/* Header */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                        <View>
                                            <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>
                                                Order #{og.orderDisplayId}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                                                {formatDateTime(og.order?.orderDate ?? og.latestCreatedAt)}
                                            </Text>
                                        </View>
                                        <View style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 10,
                                            backgroundColor: netAmount >= 0 ? '#22c55e20' : '#ef444420',
                                            borderWidth: 1,
                                            borderColor: netAmount >= 0 ? '#22c55e40' : '#ef444440',
                                        }}>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: netAmount >= 0 ? '#22c55e' : '#ef4444' }}>
                                                {netAmount >= 0 ? 'NET PAYOUT' : 'OWES PLATFORM'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Settlement status pills */}
                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                                        <View style={{
                                            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                                            backgroundColor: '#1a2233', borderWidth: 1, borderColor: '#263145',
                                        }}>
                                            <Text style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6 }}>Lines</Text>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#e2e8f0' }}>{settlementsForOrder.length}</Text>
                                        </View>
                                        <View style={{
                                            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                                            backgroundColor: '#1a2233', borderWidth: 1, borderColor: '#263145',
                                        }}>
                                            <Text style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6 }}>Status</Text>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: settlementsForOrder.some((l: any) => l.status !== 'PAID') ? '#f59e0b' : '#22c55e' }}>
                                                {settlementsForOrder.some((l: any) => l.status !== 'PAID') ? 'Pending' : 'Paid'}
                                            </Text>
                                        </View>
                                        {settlementsForOrder[0]?.paymentMethod && (
                                            <View style={{
                                                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                                                backgroundColor: '#1a2233', borderWidth: 1, borderColor: '#263145',
                                            }}>
                                                <Text style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6 }}>Method</Text>
                                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#e2e8f0' }}>{settlementsForOrder[0].paymentMethod}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Settlement Breakdown */}
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                                        Settlement Breakdown
                                    </Text>
                                    <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#263145', marginBottom: 16 }}>
                                        {settlementsForOrder.map((line: any, i: number) => {
                                            const isPayable = line.direction === 'PAYABLE';
                                            const lineLabel = line.rule?.category
                                                ? `${line.rule.category}${line.rule.subcategory ? ` · ${line.rule.subcategory}` : ''}`
                                                : (isPayable ? 'Payout' : 'Commission');
                                            const lineCategory = getLineCategory(line);
                                            const isHighlighted = highlightCategory != null && lineCategory === highlightCategory;
                                            const hlColor = isHighlighted ? getCategoryColor(highlightCategory, line.direction) : null;
                                            return (
                                                <View key={line.id} style={{
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 11,
                                                    backgroundColor: isHighlighted ? (hlColor + '18') : (i % 2 === 0 ? '#0d1421' : '#0a0f1a'),
                                                    borderLeftWidth: isHighlighted ? 3 : 0,
                                                    borderLeftColor: isHighlighted ? hlColor : 'transparent',
                                                }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isPayable ? '#22c55e' : '#ef4444' }} />
                                                        <Text style={{ fontSize: 13, color: isHighlighted ? '#e2e8f0' : '#6b7280', fontWeight: isHighlighted ? '600' : '400', flex: 1 }} numberOfLines={1}>{lineLabel}</Text>
                                                    </View>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: isPayable ? '#22c55e' : '#ef4444' }}>
                                                        {isPayable ? '+' : '-'}{formatCurrency(Number(line.amount ?? 0))}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                        <View style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            paddingHorizontal: 14,
                                            paddingVertical: 11,
                                            borderTopWidth: 1,
                                            borderTopColor: '#263145',
                                            backgroundColor: '#0d1421',
                                        }}>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Net</Text>
                                            <Text style={{ fontSize: 15, fontWeight: '800', color: netAmount >= 0 ? '#22c55e' : '#ef4444' }}>
                                                {netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount)}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Items */}
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                                        Items
                                    </Text>
                                    <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#263145', marginBottom: 16 }}>
                                        {items.map((item: any, i: number) => (
                                            <View key={item.id ?? i}>
                                                <View style={{
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    padding: 14,
                                                    backgroundColor: i % 2 === 0 ? '#0d1421' : '#0a0f1a',
                                                }}>
                                                    <View style={{ flex: 1, marginRight: 12 }}>
                                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#e2e8f0' }}>
                                                            {item.quantity}× {item.name}
                                                        </Text>
                                                        {item.notes ? (
                                                            <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                                                Note: {item.notes}
                                                            </Text>
                                                        ) : null}
                                                        {(item.selectedOptions ?? []).length > 0 && (
                                                            <View style={{ marginTop: 4, gap: 2 }}>
                                                                {item.selectedOptions.map((opt: any, oi: number) => (
                                                                    <Text key={oi} style={{ fontSize: 11, color: '#6b7280' }}>
                                                                        + {opt.optionGroupName}: {opt.optionName}
                                                                        {opt.priceAtOrder > 0 ? ` (+€${Number(opt.priceAtOrder).toFixed(2)})` : ''}
                                                                    </Text>
                                                                ))}
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                                                        {formatCurrency(Number(item.unitPrice) * Number(item.quantity))}
                                                    </Text>
                                                </View>
                                                {(item.childItems ?? []).map((child: any, ci: number) => (
                                                    <View key={ci} style={{
                                                        flexDirection: 'row',
                                                        justifyContent: 'space-between',
                                                        paddingHorizontal: 14,
                                                        paddingVertical: 6,
                                                        paddingLeft: 28,
                                                        backgroundColor: i % 2 === 0 ? '#0a1020' : '#080d18',
                                                    }}>
                                                        <Text style={{ fontSize: 12, color: '#6b7280' }}>↳ {child.quantity}× {child.name}</Text>
                                                        <Text style={{ fontSize: 12, color: '#6b7280' }}>{formatCurrency(Number(child.unitPrice) * Number(child.quantity))}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        ))}
                                    </View>

                                    {/* Price breakdown */}
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                                        Price Breakdown
                                    </Text>
                                    <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#263145', marginBottom: 16 }}>
                                        {[
                                            { label: 'Items subtotal', value: formatCurrency(grossFromItems), color: '#e2e8f0' },
                                            { label: 'Delivery fee', value: formatCurrency(Number(og.order?.deliveryPrice ?? 0)), color: '#e2e8f0' },
                                            itemDiscounts > 0
                                                ? { label: 'Item discount', value: `−${formatCurrency(itemDiscounts)}`, color: '#22c55e' }
                                                : null,
                                            deliveryDiscounts > 0
                                                ? { label: 'Delivery discount', value: `−${formatCurrency(deliveryDiscounts)}`, color: '#22c55e' }
                                                : null,
                                            { label: 'Order total', value: formatCurrency(Number(og.order?.totalPrice ?? 0)), color: '#fff', bold: true },
                                            { label: 'Platform commission', value: `−${formatCurrency(og.totalReceivable)}`, color: '#f59e0b', bold: false },
                                            { label: 'Net', value: `${netAmount >= 0 ? '+' : ''}${formatCurrency(netAmount)}`, color: netAmount >= 0 ? '#22c55e' : '#ef4444', bold: true },
                                        ].filter(Boolean).map((row: any, i: number) => (
                                            <View key={i} style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                paddingHorizontal: 14,
                                                paddingVertical: 11,
                                                backgroundColor: i % 2 === 0 ? '#0d1421' : '#0a0f1a',
                                                borderTopWidth: row.bold && i > 0 ? 1 : 0,
                                                borderTopColor: '#263145',
                                            }}>
                                                <Text style={{ fontSize: 13, color: '#6b7280' }}>{row.label}</Text>
                                                <Text style={{ fontSize: 13, fontWeight: row.bold ? '700' : '400', color: row.color }}>{row.value}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Discounts section if any */}
                                    {totalDiscounts > 0 && (
                                        <>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                                                Discounts Applied
                                            </Text>
                                            <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#22c55e30', marginBottom: 16, backgroundColor: '#071a0f' }}>
                                                {promotions.map((p: any, i: number) => (
                                                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11 }}>
                                                        <Text style={{ fontSize: 13, color: '#86efac' }}>
                                                            {p.appliesTo === 'DELIVERY' ? '🚚 Delivery discount' : '🏷️ Item discount'}
                                                        </Text>
                                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#22c55e' }}>−{formatCurrency(Number(p.discountAmount))}</Text>
                                                    </View>
                                                ))}
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#22c55e20' }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#22c55e' }}>Total saved</Text>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#22c55e' }}>−{formatCurrency(totalDiscounts)}</Text>
                                                </View>
                                            </View>
                                        </>
                                    )}

                                    {/* Close button */}
                                    <Pressable
                                        onPress={() => { setSelectedSettlementOrder(null); setHighlightCategory(null); }}
                                        style={{
                                            borderRadius: 14,
                                            paddingVertical: 14,
                                            alignItems: 'center',
                                            backgroundColor: '#1a2233',
                                            borderWidth: 1,
                                            borderColor: '#263145',
                                            marginTop: 4,
                                        }}
                                    >
                                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#9ca3af' }}>{t('common.close', 'Close')}</Text>
                                    </Pressable>
                                </ScrollView>
                            );
                        })()}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── Reject Modal ── */}
            <Modal
                visible={disputeModalRequestId !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setDisputeModalRequestId(null)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, justifyContent: 'flex-end' }}
                >
                    <Pressable
                        style={{ flex: 1, backgroundColor: '#00000080' }}
                        onPress={() => setDisputeModalRequestId(null)}
                    />
                    <View
                        style={{
                            backgroundColor: '#111827',
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            padding: 24,
                            paddingBottom: 40,
                            borderTopWidth: 1,
                            borderColor: '#263145',
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 18,
                                fontWeight: '800',
                                color: '#fff',
                                marginBottom: 6,
                            }}
                        >
                            {t('finances.reject', 'Reject')} {t('finances.settlement_requests', 'Settlement Requests')}
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                color: '#6b7280',
                                marginBottom: 18,
                            }}
                        >
                            Optionally explain why you are rejecting this request.
                        </Text>
                        <TextInput
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            placeholder="Reason for rejection (optional)…"
                            placeholderTextColor="#4b5563"
                            multiline
                            numberOfLines={4}
                            style={{
                                borderRadius: 12,
                                paddingHorizontal: 14,
                                paddingVertical: 12,
                                color: '#fff',
                                backgroundColor: '#1a2233',
                                borderWidth: 1,
                                borderColor: '#263145',
                                fontSize: 14,
                                minHeight: 90,
                                textAlignVertical: 'top',
                                marginBottom: 16,
                            }}
                        />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Pressable
                                onPress={() => setDisputeModalRequestId(null)}
                                style={{
                                    flex: 1,
                                    borderRadius: 12,
                                    paddingVertical: 14,
                                    alignItems: 'center',
                                    backgroundColor: '#1a2233',
                                    borderWidth: 1,
                                    borderColor: '#263145',
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: '#9ca3af',
                                    }}
                                >
                                    {t('common.cancel', 'Cancel')}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSubmitReject}
                                disabled={respondingId === disputeModalRequestId}
                                style={{
                                    flex: 1,
                                    borderRadius: 12,
                                    paddingVertical: 14,
                                    alignItems: 'center',
                                    backgroundColor: '#3b0000',
                                    borderWidth: 1,
                                    borderColor: '#ef444440',
                                    opacity:
                                        respondingId === disputeModalRequestId ? 0.6 : 1,
                                }}
                            >
                                {respondingId === disputeModalRequestId ? (
                                    <ActivityIndicator size="small" color="#ef4444" />
                                ) : (
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            fontWeight: '700',
                                            color: '#ef4444',
                                        }}
                                    >
                                        {t('finances.reject', 'Reject')}
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}
