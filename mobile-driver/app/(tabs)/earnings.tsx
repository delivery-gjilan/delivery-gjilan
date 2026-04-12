import React, { useState, useMemo } from 'react';
import {
    View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl,
    Alert, Modal, KeyboardAvoidingView, Platform, TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useQuery, useMutation } from '@apollo/client/react';
import {
    GET_MY_SETTLEMENTS,
    GET_DRIVER_CASH_SUMMARY,
    GET_SETTLEMENT_BREAKDOWN,
    GET_MY_SETTLEMENT_REQUESTS,
    RESPOND_TO_SETTLEMENT_REQUEST,
} from '@/graphql/operations/driver';
import { format, startOfDay, startOfMonth, startOfWeek, subMonths } from 'date-fns';

type Period = 'today' | 'week' | 'month' | 'last_month' | 'all';

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

    const { data: settlementsData, loading: settlementsLoading, refetch: refetchSettlements } = useQuery(
        GET_MY_SETTLEMENTS,
        { variables: { startDate, endDate, limit: 50 }, fetchPolicy: 'network-only' },
    );

    const { data: requestsData, loading: requestsLoading, refetch: refetchRequests } = useQuery(
        GET_MY_SETTLEMENT_REQUESTS,
        { variables: { status: 'PENDING', limit: 20 }, fetchPolicy: 'network-only' },
    );

    const [respondToRequest] = useMutation(RESPOND_TO_SETTLEMENT_REQUEST);

    const cash = (cashData as any)?.driverCashSummary;
    const breakdownItems: any[] = (breakdownData as any)?.settlementBreakdown ?? [];
    const settlements: any[] = (settlementsData as any)?.settlements ?? [];
    const pendingRequests: any[] = (requestsData as any)?.settlementRequests ?? [];

    // Group settlements by direction for the list
    const groupedSettlements = useMemo(() => {
        const receivable = settlements.filter((s: any) => s.direction === 'RECEIVABLE' && s.status === 'PENDING');
        const payable = settlements.filter((s: any) => s.direction === 'PAYABLE' && s.status === 'PENDING');
        return { receivable, payable };
    }, [settlements]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchCash(), refetchBreakdown(), refetchSettlements(), refetchRequests()]);
        setRefreshing(false);
    };

    // ── Settlement request handlers ──
    const handleAccept = async (requestId: string) => {
        const req = pendingRequests.find((r: any) => r.id === requestId);
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
                        } catch (err: any) {
                            Alert.alert(t.common.error, err?.message ?? 'Failed');
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
        } catch (err: any) {
            Alert.alert(t.common.error, err?.message ?? 'Failed');
        } finally {
            setRespondingId(null);
        }
    };

    const isLoading = cashLoading || breakdownLoading;

    // ── Derived data for the flow explanation ──
    const flowData = useMemo(() => {
        if (!cash) return null;
        // Split breakdown into "you owe" and "you receive"
        const youOweItems = breakdownItems.filter((b: any) => b.direction === "RECEIVABLE");
        const youReceiveItems = breakdownItems.filter((b: any) => b.direction === "PAYABLE");
        return { youOweItems, youReceiveItems };
    }, [cash, breakdownItems]);

    // Category config for icons, colors, and explainers
    const getCategoryConfig = (category: string, direction: string) => {
        const configs: Record<string, { icon: string; color: string; explain: string }> = {
            AUTO_REMITTANCE: {
                icon: "swap-horizontal-outline",
                color: "#ef4444",
                explain: (t.earnings as any).explain_markup ?? "Platform markup on product prices that you collected in cash",
            },
            STOCK_REMITTANCE: {
                icon: "cube-outline",
                color: "#a855f7",
                explain: (t.earnings as any).explain_stock ?? "Products picked up from operator's stock — you didn't buy these",
            },
            DELIVERY_COMMISSION: {
                icon: "bicycle-outline",
                color: direction === "PAYABLE" ? "#22c55e" : "#f59e0b",
                explain: (t.earnings as any).explain_delivery ?? "Commission on delivery fee",
            },
            PLATFORM_COMMISSION: {
                icon: "business-outline",
                color: "#f59e0b",
                explain: (t.earnings as any).explain_platform ?? "Platform commission on order value",
            },
            PROMOTION_COST: {
                icon: "pricetag-outline",
                color: "#f59e0b",
                explain: (t.earnings as any).explain_promo ?? "Promotional adjustment",
            },
            DRIVER_TIP: {
                icon: "heart-outline",
                color: "#22c55e",
                explain: (t.earnings as any).explain_tip ?? "Tips from customers — forwarded to you by the platform",
            },
            CATALOG_REVENUE: {
                icon: "storefront-outline",
                color: "#ef4444",
                explain: (t.earnings as any).explain_catalog ?? "Revenue from catalog products that you collected in cash",
            },
        };
        return configs[category] ?? { icon: "help-circle-outline", color: "#6b7280", explain: "" };
    };

    // Get settlement reason label
    const getSettlementLabel = (s: any) => {
        if (s.direction === "PAYABLE") return (t.earnings as any).platform_owes_you ?? "Platform owes you";
        if (s.reason) {
            // Extract the parenthetical detail: "Stock item remittance (€8.50 items from operator inventory)"
            const match = s.reason.match(/\((.+)\)/);
            if (match) return match[1]; // "€8.50 items from operator inventory"
            return s.reason;
        }
        return s.rule?.name ?? t.earnings.commission;
    };

    // Get settlement type tag
    const getSettlementTag = (s: any) => {
        if (s.direction === "PAYABLE") return { label: (t.earnings as any).you_receive ?? "You receive", color: "#22c55e" };
        if (s.reason?.startsWith("Stock item")) return { label: (t.earnings as any).stock_remittance ?? "Stock Items", color: "#a855f7" };
        if (s.reason?.startsWith("Markup")) return { label: (t.earnings as any).markup ?? "Markup", color: "#ef4444" };
        if (s.reason?.startsWith("Priority")) return { label: (t.earnings as any).priority ?? "Priority Fee", color: "#ef4444" };
        if (s.reason?.startsWith("Driver tip")) return { label: (t.earnings as any).tip_label ?? "Tip", color: "#22c55e" };
        if (s.reason?.startsWith("Catalog product")) return { label: (t.earnings as any).catalog_label ?? "Catalog", color: "#ef4444" };
        if (s.rule?.type === "DELIVERY_PRICE") return { label: (t.earnings as any).delivery_fee ?? "Delivery Fee", color: "#f59e0b" };
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
                                            {(t.earnings as any).step_collected ?? "CASH COLLECTED"}
                                        </Text>
                                        <Text style={[es.flowStepHint, { color: theme.colors.subtext }]}>
                                            {(t.earnings as any).step_collected_hint ?? "Total cash received from customers"}
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
                                                    {(t.earnings as any).step_deductions ?? "DEDUCTIONS"}
                                                </Text>
                                                <Text style={[es.flowStepHint, { color: theme.colors.subtext }]}>
                                                    {(t.earnings as any).step_deductions_hint ?? "Amounts owed back to the platform"}
                                                </Text>
                                            </View>
                                            <Text style={[es.flowSideAmount, { color: "#ef4444" }]}>
                                                -{formatCurrency(cash.youOwePlatform)}
                                            </Text>
                                        </View>

                                        {/* Individual deduction items with explainers */}
                                        <View style={es.deductionList}>
                                            {flowData.youOweItems.map((item: any, idx: number) => {
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
                                                    {(t.earnings as any).step_additions ?? "ADDITIONS"}
                                                </Text>
                                                <Text style={[es.flowStepHint, { color: theme.colors.subtext }]}>
                                                    {(t.earnings as any).step_additions_hint ?? "Amounts the platform owes you"}
                                                </Text>
                                            </View>
                                            <Text style={[es.flowSideAmount, { color: theme.colors.income }]}>
                                                +{formatCurrency(cash.platformOwesYou)}
                                            </Text>
                                        </View>

                                        <View style={es.deductionList}>
                                            {flowData.youReceiveItems.map((item: any, idx: number) => {
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
                                            {(t.earnings as any).take_home ?? "YOUR TAKE-HOME"}
                                        </Text>
                                        <Text style={[es.flowStepHint, { color: theme.colors.subtext }]}>
                                            {(t.earnings as any).take_home_formula ?? "Cash collected minus deductions plus additions"}
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
                                {(t.earnings as any).settlement_requests ?? "Settlement Requests"}
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
                                {pendingRequests.map((req: any) => {
                                    const isResponding = respondingId === req.id;
                                    return (
                                        <View key={req.id} style={es.requestCard}>
                                            <View style={es.requestCardHeader}>
                                                <View>
                                                    <Text style={es.requestAmountLabel}>
                                                        {(t.earnings as any).settlement_requests ?? "Settlement Request"}
                                                    </Text>
                                                    <Text style={es.requestAmount}>{formatCurrency(Number(req.amount ?? 0))}</Text>
                                                </View>
                                                <View style={es.awaitBadge}>
                                                    <Text style={es.awaitBadgeText}>
                                                        {(t.earnings as any).awaiting_response ?? "AWAITING RESPONSE"}
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
                                                            {(t.earnings as any).accept ?? "Accept"}
                                                        </Text>
                                                    )}
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => { setRejectReason(""); setDisputeModalRequestId(req.id); }}
                                                    style={[es.reqActionBtn, { backgroundColor: "#3b0000", borderColor: "#ef444440", opacity: isResponding ? 0.5 : 1 }]}
                                                >
                                                    <Text style={[es.reqActionText, { color: "#ef4444" }]}>
                                                        {(t.earnings as any).reject ?? (t.earnings as any).dispute ?? "Reject"}
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
                        {settlements.length > 0 && (
                            <Text style={[es.sectionCount, { color: theme.colors.subtext }]}>
                                {settlements.length}
                            </Text>
                        )}
                    </View>

                    {settlementsLoading ? (
                        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
                    ) : settlements.length === 0 ? (
                        <View style={es.emptyState}>
                            <Text style={es.emptyEmoji}>💰</Text>
                            <Text style={[es.emptyTitle, { color: theme.colors.text }]}>{t.earnings.no_earnings_title}</Text>
                            <Text style={[es.emptySub, { color: theme.colors.subtext }]}>{t.earnings.no_earnings_sub}</Text>
                        </View>
                    ) : (
                        <View style={{ gap: 10, marginTop: 12 }}>
                            {settlements.map((s: any) => {
                                const businessNames = s.order?.businesses?.map((b: any) => b.business?.name).filter(Boolean).join(", ") ?? "—";
                                const isPaid = s.status === "PAID";
                                const isPayable = s.direction === "PAYABLE";
                                const tag = getSettlementTag(s);
                                const reasonText = getSettlementLabel(s);
                                const amountColor = isPayable ? theme.colors.income : tag.color;

                                return (
                                    <View key={s.id} style={[es.historyCard, {
                                        backgroundColor: theme.colors.card,
                                        borderColor: isPaid ? theme.colors.income + "25" : theme.colors.border,
                                    }]}>
                                        {/* Top row: tag + amount */}
                                        <View style={es.historyTopRow}>
                                            <View style={[es.historyTag, { backgroundColor: tag.color + "18" }]}>
                                                <View style={[es.historyTagDot, { backgroundColor: tag.color }]} />
                                                <Text style={[es.historyTagText, { color: tag.color }]}>{tag.label}</Text>
                                            </View>
                                            <Text style={[es.historyAmount, { color: amountColor }]}>
                                                {isPayable ? "+" : "-"}{formatCurrency(Number(s.amount ?? 0))}
                                            </Text>
                                        </View>

                                        {/* Reason / explanation */}
                                        <Text style={[es.historyReason, { color: theme.colors.text }]} numberOfLines={2}>
                                            {reasonText}
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
                                                    {s.order?.dropOffLocation?.address ?? "—"}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Footer: date + status */}
                                        <View style={es.historyFooter}>
                                            <Text style={[es.historyDate, { color: theme.colors.subtext }]}>
                                                {formatDateTime(s.createdAt)}
                                            </Text>
                                            <View style={[es.historyStatus, {
                                                backgroundColor: isPaid ? theme.colors.income + "18" : "#f59e0b18",
                                            }]}>
                                                <View style={[es.historyStatusDot, {
                                                    backgroundColor: isPaid ? theme.colors.income : "#f59e0b",
                                                }]} />
                                                <Text style={[es.historyStatusText, {
                                                    color: isPaid ? theme.colors.income : "#f59e0b",
                                                }]}>
                                                    {isPaid ? t.earnings.paid : t.earnings.pending}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>

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
                            {(t.earnings as any).reject_title ?? (t.earnings as any).dispute_title ?? "Reject Settlement"}
                        </Text>
                        <TextInput
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            placeholder={(t.earnings as any).reject_placeholder ?? (t.earnings as any).dispute_placeholder ?? "Reason (optional)"}
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
                                        {(t.earnings as any).reject_submit ?? (t.earnings as any).dispute_submit ?? "Submit"}
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
});
