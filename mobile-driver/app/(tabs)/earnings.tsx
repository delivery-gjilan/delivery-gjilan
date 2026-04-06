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
    const [disputeReason, setDisputeReason] = useState('');
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
        { variables: { status: 'PENDING_APPROVAL', limit: 20 }, fetchPolicy: 'network-only' },
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

    const handleSubmitDispute = async () => {
        if (!disputeModalRequestId) return;
        try {
            setRespondingId(disputeModalRequestId);
            await respondToRequest({
                variables: {
                    requestId: disputeModalRequestId,
                    action: 'DISPUTE',
                    disputeReason: disputeReason.trim() || undefined,
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

                {/* ── Cash summary ── */}
                <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                    {isLoading ? (
                        <View style={[es.loadCard, { backgroundColor: theme.colors.card }]}>
                            <ActivityIndicator color={theme.colors.primary} />
                        </View>
                    ) : cash ? (
                        <>
                            {/* Take home hero */}
                            <View style={[es.heroCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                <View style={es.heroCardHeader}>
                                    <Text style={[es.heroLabel, { color: theme.colors.subtext }]}>{t.earnings.take_home}</Text>
                                    <Ionicons name="wallet-outline" size={18} color={theme.colors.income} />
                                </View>
                                <Text style={[es.heroAmount, { color: theme.colors.text }]}>{formatCurrency(cash.takeHome)}</Text>
                                <Text style={[es.heroSub, { color: theme.colors.subtext }]}>{t.earnings.take_home_sub}</Text>
                            </View>

                            {/* Stat row: cash collected / deliveries */}
                            <View style={es.statRow}>
                                <View style={[es.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                    <Text style={[es.statValue, { color: theme.colors.text }]}>{formatCurrency(cash.cashCollected)}</Text>
                                    <Text style={[es.statLabel, { color: theme.colors.subtext }]}>{t.earnings.cash_in_hand}</Text>
                                    <Text style={[es.statHint, { color: theme.colors.subtext }]}>
                                        {cash.totalDeliveries} {cash.totalDeliveries === 1 ? t.earnings.delivery : t.earnings.deliveries}
                                    </Text>
                                </View>

                                <View style={es.statDividerCol}>
                                    <View style={[es.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginBottom: 10 }]}>
                                        <Text style={[es.statValue, { color: "#ef4444" }]}>{formatCurrency(cash.youOwePlatform)}</Text>
                                        <Text style={[es.statLabel, { color: theme.colors.subtext }]}>{t.earnings.you_owe}</Text>
                                    </View>
                                    <View style={[es.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                        <Text style={[es.statValue, { color: theme.colors.income }]}>{formatCurrency(cash.platformOwesYou)}</Text>
                                        <Text style={[es.statLabel, { color: theme.colors.subtext }]}>{t.earnings.platform_owes}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Net settlement pill */}
                            <View style={[es.netRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                <View style={es.netLeft}>
                                    <Ionicons
                                        name={cash.netSettlement >= 0 ? "arrow-down-circle" : "arrow-up-circle"}
                                        size={20}
                                        color={cash.netSettlement >= 0 ? theme.colors.income : "#ef4444"}
                                    />
                                    <View>
                                        <Text style={[es.netLabel, { color: theme.colors.subtext }]}>{t.earnings.net_settlement}</Text>
                                        <Text style={[es.netHint, { color: theme.colors.subtext }]}>
                                            {cash.netSettlement >= 0 ? t.earnings.platform_gives_you : t.earnings.you_should_give}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[es.netAmount, { color: cash.netSettlement >= 0 ? theme.colors.income : "#ef4444" }]}>
                                    {formatCurrency(Math.abs(cash.netSettlement))}
                                </Text>
                            </View>
                        </>
                    ) : null}
                </View>

                {/* ── Settlement breakdown ── */}
                {breakdownItems.length > 0 && (
                    <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
                        <Text style={[es.listTitle, { color: theme.colors.text }]}>{t.earnings.settlement_breakdown}</Text>
                        <View style={{ gap: 8 }}>
                            {breakdownItems.map((item: any, idx: number) => {
                                const isReceivable = item.direction === "RECEIVABLE";
                                const color = isReceivable ? "#ef4444" : theme.colors.income;
                                return (
                                    <View key={`${item.category}-${idx}`} style={[es.rowCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                        <View style={[es.rowIconWrap, { backgroundColor: color + "18" }]}>
                                            <Ionicons name={isReceivable ? "arrow-up-outline" : "arrow-down-outline"} size={16} color={color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[es.rowCardTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.label}</Text>
                                            <Text style={[es.rowCardSub, { color: theme.colors.subtext }]}>
                                                {item.count} {item.count === 1 ? t.earnings.delivery : t.earnings.deliveries}
                                            </Text>
                                        </View>
                                        <Text style={[es.rowCardAmount, { color }]}>
                                            {isReceivable ? "-" : "+"}{formatCurrency(item.totalAmount)}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* ── Pending settlement requests ── */}
                {(requestsLoading || pendingRequests.length > 0) && (
                    <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
                        <View style={es.listTitleRow}>
                            <View style={[es.listTitleDot, { backgroundColor: "#f59e0b" }]} />
                            <Text style={[es.listTitle, { color: theme.colors.text, marginBottom: 0 }]}>{t.earnings.settlement_requests}</Text>
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
                                    const periodStart = req.periodStart ? format(new Date(req.periodStart), "MMM d, yyyy") : null;
                                    const periodEnd = req.periodEnd ? format(new Date(req.periodEnd), "MMM d, yyyy") : null;
                                    const expiresAt = req.expiresAt ? format(new Date(req.expiresAt), "MMM d, HH:mm") : null;
                                    const requestedBy = req.requestedBy
                                        ? `${req.requestedBy.firstName ?? ""} ${req.requestedBy.lastName ?? ""}`.trim()
                                        : "Admin";
                                    return (
                                        <View key={req.id} style={es.requestCard}>
                                            <View style={es.requestCardHeader}>
                                                <View>
                                                    <Text style={es.requestAmountLabel}>{t.earnings.settlement_requests}</Text>
                                                    <Text style={es.requestAmount}>{formatCurrency(Number(req.amount ?? 0))}</Text>
                                                </View>
                                                <View style={es.awaitBadge}>
                                                    <Text style={es.awaitBadgeText}>{t.earnings.awaiting_response}</Text>
                                                </View>
                                            </View>

                                            <View style={{ gap: 3, marginBottom: 14 }}>
                                                {periodStart && periodEnd && (
                                                    <Text style={es.requestMeta}>{periodStart} — {periodEnd}</Text>
                                                )}
                                                {req.note ? <Text style={es.requestNote}>"{req.note}"</Text> : null}
                                                <Text style={es.requestFooter}>
                                                    {t.earnings.requested_by} {requestedBy}
                                                    {expiresAt ? ` · ${t.earnings.expires} ${expiresAt}` : ""}
                                                </Text>
                                            </View>

                                            <View style={es.requestActions}>
                                                <Pressable
                                                    onPress={() => handleAccept(req.id)}
                                                    disabled={isResponding}
                                                    style={[es.reqActionBtn, { backgroundColor: "#166534", borderColor: "#22c55e40" }]}
                                                >
                                                    {isResponding ? <ActivityIndicator size="small" color="#22c55e" /> : (
                                                        <Text style={[es.reqActionText, { color: "#22c55e" }]}>{t.earnings.accept}</Text>
                                                    )}
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => { setDisputeReason(""); setDisputeModalRequestId(req.id); }}
                                                    style={[es.reqActionBtn, { backgroundColor: "#3b0000", borderColor: "#ef444440", opacity: isResponding ? 0.5 : 1 }]}
                                                >
                                                    <Text style={[es.reqActionText, { color: "#ef4444" }]}>{t.earnings.dispute}</Text>
                                                </Pressable>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                {/* ── Settlements list ── */}
                <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
                    <Text style={[es.listTitle, { color: theme.colors.text }]}>{t.earnings.deliveries_list}</Text>

                    {settlementsLoading ? (
                        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
                    ) : settlements.length === 0 ? (
                        <View style={es.emptyState}>
                            <Text style={es.emptyEmoji}>💰</Text>
                            <Text style={[es.emptyTitle, { color: theme.colors.text }]}>{t.earnings.no_earnings_title}</Text>
                            <Text style={[es.emptySub, { color: theme.colors.subtext }]}>{t.earnings.no_earnings_sub}</Text>
                        </View>
                    ) : (
                        <View style={{ gap: 8 }}>
                            {settlements.map((s: any) => {
                                const businessNames = s.order?.businesses?.map((b: any) => b.business?.name).filter(Boolean).join(", ") ?? "—";
                                const isPaid = s.status === "PAID";
                                const isPayable = s.direction === "PAYABLE";
                                const directionLabel = isPayable ? t.earnings.platform_owes_you : (s.rule?.name ?? t.earnings.commission);
                                const directionColor = isPayable ? theme.colors.income : "#f59e0b";
                                return (
                                    <View key={s.id} style={[es.settlementRow, { backgroundColor: theme.colors.card, borderColor: isPaid ? theme.colors.income + "30" : "#f59e0b30" }]}>
                                        <View style={{ flex: 1, marginRight: 12 }}>
                                            <Text style={[es.settlBiz, { color: theme.colors.text }]} numberOfLines={1}>{businessNames}</Text>
                                            <Text style={[es.settlAddr, { color: theme.colors.subtext }]} numberOfLines={1}>
                                                📍 {s.order?.dropOffLocation?.address ?? "—"}
                                            </Text>
                                            <Text style={[es.settlDate, { color: theme.colors.subtext }]}>{formatDate(s.createdAt)}</Text>
                                            <View style={[es.settlDirectionBadge, { backgroundColor: directionColor + "20" }]}>
                                                <Text style={[es.settlDirectionText, { color: directionColor }]}>{directionLabel}</Text>
                                            </View>
                                        </View>
                                        <View style={{ alignItems: "flex-end" }}>
                                            <Text style={[es.settlAmount, { color: isPayable ? theme.colors.income : "#f59e0b" }]}>
                                                {isPayable ? "+" : "-"}{formatCurrency(Number(s.amount ?? 0))}
                                            </Text>
                                            <View style={[es.settlStatusBadge, { backgroundColor: isPaid ? theme.colors.income + "20" : "#f59e0b20" }]}>
                                                <Text style={[es.settlStatusText, { color: isPaid ? theme.colors.income : "#f59e0b" }]}>
                                                    {isPaid ? t.earnings.paid : t.earnings.pending}
                                                </Text>
                                            </View>
                                            {isPaid && s.paidAt && (
                                                <Text style={[es.settlPaidOn, { color: theme.colors.subtext }]}>
                                                    {t.earnings.paid_on} {formatDate(s.paidAt)}
                                                </Text>
                                            )}
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
                        <Text style={[es.modalTitle, { color: theme.colors.text }]}>{t.earnings.dispute_title}</Text>
                        <TextInput
                            value={disputeReason}
                            onChangeText={setDisputeReason}
                            placeholder={t.earnings.dispute_placeholder}
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
                                onPress={handleSubmitDispute}
                                disabled={respondingId !== null}
                                style={[es.modalSubmitBtn, { opacity: respondingId ? 0.6 : 1 }]}
                            >
                                {respondingId ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={es.modalSubmitText}>{t.earnings.dispute_submit}</Text>
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

    /* hero card */
    heroCard: { borderRadius: 24, padding: 22, marginBottom: 12, borderWidth: 1 },
    heroCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    heroLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2 },
    heroAmount: { fontSize: 44, fontWeight: "900", letterSpacing: -1.5, marginBottom: 4 },
    heroSub: { fontSize: 12 },

    /* stat row */
    statRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
    statCard: {
        flex: 1,
        borderRadius: 18, padding: 16, borderWidth: 1,
    },
    statDividerCol: { flex: 1, gap: 0 },
    statValue: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3, marginBottom: 2 },
    statLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
    statHint: { fontSize: 11, marginTop: 4 },

    /* net settlement */
    netRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 4,
    },
    netLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    netLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
    netHint: { fontSize: 11, marginTop: 1 },
    netAmount: { fontSize: 22, fontWeight: "800" },

    /* list section */
    listTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
    listTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 0 },
    listTitleDot: { width: 8, height: 8, borderRadius: 4 },
    pendingBadge: {
        backgroundColor: "#f59e0b20", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
        borderWidth: 1, borderColor: "#f59e0b40",
    },
    pendingBadgeText: { fontSize: 11, fontWeight: "700", color: "#f59e0b" },

    /* row card (breakdown) */
    rowCard: {
        flexDirection: "row", alignItems: "center", gap: 10,
        borderRadius: 16, padding: 14, borderWidth: 1,
    },
    rowIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    rowCardTitle: { fontSize: 13, fontWeight: "600" },
    rowCardSub: { fontSize: 11, marginTop: 2 },
    rowCardAmount: { fontSize: 15, fontWeight: "700" },

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
    requestMeta: { fontSize: 12, color: "#9ca3af" },
    requestNote: { fontSize: 12, color: "#9ca3af", fontStyle: "italic" },
    requestFooter: { fontSize: 11, color: "#6b7280" },
    requestActions: { flexDirection: "row", gap: 10 },
    reqActionBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
    reqActionText: { fontSize: 13, fontWeight: "700" },

    /* settlement list rows */
    settlementRow: { flexDirection: "row", alignItems: "flex-start", borderRadius: 16, padding: 14, borderWidth: 1 },
    settlBiz: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
    settlAddr: { fontSize: 11, marginBottom: 2 },
    settlDate: { fontSize: 11, marginBottom: 6 },
    settlDirectionBadge: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
    settlDirectionText: { fontSize: 10, fontWeight: "700" },
    settlAmount: { fontSize: 17, fontWeight: "800", marginBottom: 4 },
    settlStatusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 2 },
    settlStatusText: { fontSize: 11, fontWeight: "700" },
    settlPaidOn: { fontSize: 10, marginTop: 2 },

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
