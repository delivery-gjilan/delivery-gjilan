import React, { useState, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl,
    Alert, Modal, KeyboardAvoidingView, Platform, TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import {
    GET_MY_SETTLEMENTS,
    GET_DRIVER_CASH_SUMMARY,
    GET_SETTLEMENT_BREAKDOWN,
    GET_MY_SETTLEMENT_REQUESTS,
    RESPOND_TO_SETTLEMENT_REQUEST,
    GET_DRIVER_ORDER_FINANCIALS,
} from '@/graphql/operations/driver';
import type { GetMySettlementsQuery, GetMyDriverSettlementRequestsQuery, GetSettlementBreakdownQuery } from '@/gql/graphql';
import { format, startOfDay, startOfMonth, startOfWeek, subMonths } from 'date-fns';

type Settlement = GetMySettlementsQuery['settlements'][number];
type BreakdownItem = GetSettlementBreakdownQuery['settlementBreakdown'][number];

type Period = 'today' | 'week' | 'month' | 'last_month' | 'all';

const SETTLEMENT_PAGE_SIZE = 20;

function getPeriodDates(period: Period): { startDate?: string; endDate?: string } {
    const now = new Date();
    const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);
    switch (period) {
        case 'today': {
            return { startDate: startOfDay(now).toISOString(), endDate: endOfToday.toISOString() };
        }
        case 'week': {
            return { startDate: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), endDate: endOfToday.toISOString() };
        }
        case 'month': {
            return { startDate: startOfMonth(now).toISOString(), endDate: endOfToday.toISOString() };
        }
        case 'last_month': {
            const prev = subMonths(now, 1);
            const start = startOfMonth(prev);
            const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString() };
        }
        default:
            return {};
    }
}

function formatCurrency(amount: number) {
    return `€${amount.toFixed(2)}`;
}

function formatDate(dateStr?: string | null) {
    if (!dateStr) return '—';
    try { return format(new Date(dateStr), 'MMM d, yyyy'); } catch { return '—'; }
}

function formatDateTime(dateStr?: string | null) {
    if (!dateStr) return '—';
    try { return format(new Date(dateStr), 'MMM d, HH:mm'); } catch { return '—'; }
}

export default function EarningsScreen() {
    const theme = useTheme();
    const { t } = useTranslations();
    const [period, setPeriod] = useState<Period>('today');
    const [refreshing, setRefreshing] = useState(false);
    const [disputeModalRequestId, setDisputeModalRequestId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [selectedSettlementOrder, setSelectedSettlementOrder] = useState<{ orderId: string; orderDisplayId: string | null; order: Settlement['order']; settlements: Settlement[]; totalReceivable: number; totalPayable: number; latestCreatedAt: string } | null>(null);
    const [allSettlements, setAllSettlements] = useState<Settlement[]>([]);
    const [settlementOffset, setSettlementOffset] = useState(0);
    const [hasMoreSettlements, setHasMoreSettlements] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const PERIODS: { key: Period; label: string }[] = [
        { key: 'today', label: t.earnings.period_today },
        { key: 'week', label: t.earnings.period_week },
        { key: 'month', label: t.earnings.period_month },
        { key: 'last_month', label: t.earnings.period_last_month },
        { key: 'all', label: t.earnings.period_all },
    ];

    const { startDate, endDate } = getPeriodDates(period);

    // ── Queries ──
    const { data: cashData, loading: cashLoading, refetch: refetchCash } = useQuery(
        GET_DRIVER_CASH_SUMMARY,
        { variables: { startDate, endDate }, fetchPolicy: 'network-only' },
    );

    const { data: breakdownData, loading: breakdownLoading, refetch: refetchBreakdown } = useQuery(
        GET_SETTLEMENT_BREAKDOWN,
        { variables: { isSettled: false, startDate, endDate }, fetchPolicy: 'network-only' },
    );

    const { data: settlementsData, loading: settlementsLoading, refetch: refetchSettlements, fetchMore: fetchMoreSettlements } = useQuery(
        GET_MY_SETTLEMENTS,
        {
            variables: { status: 'PENDING', startDate, endDate, limit: SETTLEMENT_PAGE_SIZE, offset: 0 },
            fetchPolicy: 'network-only',
            onCompleted: (data) => {
                const rows = data?.settlements ?? [];
                setAllSettlements(rows);
                setSettlementOffset(rows.length);
                setHasMoreSettlements(rows.length === SETTLEMENT_PAGE_SIZE);
            },
        },
    );

    const { data: requestsData, loading: requestsLoading, refetch: refetchRequests } = useQuery(
        GET_MY_SETTLEMENT_REQUESTS,
        { variables: { status: 'PENDING', limit: 20 }, fetchPolicy: 'network-only' },
    );

    const [respondToRequest] = useMutation(RESPOND_TO_SETTLEMENT_REQUEST);

    const [fetchFinancials, { data: financialsData, loading: financialsLoading }] = useLazyQuery(
        GET_DRIVER_ORDER_FINANCIALS,
        { fetchPolicy: 'network-only' },
    );

    const cash = cashData?.driverCashSummary;
    const breakdownItems = breakdownData?.settlementBreakdown ?? [];
    const settlements = allSettlements;
    const pendingRequests = requestsData?.settlementRequests ?? [];

    // Group settlements by direction for the list
    const groupedSettlements = useMemo(() => {
        const receivable = settlements.filter((s) => s.direction === 'RECEIVABLE' && s.status === 'PENDING');
        const payable = settlements.filter((s) => s.direction === 'PAYABLE' && s.status === 'PENDING');
        return { receivable, payable };
    }, [settlements]);

    const settlementOrders = useMemo(() => {
        const byOrder = new Map<string, { orderId: string; orderDisplayId: string | null; order: Settlement['order']; settlements: Settlement[]; totalReceivable: number; totalPayable: number; latestCreatedAt: string }>();

        settlements.forEach((settlement) => {
            const orderId = String(settlement.order?.id ?? settlement.id);
            const existing = byOrder.get(orderId);
            if (existing) {
                existing.settlements.push(settlement);
                existing.totalReceivable += settlement.direction === 'RECEIVABLE' ? Number(settlement.amount ?? 0) : 0;
                existing.totalPayable += settlement.direction === 'PAYABLE' ? Number(settlement.amount ?? 0) : 0;
                if (new Date(settlement.createdAt).getTime() > new Date(existing.latestCreatedAt).getTime()) {
                    existing.latestCreatedAt = settlement.createdAt;
                }
                return;
            }

            byOrder.set(orderId, {
                orderId,
                orderDisplayId: settlement.order?.displayId ?? null,
                order: settlement.order ?? null,
                settlements: [settlement],
                totalReceivable: settlement.direction === 'RECEIVABLE' ? Number(settlement.amount ?? 0) : 0,
                totalPayable: settlement.direction === 'PAYABLE' ? Number(settlement.amount ?? 0) : 0,
                latestCreatedAt: settlement.createdAt,
            });
        });

        return Array.from(byOrder.values()).sort(
            (a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime(),
        );
    }, [settlements]);

    const handleLoadMoreSettlements = useCallback(async () => {
        if (!hasMoreSettlements || settlementsLoading || loadingMore) return;
        setLoadingMore(true);
        try {
            const result = await fetchMoreSettlements({
                variables: { status: 'PENDING', startDate, endDate, limit: SETTLEMENT_PAGE_SIZE, offset: settlementOffset },
            });
            const rows = result.data?.settlements ?? [];
            setAllSettlements(prev => [...prev, ...rows]);
            setSettlementOffset(prev => prev + rows.length);
            setHasMoreSettlements(rows.length === SETTLEMENT_PAGE_SIZE);
        } finally {
            setLoadingMore(false);
        }
    }, [hasMoreSettlements, settlementsLoading, loadingMore, fetchMoreSettlements, settlementOffset, startDate, endDate]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchCash(), refetchBreakdown(), refetchSettlements(), refetchRequests()]);
        setRefreshing(false);
    };

    // ── Settlement request handlers ──
    const handleAccept = async (requestId: string) => {
        const req = pendingRequests.find((r) => r.id === requestId);
        const amount = Number(req?.amount ?? 0);
        Alert.alert(
            t.earnings.accept_title,
            t.earnings.accept_text.replace('{{amount}}', amount.toFixed(2)),
            [
                { text: t.common.cancel, style: 'cancel' },
                {
                    text: t.earnings.accept,
                    onPress: async () => {
                        try {
                            setRespondingId(requestId);
                            await respondToRequest({ variables: { requestId, action: 'ACCEPT' } });
                            await Promise.all([refetchRequests(), refetchCash(), refetchBreakdown(), refetchSettlements()]);
                        } catch (err: unknown) {
                            Alert.alert(t.common.error, (err as Error)?.message ?? 'Failed');
                        } finally {
                            setRespondingId(null);
                        }
                    },
                },
            ],
        );
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
            Alert.alert(t.common.error, (err as Error)?.message ?? 'Failed');
        } finally {
            setRespondingId(null);
        }
    };

    const isLoading = cashLoading || breakdownLoading;

    // ── Derived data for the flow explanation ──
    const flowData = useMemo(() => {
        if (!cash) return null;
        // Split breakdown into "you owe" and "you receive"
        const youOweItems = breakdownItems.filter((b) => b.direction === "RECEIVABLE");
        const youReceiveItems = breakdownItems.filter((b) => b.direction === "PAYABLE");
        return { youOweItems, youReceiveItems };
    }, [cash, breakdownItems]);

    // Category config for icons, colors, and explainers
    const getCategoryConfig = (category: string, direction: string) => {
        const configs: Record<string, { icon: string; color: string; explain: string }> = {
            AUTO_REMITTANCE: {
                icon: "swap-horizontal-outline",
                color: "#ef4444",
                explain: t.earnings.explain_markup ?? "Platform markup on product prices that you collected in cash",
            },
            STOCK_REMITTANCE: {
                icon: "cube-outline",
                color: "#a855f7",
                explain: t.earnings.explain_stock ?? "Products picked up from operator's stock — you didn't buy these",
            },
            DELIVERY_COMMISSION: {
                icon: "bicycle-outline",
                color: direction === "PAYABLE" ? "#22c55e" : "#f59e0b",
                explain: t.earnings.explain_delivery ?? "Commission on delivery fee",
            },
            PLATFORM_COMMISSION: {
                icon: "business-outline",
                color: "#f59e0b",
                explain: t.earnings.explain_platform ?? "Platform commission on order value",
            },
            PROMOTION_COST: {
                icon: "pricetag-outline",
                color: "#f59e0b",
                explain: t.earnings.explain_promo ?? "Promotional adjustment",
            },
            DRIVER_TIP: {
                icon: "heart-outline",
                color: "#22c55e",
                explain: t.earnings.explain_tip ?? "Tips from customers — forwarded to you by the platform",
            },
            CATALOG_REVENUE: {
                icon: "storefront-outline",
                color: "#ef4444",
                explain: t.earnings.explain_catalog ?? "Revenue from catalog products that you collected in cash",
            },
        };
        return configs[category] ?? { icon: "help-circle-outline", color: "#6b7280", explain: "" };
    };

    // Get settlement reason label
    const getSettlementLabel = (s: Settlement) => {
        if (s.direction === "PAYABLE") return t.earnings.platform_owes_you ?? "Platform owes you";
        if (s.reason) {
            // Extract the parenthetical detail: "Stock item remittance (€8.50 items from operator inventory)"
            const match = s.reason.match(/\((.+)\)/);
            if (match) return match[1]; // "€8.50 items from operator inventory"
            return s.reason;
        }
        return s.rule?.name ?? t.earnings.commission;
    };

    // Get settlement type tag
    const getSettlementTag = (s: Settlement) => {
        if (s.direction === "PAYABLE") return { label: t.earnings.you_receive ?? "You receive", color: "#22c55e" };
        if (s.reason?.startsWith("Stock item")) return { label: t.earnings.stock_remittance ?? "Stock Items", color: "#a855f7" };
        if (s.reason?.startsWith("Markup")) return { label: t.earnings.markup ?? "Markup", color: "#ef4444" };
        if (s.reason?.startsWith("Priority")) return { label: t.earnings.priority ?? "Priority Fee", color: "#ef4444" };
        if (s.reason?.startsWith("Driver tip")) return { label: t.earnings.tip_label ?? "Tip", color: "#22c55e" };
        if (s.reason?.startsWith("Catalog product")) return { label: t.earnings.catalog_label ?? "Catalog", color: "#ef4444" };
        if (s.rule?.type === "DELIVERY_PRICE") return { label: t.earnings.delivery_fee ?? "Delivery Fee", color: "#f59e0b" };
        return { label: t.earnings.commission, color: "#f59e0b" };
    };

    return (
        <SafeAreaView style={[es.safe, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 48 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                {/* ── Page header ── */}
                <View style={es.pageHeader}>
                    <View>
                        <Text style={[es.pageTitle, { color: theme.colors.text }]}>{t.earnings.title}</Text>
                        <Text style={[es.pageSub, { color: theme.colors.subtext }]}>{t.earnings.subtitle}</Text>
                    </View>
                    <View style={[es.headerIcon, { backgroundColor: theme.colors.income + "20" }]}>
                        <Ionicons name="wallet-outline" size={22} color={theme.colors.income} />
                    </View>
                </View>

                {/* ── Period pills ── */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={es.periodRow}
                >
                    {PERIODS.map((p) => {
                        const active = period === p.key;
                        return (
                            <Pressable
                                key={p.key}
                                style={[
                                    es.periodPill,
                                    active
                                        ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                        : { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                                ]}
                                onPress={() => setPeriod(p.key)}
                            >
                                <Text style={[es.periodText, { color: active ? "#fff" : theme.colors.subtext }]}>
                                    {p.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                {/* ── Main content ── */}
                <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                    {isLoading ? (
                        <View style={[es.loadCard, { backgroundColor: theme.colors.card }]}>
                            <ActivityIndicator color={theme.colors.primary} />
                        </View>
                    ) : cash ? (
                        <>
                            {/* ═══════ STEP 1: CASH COLLECTED ═══════ */}
                            <View style={[es.flowCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                <View style={es.flowCardHeader}>
                                    <View style={[es.flowIconWrap, { backgroundColor: "#3b82f620" }]}>
                                        <Ionicons name="cash-outline" size={18} color="#3b82f6" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[es.flowStepLabel, { color: theme.colors.subtext }]}>
                                            {t.earnings.step_collected ?? "CASH COLLECTED"}
                                        </Text>
                                        <Text style={[es.flowStepHint, { color: theme.colors.subtext }]}>
                                            {t.earnings.step_collected_hint ?? "Total cash received from customers"}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[es.flowAmount, { color: theme.colors.text }]}>
                                    {formatCurrency(cash.cashCollected)}
                                </Text>
                                <Text style={[es.flowMeta, { color: theme.colors.subtext }]}>
                                    {cash.totalDeliveries} {cash.totalDeliveries === 1 ? t.earnings.delivery : t.earnings.deliveries}
                                </Text>
                            </View>

                            {/* Flow connector */}
                            <View style={es.flowConnector}>
                                <View style={[es.flowLine, { backgroundColor: theme.colors.border }]} />
                                <Ionicons name="arrow-down" size={16} color={theme.colors.subtext} />
                                <View style={[es.flowLine, { backgroundColor: theme.colors.border }]} />
                            </View>

                            {/* ═══════ STEP 2: DEDUCTIONS (What you owe) ═══════ */}
                            {flowData && flowData.youOweItems.length > 0 && (
                                <>
                                    <View style={[es.flowCard, { backgroundColor: theme.colors.card, borderColor: "#ef444430" }]}>
                                        <View style={es.flowCardHeader}>
                                            <View style={[es.flowIconWrap, { backgroundColor: "#ef444418" }]}>
                                                <Ionicons name="remove-circle-outline" size={18} color="#ef4444" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[es.flowStepLabel, { color: "#ef4444" }]}>
                                                    {t.earnings.step_deductions ?? "DEDUCTIONS"}
                                                </Text>
                                                <Text style={[es.flowStepHint, { color: theme.colors.subtext }]}>
                                                    {t.earnings.step_deductions_hint ?? "Amounts owed back to the platform"}
                                                </Text>
                                            </View>
                                            <Text style={[es.flowSideAmount, { color: "#ef4444" }]}>
                                                -{formatCurrency(cash.youOwePlatform)}
                                            </Text>
                                        </View>

                                        {/* Individual deduction items with explainers */}
                                        <View style={es.deductionList}>
                                            {flowData.youOweItems.map((item, idx: number) => {
                                                const cfg = getCategoryConfig(item.category, item.direction);
                                                return (
                                                    <View key={`${item.category}-${idx}`}>
                                                        <View style={es.deductionRow}>
                                                            <View style={[es.deductionIcon, { backgroundColor: cfg.color + "15" }]}>
                                                                <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={[es.deductionTitle, { color: theme.colors.text }]}>
                                                                    {item.label}
                                                                </Text>
                                                                {cfg.explain ? (
                                                                    <Text style={[es.deductionExplain, { color: theme.colors.subtext }]}>
                                                                        {cfg.explain}
                                                                    </Text>
                                                                ) : null}
                                                                <Text style={[es.deductionMeta, { color: theme.colors.subtext }]}>
                                                                    {item.count} {item.count === 1 ? t.earnings.delivery : t.earnings.deliveries}
                                                                </Text>
                                                            </View>
                                                            <Text style={[es.deductionAmount, { color: cfg.color }]}>
                                                                -{formatCurrency(item.totalAmount)}
                                                            </Text>
                                                        </View>
                                                        {idx < flowData.youOweItems.length - 1 && (
                                                            <View style={[es.deductionSep, { backgroundColor: theme.colors.border }]} />
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* Flow connector */}
                                    <View style={es.flowConnector}>
                                        <View style={[es.flowLine, { backgroundColor: theme.colors.border }]} />
                                        <Ionicons name="arrow-down" size={16} color={theme.colors.subtext} />
                                        <View style={[es.flowLine, { backgroundColor: theme.colors.border }]} />
                                    </View>
                                </>
                            )}

                            {/* ═══════ STEP 2B: ADDITIONS (Platform owes you) ═══════ */}
                            {flowData && flowData.youReceiveItems.length > 0 && (
                                <>
                                    <View style={[es.flowCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.income + "30" }]}>
                                        <View style={es.flowCardHeader}>
                                            <View style={[es.flowIconWrap, { backgroundColor: theme.colors.income + "18" }]}>
                                                <Ionicons name="add-circle-outline" size={18} color={theme.colors.income} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[es.flowStepLabel, { color: theme.colors.income }]}>
                                                    {t.earnings.step_additions ?? "ADDITIONS"}
                                                </Text>
                                                <Text style={[es.flowStepHint, { color: theme.colors.subtext }]}>
                                                    {t.earnings.step_additions_hint ?? "Amounts the platform owes you"}
                                                </Text>
                                            </View>
                                            <Text style={[es.flowSideAmount, { color: theme.colors.income }]}>
                                                +{formatCurrency(cash.platformOwesYou)}
                                            </Text>
                                        </View>

                                        <View style={es.deductionList}>
                                            {flowData.youReceiveItems.map((item, idx: number) => {
                                                const cfg = getCategoryConfig(item.category, item.direction);
                                                return (
                                                    <View key={`${item.category}-${idx}`}>
                                                        <View style={es.deductionRow}>
                                                            <View style={[es.deductionIcon, { backgroundColor: theme.colors.income + "15" }]}>
                                                                <Ionicons name={cfg.icon as any} size={14} color={theme.colors.income} />
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={[es.deductionTitle, { color: theme.colors.text }]}>
                                                                    {item.label}
                                                                </Text>
                                                                <Text style={[es.deductionMeta, { color: theme.colors.subtext }]}>
                                                                    {item.count} {item.count === 1 ? t.earnings.delivery : t.earnings.deliveries}
                                                                </Text>
                                                            </View>
                                                            <Text style={[es.deductionAmount, { color: theme.colors.income }]}>
                                                                +{formatCurrency(item.totalAmount)}
                                                            </Text>
                                                        </View>
                                                        {idx < flowData.youReceiveItems.length - 1 && (
                                                            <View style={[es.deductionSep, { backgroundColor: theme.colors.border }]} />
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* Flow connector */}
                                    <View style={es.flowConnector}>
                                        <View style={[es.flowLine, { backgroundColor: theme.colors.border }]} />
                                        <Ionicons name="arrow-down" size={16} color={theme.colors.subtext} />
                                        <View style={[es.flowLine, { backgroundColor: theme.colors.border }]} />
                                    </View>
                                </>
                            )}

                            {/* ═══════ STEP 3: TAKE HOME (Result) ═══════ */}
                            <View style={[es.takeHomeCard, {
                                backgroundColor: theme.colors.income + "10",
                                borderColor: theme.colors.income + "40",
                            }]}>
                                <View style={es.flowCardHeader}>
                                    <View style={[es.flowIconWrap, { backgroundColor: theme.colors.income + "25" }]}>
                                        <Ionicons name="wallet" size={18} color={theme.colors.income} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[es.flowStepLabel, { color: theme.colors.income }]}>
                                            {t.earnings.take_home ?? "YOUR TAKE-HOME"}
                                        </Text>
                                        <Text style={[es.flowStepHint, { color: theme.colors.subtext }]}>
                                            {t.earnings.take_home_formula ?? "Cash collected minus deductions plus additions"}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[es.takeHomeAmount, { color: theme.colors.income }]}>
                                    {formatCurrency(cash.takeHome)}
                                </Text>

                                {/* Simple formula line */}
                                <View style={[es.formulaRow, { backgroundColor: theme.colors.background + "80" }]}>
                                    <Text style={[es.formulaText, { color: theme.colors.subtext }]}>
                                        {formatCurrency(cash.cashCollected)}
                                        {cash.youOwePlatform > 0 ? ` − ${formatCurrency(cash.youOwePlatform)}` : ""}
                                        {cash.platformOwesYou > 0 ? ` + ${formatCurrency(cash.platformOwesYou)}` : ""}
                                        {" = "}
                                    </Text>
                                    <Text style={[es.formulaResult, { color: theme.colors.income }]}>
                                        {formatCurrency(cash.takeHome)}
                                    </Text>
                                </View>
                            </View>
                        </>
                    ) : null}
                </View>

                {/* ── Pending settlement requests ── */}
                {(requestsLoading || pendingRequests.length > 0) && (
                    <View style={{ paddingHorizontal: 16, marginTop: 28 }}>
                        <View style={es.sectionHeader}>
                            <View style={[es.sectionDot, { backgroundColor: "#f59e0b" }]} />
                            <Text style={[es.sectionTitle, { color: theme.colors.text }]}>
                                {t.earnings.settlement_requests ?? "Settlement Requests"}
                            </Text>
                            {pendingRequests.length > 0 && (
                                <View style={es.pendingBadge}>
                                    <Text style={es.pendingBadgeText}>{pendingRequests.length}</Text>
                                </View>
                            )}
                        </View>

                        {requestsLoading ? (
                            <ActivityIndicator color="#f59e0b" style={{ marginTop: 12 }} />
                        ) : (
                            <View style={{ gap: 10, marginTop: 12 }}>
                                {pendingRequests.map((req) => {
                                    const isResponding = respondingId === req.id;
                                    return (
                                        <View key={req.id} style={es.requestCard}>
                                            <View style={es.requestCardHeader}>
                                                <View>
                                                    <Text style={es.requestAmountLabel}>
                                                        {t.earnings.settlement_requests ?? "Settlement Request"}
                                                    </Text>
                                                    <Text style={es.requestAmount}>{formatCurrency(Number(req.amount ?? 0))}</Text>
                                                </View>
                                                <View style={es.awaitBadge}>
                                                    <Text style={es.awaitBadgeText}>
                                                        {t.earnings.awaiting_response ?? "AWAITING RESPONSE"}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={{ gap: 3, marginBottom: 14 }}>
                                                {req.note ? <Text style={es.requestNote}>"{req.note}"</Text> : null}
                                                <Text style={es.requestFooter}>
                                                    {formatDate(req.createdAt)}
                                                </Text>
                                            </View>

                                            <View style={es.requestActions}>
                                                <Pressable
                                                    onPress={() => handleAccept(req.id)}
                                                    disabled={isResponding}
                                                    style={[es.reqActionBtn, { backgroundColor: "#166534", borderColor: "#22c55e40" }]}
                                                >
                                                    {isResponding ? <ActivityIndicator size="small" color="#22c55e" /> : (
                                                        <Text style={[es.reqActionText, { color: "#22c55e" }]}>
                                                            {t.earnings.accept ?? "Accept"}
                                                        </Text>
                                                    )}
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => { setRejectReason(""); setDisputeModalRequestId(req.id); }}
                                                    style={[es.reqActionBtn, { backgroundColor: "#3b0000", borderColor: "#ef444440", opacity: isResponding ? 0.5 : 1 }]}
                                                >
                                                    <Text style={[es.reqActionText, { color: "#ef4444" }]}>
                                                        {t.earnings.reject ?? t.earnings.dispute ?? "Reject"}
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

                {/* ── Settlement history ── */}
                <View style={{ paddingHorizontal: 16, marginTop: 28 }}>
                    <View style={es.sectionHeader}>
                        <View style={[es.sectionDot, { backgroundColor: theme.colors.primary }]} />
                        <Text style={[es.sectionTitle, { color: theme.colors.text }]}>
                            {t.earnings.deliveries_list}
                        </Text>
                        {settlementOrders.length > 0 && (
                            <Text style={[es.sectionCount, { color: theme.colors.subtext }]}>
                                {settlementOrders.length}
                            </Text>
                        )}
                    </View>

                    {settlementsLoading ? (
                        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
                    ) : settlementOrders.length === 0 ? (
                        <View style={es.emptyState}>
                            <Text style={es.emptyEmoji}>💰</Text>
                            <Text style={[es.emptyTitle, { color: theme.colors.text }]}>{t.earnings.no_earnings_title}</Text>
                            <Text style={[es.emptySub, { color: theme.colors.subtext }]}>{t.earnings.no_earnings_sub}</Text>
                        </View>
                    ) : (
                        <View style={{ gap: 10, marginTop: 12 }}>
                            {settlementOrders.map((orderGroup) => {
                                const settlementsForOrder = orderGroup.settlements;
                                const firstSettlement = settlementsForOrder[0];
                                const businessNames = firstSettlement?.order?.businesses?.map((b) => b.business?.name).filter(Boolean).join(", ") ?? "—";
                                const hasPending = settlementsForOrder.some((s) => s.status !== 'PAID');
                                const netAmount = Number(orderGroup.totalPayable ?? 0) - Number(orderGroup.totalReceivable ?? 0);
                                const amountColor = netAmount >= 0 ? theme.colors.income : '#f59e0b';
                                const orderLabel = orderGroup.orderDisplayId ? `#${orderGroup.orderDisplayId}` : t.earnings.delivery;
                                const lineCount = settlementsForOrder.length;

                                return (
                                    <Pressable
                                        key={orderGroup.orderId}
                                        onPress={() => {
                                            setSelectedSettlementOrder(orderGroup);
                                            if (orderGroup.order?.id) fetchFinancials({ variables: { orderId: orderGroup.order.id } });
                                        }}
                                        style={[es.historyCard, {
                                        backgroundColor: theme.colors.card,
                                        borderColor: hasPending ? theme.colors.border : theme.colors.income + "25",
                                    }]}>
                                        {/* Top row: tag + amount */}
                                        <View style={es.historyTopRow}>
                                            <View style={[es.historyTag, { backgroundColor: theme.colors.primary + "18" }]}>
                                                <View style={[es.historyTagDot, { backgroundColor: theme.colors.primary }]} />
                                                <Text style={[es.historyTagText, { color: theme.colors.primary }]}>{orderLabel}</Text>
                                            </View>
                                            <Text style={[es.historyAmount, { color: amountColor }]}>
                                                {netAmount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netAmount))}
                                            </Text>
                                        </View>

                                        {/* Reason / explanation */}
                                        <Text style={[es.historyReason, { color: theme.colors.text }]} numberOfLines={2}>
                                            {lineCount} settlement line{lineCount === 1 ? '' : 's'}
                                        </Text>

                                        {/* Business & address */}
                                        <View style={es.historyMeta}>
                                            <View style={es.historyMetaRow}>
                                                <Ionicons name="storefront-outline" size={12} color={theme.colors.subtext} />
                                                <Text style={[es.historyMetaText, { color: theme.colors.subtext }]} numberOfLines={1}>
                                                    {businessNames}
                                                </Text>
                                            </View>
                                            <View style={es.historyMetaRow}>
                                                <Ionicons name="location-outline" size={12} color={theme.colors.subtext} />
                                                <Text style={[es.historyMetaText, { color: theme.colors.subtext }]} numberOfLines={1}>
                                                    {orderGroup.order?.dropOffLocation?.address ?? "—"}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Footer: date + status */}
                                        <View style={es.historyFooter}>
                                            <Text style={[es.historyDate, { color: theme.colors.subtext }]}>
                                                {formatDateTime(orderGroup.latestCreatedAt)}
                                            </Text>
                                            <View style={[es.historyStatus, {
                                                backgroundColor: hasPending ? "#f59e0b18" : theme.colors.income + "18",
                                            }]}>
                                                <View style={[es.historyStatusDot, {
                                                    backgroundColor: hasPending ? "#f59e0b" : theme.colors.income,
                                                }]} />
                                                <Text style={[es.historyStatusText, {
                                                    color: hasPending ? "#f59e0b" : theme.colors.income,
                                                }]}>
                                                    {hasPending ? t.earnings.pending : t.earnings.paid}
                                                </Text>
                                            </View>
                                        </View>
                                    </Pressable>
                                );
                            })}

                            {/* Load More */}
                            {hasMoreSettlements && (
                                <Pressable
                                    onPress={handleLoadMoreSettlements}
                                    disabled={loadingMore}
                                    style={[es.loadMoreBtn, {
                                        backgroundColor: theme.colors.card,
                                        borderColor: theme.colors.border,
                                        opacity: loadingMore ? 0.7 : 1,
                                    }]}
                                >
                                    {loadingMore ? (
                                        <ActivityIndicator size="small" color={theme.colors.primary} />
                                    ) : (
                                        <Text style={[es.loadMoreText, { color: theme.colors.primary }]}>
                                            {t.earnings.load_more ?? "Load More"}
                                        </Text>
                                    )}
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* ── Delivery Detail Modal ── */}
            <Modal
                visible={selectedSettlementOrder !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedSettlementOrder(null)}
            >
                <Pressable style={es.modalBackdrop} onPress={() => setSelectedSettlementOrder(null)} />
                <View style={[es.detailModalSheet, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    {selectedSettlementOrder && (() => {
                        const settlementsForOrder = selectedSettlementOrder.settlements ?? [];
                        const fin = financialsData?.driverOrderFinancials;
                        const ord = financialsData?.order;
                        const totalReceivable = settlementsForOrder
                            .filter((line) => line.direction === 'RECEIVABLE')
                            .reduce((sum: number, line) => sum + Number(line.amount ?? 0), 0);
                        const totalPayable = settlementsForOrder
                            .filter((line) => line.direction === 'PAYABLE')
                            .reduce((sum: number, line) => sum + Number(line.amount ?? 0), 0);
                        const netAmount = totalPayable - totalReceivable;
                        const amountColor = netAmount >= 0 ? theme.colors.income : '#f59e0b';
                        const isCash = (fin?.paymentCollection ?? ord?.paymentCollection) === "CASH_TO_DRIVER";

                        return (
                            <>
                                {/* Header */}
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 4 }}>
                                    <View>
                                        <Text style={[es.modalTitle, { color: theme.colors.text }]}>
                                            {t.earnings.delivery_details ?? "Delivery Details"}
                                        </Text>
                                        {(ord?.displayId || selectedSettlementOrder.orderDisplayId) && (
                                            <Text style={{ fontSize: 12, color: theme.colors.subtext, marginTop: 2 }}>
                                                #{ord?.displayId ?? selectedSettlementOrder.orderDisplayId}
                                            </Text>
                                        )}
                                    </View>
                                    <Pressable onPress={() => setSelectedSettlementOrder(null)}>
                                        <Ionicons name="close-circle" size={28} color={theme.colors.subtext} />
                                    </Pressable>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }} contentContainerStyle={{ gap: 12 }}>
                                    {financialsLoading ? (
                                        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 24 }} />
                                    ) : (
                                        <>
                                            {/* ── Settlement summary ── */}
                                            <View style={[es.detailSection, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                                                <View style={es.detailRow}>
                                                    <View style={[es.historyTag, { backgroundColor: theme.colors.primary + "18" }]}>
                                                        <View style={[es.historyTagDot, { backgroundColor: theme.colors.primary }]} />
                                                        <Text style={[es.historyTagText, { color: theme.colors.primary }]}>
                                                            {selectedSettlementOrder.orderDisplayId ? `#${selectedSettlementOrder.orderDisplayId}` : t.earnings.delivery}
                                                        </Text>
                                                    </View>
                                                    <Text style={[es.historyAmount, { color: amountColor }]}>
                                                        {netAmount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netAmount))}
                                                    </Text>
                                                </View>
                                                <View style={es.detailRow}>
                                                    <Text style={[es.detailLabel, { color: theme.colors.subtext }]}>
                                                        {t.earnings.status ?? "Status"}
                                                    </Text>
                                                    <View style={[es.methodBadge, {
                                                        backgroundColor: settlementsForOrder.some((line) => line.status !== 'PAID') ? '#f59e0b18' : theme.colors.income + '18',
                                                    }]}>
                                                        <Text style={[es.methodBadgeText, {
                                                            color: settlementsForOrder.some((line) => line.status !== 'PAID') ? '#f59e0b' : theme.colors.income,
                                                        }]}>
                                                            {settlementsForOrder.some((line) => line.status !== 'PAID') ? t.earnings.pending : t.earnings.paid}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>

                                            {/* ── Settlement breakdown ── */}
                                            <View style={[es.detailSection, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                                                <Text style={[es.detailSectionTitle, { color: theme.colors.text }]}>
                                                    {t.earnings.settlement_breakdown ?? "Settlement Breakdown"}
                                                </Text>
                                                {settlementsForOrder.map((line) => {
                                                    const lineIsPayable = line.direction === 'PAYABLE';
                                                    const lineTag = getSettlementTag(line);
                                                    return (
                                                        <View key={line.id} style={es.detailRow}>
                                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                                                                <View style={[es.historyTagDot, { backgroundColor: lineTag.color }]} />
                                                                <Text style={[es.detailLabel, { color: theme.colors.subtext, flex: 1 }]} numberOfLines={1}>
                                                                    {getSettlementLabel(line)}
                                                                </Text>
                                                            </View>
                                                            <Text style={[es.detailValue, { color: lineIsPayable ? theme.colors.income : lineTag.color, fontWeight: "700" }]}>
                                                                {lineIsPayable ? '+' : '-'}{formatCurrency(Number(line.amount ?? 0))}
                                                            </Text>
                                                        </View>
                                                    );
                                                })}
                                                <View style={[es.detailDivider, { backgroundColor: theme.colors.border }]} />
                                                <View style={es.detailRow}>
                                                    <Text style={[es.detailLabel, { color: theme.colors.text, fontWeight: "700" }]}>
                                                        {t.earnings.net ?? "Net"}
                                                    </Text>
                                                    <Text style={[es.detailValue, { color: amountColor, fontWeight: "800", fontSize: 15 }]}>
                                                        {netAmount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netAmount))}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* ── Order info ── */}
                                            {ord && (
                                                <View style={[es.detailSection, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                                                    <Text style={[es.detailSectionTitle, { color: theme.colors.text }]}>
                                                        {t.earnings.order_info ?? "Order Info"}
                                                    </Text>
                                                    <View style={es.detailRow}>
                                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                                            <Ionicons name="card-outline" size={14} color={theme.colors.subtext} />
                                                            <Text style={[es.detailLabel, { color: theme.colors.subtext }]}>
                                                                {t.earnings.payment_method ?? "Payment"}
                                                            </Text>
                                                        </View>
                                                        <View style={[es.methodBadge, {
                                                            backgroundColor: isCash ? "#f59e0b18" : "#3b82f618",
                                                        }]}>
                                                            <Ionicons
                                                                name={isCash ? "cash-outline" : "card-outline"}
                                                                size={12}
                                                                color={isCash ? "#f59e0b" : "#3b82f6"}
                                                            />
                                                            <Text style={[es.methodBadgeText, {
                                                                color: isCash ? "#f59e0b" : "#3b82f6",
                                                            }]}>
                                                                {isCash
                                                                    ? (t.earnings.cash_payment ?? "Cash")
                                                                    : (t.earnings.prepaid_payment ?? "Prepaid")}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <View style={es.detailRow}>
                                                        <Text style={[es.detailLabel, { color: theme.colors.subtext }]}>
                                                            {t.earnings.order_date ?? "Order date"}
                                                        </Text>
                                                        <Text style={[es.detailValue, { color: theme.colors.text }]}>
                                                            {formatDateTime(ord.orderDate)}
                                                        </Text>
                                                    </View>
                                                    {ord.dropOffLocation?.address && (
                                                        <View style={es.detailRow}>
                                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1 }}>
                                                                <Ionicons name="location-outline" size={14} color={theme.colors.subtext} />
                                                                <Text style={[es.detailValue, { color: theme.colors.subtext, flex: 1 }]} numberOfLines={2}>
                                                                    {ord.dropOffLocation.address}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    )}
                                                    {ord.pickupLocations?.length > 0 && (
                                                        <View style={es.detailRow}>
                                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1 }}>
                                                                <Ionicons name="bag-handle-outline" size={14} color={theme.colors.subtext} />
                                                                <Text style={[es.detailValue, { color: theme.colors.subtext, flex: 1 }]} numberOfLines={2}>
                                                                    {ord.pickupLocations.map((l) => l.address).filter(Boolean).join(" → ")}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    )}
                                                    {ord.driverNotes ? (
                                                        <View style={es.detailRow}>
                                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1 }}>
                                                                <Ionicons name="chatbubble-outline" size={14} color={theme.colors.subtext} />
                                                                <Text style={[es.detailValue, { color: theme.colors.subtext, flex: 1, fontStyle: "italic" }]} numberOfLines={3}>
                                                                    "{ord.driverNotes}"
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            )}

                                            {/* ── Timeline ── */}
                                            {ord && (
                                                <View style={[es.detailSection, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                                                    <Text style={[es.detailSectionTitle, { color: theme.colors.text }]}>
                                                        {t.earnings.timeline ?? "Timeline"}
                                                    </Text>
                                                    {[
                                                        { label: t.earnings.assigned ?? "Assigned", time: ord.driverAssignedAt, icon: "person-outline" },
                                                        { label: t.earnings.preparing ?? "Preparing", time: ord.preparingAt, icon: "restaurant-outline" },
                                                        { label: t.earnings.ready ?? "Ready", time: ord.readyAt, icon: "checkmark-circle-outline" },
                                                        { label: t.earnings.picked_up ?? "Picked up", time: ord.outForDeliveryAt, icon: "bicycle-outline" },
                                                        { label: t.earnings.delivered ?? "Delivered", time: ord.deliveredAt, icon: "checkmark-done-outline" },
                                                    ].filter((step) => step.time).map((step, idx) => (
                                                        <View key={idx} style={es.timelineRow}>
                                                            <View style={[es.timelineDot, { backgroundColor: step.time ? theme.colors.income + "25" : theme.colors.border }]}>
                                                                <Ionicons name={step.icon as any} size={12} color={step.time ? theme.colors.income : theme.colors.subtext} />
                                                            </View>
                                                            <Text style={[es.detailLabel, { color: theme.colors.text, flex: 1 }]}>{step.label}</Text>
                                                            <Text style={[es.detailValue, { color: theme.colors.subtext }]}>
                                                                {formatDateTime(step.time)}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}

                                            {/* ── Items by business ── */}
                                            {ord?.businesses?.map((biz) => (
                                                <View key={biz.business?.id ?? "biz"} style={[es.detailSection, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                                        <Ionicons name="storefront-outline" size={14} color={theme.colors.primary} />
                                                        <Text style={[es.detailSectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>
                                                            {biz.business?.name ?? "Business"}
                                                        </Text>
                                                    </View>
                                                    {biz.items?.map((item) => {
                                                        const itemTotal = item.quantity * item.unitPrice;
                                                        const optionsTotal = (item.selectedOptions ?? []).reduce((s: number, o) => s + (Number(o.priceAtOrder) * item.quantity), 0);
                                                        return (
                                                            <View key={item.id} style={es.itemRow}>
                                                                <View style={{ flex: 1 }}>
                                                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                                        <View style={es.qtyBadge}>
                                                                            <Text style={es.qtyText}>{item.quantity}×</Text>
                                                                        </View>
                                                                        <Text style={[es.itemName, { color: theme.colors.text }]} numberOfLines={1}>
                                                                            {item.name}
                                                                        </Text>
                                                                    </View>
                                                                    {item.selectedOptions?.length > 0 && (
                                                                        <Text style={[es.itemOptions, { color: theme.colors.subtext }]} numberOfLines={2}>
                                                                            {item.selectedOptions.map((o) => o.optionName).join(", ")}
                                                                        </Text>
                                                                    )}
                                                                    {item.notes ? (
                                                                        <Text style={[es.itemNotes, { color: theme.colors.subtext }]} numberOfLines={1}>
                                                                            "{item.notes}"
                                                                        </Text>
                                                                    ) : null}
                                                                    {item.childItems?.length > 0 && item.childItems.map((child) => (
                                                                        <Text key={child.id} style={[es.itemOptions, { color: theme.colors.subtext }]}>
                                                                            + {child.quantity}× {child.name}
                                                                        </Text>
                                                                    ))}
                                                                    {item.inventoryQuantity > 0 && (
                                                                        <View style={es.stockBadge}>
                                                                            <Ionicons name="cube-outline" size={10} color="#a855f7" />
                                                                            <Text style={es.stockText}>
                                                                                {item.inventoryQuantity}/{item.quantity} from stock
                                                                            </Text>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                                <Text style={[es.itemPrice, { color: theme.colors.text }]}>
                                                                    {formatCurrency(itemTotal + optionsTotal)}
                                                                </Text>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            ))}

                                            {/* ── Pricing ── */}
                                            {ord && (
                                                <View style={[es.detailSection, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                                                    <Text style={[es.detailSectionTitle, { color: theme.colors.text }]}>
                                                        {t.earnings.pricing ?? "Pricing"}
                                                    </Text>
                                                    <View style={es.detailRow}>
                                                        <Text style={[es.detailLabel, { color: theme.colors.subtext }]}>
                                                            {t.earnings.items_total ?? "Items"}
                                                        </Text>
                                                        <Text style={[es.detailValue, { color: theme.colors.text }]}>
                                                            {formatCurrency(Number(ord.orderPrice ?? 0))}
                                                        </Text>
                                                    </View>
                                                    <View style={es.detailRow}>
                                                        <Text style={[es.detailLabel, { color: theme.colors.subtext }]}>
                                                            {t.earnings.delivery_fee ?? "Delivery fee"}
                                                        </Text>
                                                        <Text style={[es.detailValue, { color: theme.colors.text }]}>
                                                            {formatCurrency(Number(ord.deliveryPrice ?? 0))}
                                                        </Text>
                                                    </View>
                                                    {Number(ord.prioritySurcharge ?? 0) > 0 && (
                                                        <View style={es.detailRow}>
                                                            <Text style={[es.detailLabel, { color: theme.colors.subtext }]}>
                                                                {t.earnings.priority ?? "Priority fee"}
                                                            </Text>
                                                            <Text style={[es.detailValue, { color: theme.colors.text }]}>
                                                                {formatCurrency(Number(ord.prioritySurcharge))}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    {Number(ord.driverTip ?? 0) > 0 && (
                                                        <View style={es.detailRow}>
                                                            <Text style={[es.detailLabel, { color: "#22c55e" }]}>
                                                                <Ionicons name="heart" size={11} color="#22c55e" /> {t.earnings.tip_label ?? "Tip"}
                                                            </Text>
                                                            <Text style={[es.detailValue, { color: "#22c55e", fontWeight: "600" }]}>
                                                                +{formatCurrency(Number(ord.driverTip))}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    {ord.orderPromotions?.length > 0 && ord.orderPromotions.map((promo, idx: number) => (
                                                        <View key={idx} style={es.detailRow}>
                                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                                <Ionicons name="pricetag-outline" size={12} color="#a855f7" />
                                                                <Text style={[es.detailLabel, { color: "#a855f7" }]}>
                                                                    {promo.promoCode ?? (promo.appliesTo === "DELIVERY" ? "Delivery promo" : "Promo")}
                                                                </Text>
                                                            </View>
                                                            <Text style={[es.detailValue, { color: "#a855f7", fontWeight: "600" }]}>
                                                                -{formatCurrency(Number(promo.discountAmount ?? 0))}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                    <View style={[es.detailDivider, { backgroundColor: theme.colors.border }]} />
                                                    <View style={es.detailRow}>
                                                        <Text style={[es.detailLabel, { color: theme.colors.text, fontWeight: "700" }]}>
                                                            {t.earnings.total ?? "Total"}
                                                        </Text>
                                                        <Text style={[es.detailValue, { color: theme.colors.text, fontWeight: "800", fontSize: 15 }]}>
                                                            {formatCurrency(Number(ord.totalPrice ?? 0))}
                                                        </Text>
                                                    </View>
                                                </View>
                                            )}

                                            {/* ── Your financials ── */}
                                            {fin && (
                                                <View style={[es.detailSection, { backgroundColor: theme.colors.income + "08", borderColor: theme.colors.income + "30" }]}>
                                                    <Text style={[es.detailSectionTitle, { color: theme.colors.income }]}>
                                                        {t.earnings.financial_breakdown ?? "Your Financials"}
                                                    </Text>
                                                    {fin.amountToCollectFromCustomer > 0 && (
                                                        <View style={es.detailRow}>
                                                            <Text style={[es.detailLabel, { color: theme.colors.subtext }]}>
                                                                {t.earnings.collect_from_customer ?? "Collect from customer"}
                                                            </Text>
                                                            <Text style={[es.detailValue, { color: "#3b82f6", fontWeight: "700" }]}>
                                                                {formatCurrency(fin.amountToCollectFromCustomer)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    {fin.amountToRemitToPlatform > 0 && (
                                                        <View style={es.detailRow}>
                                                            <Text style={[es.detailLabel, { color: theme.colors.subtext }]}>
                                                                {t.earnings.remit_to_platform ?? "Remit to platform"}
                                                            </Text>
                                                            <Text style={[es.detailValue, { color: "#ef4444", fontWeight: "700" }]}>
                                                                -{formatCurrency(fin.amountToRemitToPlatform)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    {fin.driverTip > 0 && (
                                                        <View style={es.detailRow}>
                                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                                <Ionicons name="heart" size={12} color="#22c55e" />
                                                                <Text style={[es.detailLabel, { color: "#22c55e" }]}>
                                                                    {t.earnings.tip_included ?? "Tip included"}
                                                                </Text>
                                                            </View>
                                                            <Text style={[es.detailValue, { color: "#22c55e", fontWeight: "700" }]}>
                                                                +{formatCurrency(fin.driverTip)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <View style={[es.detailDivider, { backgroundColor: theme.colors.income + "25" }]} />
                                                    <View style={es.detailRow}>
                                                        <Text style={[es.detailLabel, { color: theme.colors.income, fontWeight: "700" }]}>
                                                            {t.earnings.your_earnings ?? "Your earnings"}
                                                        </Text>
                                                        <Text style={[es.detailValue, { color: theme.colors.income, fontWeight: "900", fontSize: 18 }]}>
                                                            {formatCurrency(fin.driverNetEarnings)}
                                                        </Text>
                                                    </View>
                                                </View>
                                            )}
                                        </>
                                    )}
                                </ScrollView>
                            </>
                        );
                    })()}
                </View>
            </Modal>

            {/* ── Dispute Modal ── */}
            <Modal
                visible={disputeModalRequestId !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setDisputeModalRequestId(null)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1, justifyContent: "flex-end" }}
                >
                    <Pressable style={es.modalBackdrop} onPress={() => setDisputeModalRequestId(null)} />
                    <View style={[es.modalSheet, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <Text style={[es.modalTitle, { color: theme.colors.text }]}>
                            {t.earnings.reject_title ?? t.earnings.dispute_title ?? "Reject Settlement"}
                        </Text>
                        <TextInput
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            placeholder={t.earnings.reject_placeholder ?? t.earnings.dispute_placeholder ?? "Reason (optional)"}
                            placeholderTextColor={theme.colors.subtext}
                            multiline
                            numberOfLines={3}
                            style={[es.modalInput, {
                                color: theme.colors.text,
                                backgroundColor: theme.colors.background,
                                borderColor: theme.colors.border,
                            }]}
                        />
                        <View style={es.modalActions}>
                            <Pressable
                                onPress={() => setDisputeModalRequestId(null)}
                                style={[es.modalCancelBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                            >
                                <Text style={[es.modalCancelText, { color: theme.colors.subtext }]}>{t.common.cancel}</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSubmitReject}
                                disabled={respondingId !== null}
                                style={[es.modalSubmitBtn, { opacity: respondingId ? 0.6 : 1 }]}
                            >
                                {respondingId ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={es.modalSubmitText}>
                                        {t.earnings.reject_submit ?? t.earnings.dispute_submit ?? "Submit"}
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

const es = StyleSheet.create({
    safe: { flex: 1 },

    /* page header */
    pageHeader: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
    },
    pageTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
    pageSub: { fontSize: 13, marginTop: 2 },
    headerIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },

    /* period pills */
    periodRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    periodPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    periodText: { fontSize: 13, fontWeight: "600" },

    /* loading card */
    loadCard: { borderRadius: 20, padding: 40, alignItems: "center" },

    /* ═══ FLOW CARDS ═══ */
    flowCard: {
        borderRadius: 20, padding: 18, borderWidth: 1,
    },
    flowCardHeader: {
        flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6,
    },
    flowIconWrap: {
        width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center",
    },
    flowStepLabel: {
        fontSize: 10, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase",
    },
    flowStepHint: { fontSize: 11, marginTop: 1 },
    flowAmount: { fontSize: 36, fontWeight: "900", letterSpacing: -1.2, marginTop: 4 },
    flowMeta: { fontSize: 12, marginTop: 2 },
    flowSideAmount: { fontSize: 18, fontWeight: "800" },

    /* flow connector (arrow between cards) */
    flowConnector: { alignItems: "center", paddingVertical: 4 },
    flowLine: { width: 1, height: 8 },

    /* deduction list inside flow card */
    deductionList: { marginTop: 14, gap: 0 },
    deductionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10 },
    deductionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 1 },
    deductionTitle: { fontSize: 13, fontWeight: "600" },
    deductionExplain: { fontSize: 11, marginTop: 2, lineHeight: 15 },
    deductionMeta: { fontSize: 11, marginTop: 3 },
    deductionAmount: { fontSize: 14, fontWeight: "700", marginTop: 1 },
    deductionSep: { height: 1, marginLeft: 38 },

    /* take-home card */
    takeHomeCard: { borderRadius: 20, padding: 18, borderWidth: 1.5 },
    takeHomeAmount: { fontSize: 44, fontWeight: "900", letterSpacing: -1.5, marginTop: 4, marginBottom: 4 },

    /* formula row */
    formulaRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginTop: 8,
    },
    formulaText: { fontSize: 12, fontWeight: "500" },
    formulaResult: { fontSize: 13, fontWeight: "800" },

    /* section header */
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 0 },
    sectionDot: { width: 8, height: 8, borderRadius: 4 },
    sectionTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
    sectionCount: { fontSize: 12, fontWeight: "600" },

    /* pending badge */
    pendingBadge: {
        backgroundColor: "#f59e0b20", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
        borderWidth: 1, borderColor: "#f59e0b40",
    },
    pendingBadgeText: { fontSize: 11, fontWeight: "700", color: "#f59e0b" },

    /* settlement request card */
    requestCard: {
        backgroundColor: "rgba(245,158,11,0.06)",
        borderRadius: 20, padding: 18,
        borderWidth: 1, borderColor: "rgba(245,158,11,0.25)",
    },
    requestCardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
    requestAmountLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, color: "#f59e0b", textTransform: "uppercase", marginBottom: 2 },
    requestAmount: { fontSize: 30, fontWeight: "900", color: "#f59e0b" },
    awaitBadge: { backgroundColor: "#f59e0b22", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#f59e0b40" },
    awaitBadgeText: { fontSize: 10, fontWeight: "700", color: "#f59e0b" },
    requestNote: { fontSize: 12, color: "#9ca3af", fontStyle: "italic" },
    requestFooter: { fontSize: 11, color: "#6b7280" },
    requestActions: { flexDirection: "row", gap: 10 },
    reqActionBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
    reqActionText: { fontSize: 13, fontWeight: "700" },

    /* ═══ HISTORY CARDS ═══ */
    historyCard: { borderRadius: 16, padding: 14, borderWidth: 1 },
    historyTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    historyTag: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    historyTagDot: { width: 6, height: 6, borderRadius: 3 },
    historyTagText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
    historyAmount: { fontSize: 17, fontWeight: "800" },
    historyReason: { fontSize: 13, fontWeight: "500", marginBottom: 8 },
    historyMeta: { gap: 3, marginBottom: 8 },
    historyMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    historyMetaText: { fontSize: 11, flex: 1 },
    historyFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    historyDate: { fontSize: 11 },
    historyStatus: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    historyStatusDot: { width: 5, height: 5, borderRadius: 2.5 },
    historyStatusText: { fontSize: 11, fontWeight: "700" },

    /* empty state */
    emptyState: { alignItems: "center", paddingVertical: 48 },
    emptyEmoji: { fontSize: 40, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
    emptySub: { fontSize: 13 },

    /* dispute modal */
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
    modalSheet: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 40,
        borderTopWidth: 1, gap: 16,
    },
    modalTitle: { fontSize: 18, fontWeight: "800" },
    modalInput: {
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        borderWidth: 1, fontSize: 15, minHeight: 80, textAlignVertical: "top",
    },
    modalActions: { flexDirection: "row", gap: 10 },
    modalCancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1 },
    modalCancelText: { fontSize: 14, fontWeight: "600" },
    modalSubmitBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: "#ef4444" },
    modalSubmitText: { fontSize: 14, fontWeight: "700", color: "#fff" },

    /* detail modal */
    detailSection: {
        borderRadius: 14, padding: 14, borderWidth: 1, gap: 10,
    },
    detailSectionTitle: {
        fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2,
    },
    detailRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8,
    },
    detailLabel: { fontSize: 13 },
    detailValue: { fontSize: 13, fontWeight: "500" },
    detailDivider: { height: 1, marginVertical: 2 },
    methodBadge: {
        flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    methodBadgeText: { fontSize: 11, fontWeight: "700" },

    /* detail modal (full height) */
    detailModalSheet: {
        position: "absolute", bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 40,
        borderTopWidth: 1, gap: 12,
        maxHeight: "85%",
    },

    /* timeline */
    timelineRow: {
        flexDirection: "row", alignItems: "center", gap: 8,
    },
    timelineDot: {
        width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center",
    },

    /* items */
    itemRow: {
        flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
        paddingVertical: 6, gap: 8,
    },
    qtyBadge: {
        backgroundColor: "rgba(99,102,241,0.15)", borderRadius: 4,
        paddingHorizontal: 5, paddingVertical: 1,
    },
    qtyText: { fontSize: 11, fontWeight: "700", color: "#6366f1" },
    itemName: { fontSize: 13, fontWeight: "600", flexShrink: 1 },
    itemOptions: { fontSize: 11, marginTop: 2, marginLeft: 30 },
    itemNotes: { fontSize: 11, fontStyle: "italic", marginTop: 2, marginLeft: 30 },
    itemPrice: { fontSize: 13, fontWeight: "600" },
    stockBadge: {
        flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3, marginLeft: 30,
        backgroundColor: "rgba(168,85,247,0.12)", borderRadius: 4,
        paddingHorizontal: 5, paddingVertical: 1, alignSelf: "flex-start",
    },
    stockText: { fontSize: 10, fontWeight: "600", color: "#a855f7" },

    /* load more */
    loadMoreBtn: {
        borderRadius: 14, paddingVertical: 14, alignItems: "center",
        borderWidth: 1, marginTop: 4,
    },
    loadMoreText: { fontSize: 14, fontWeight: "700" },
});
