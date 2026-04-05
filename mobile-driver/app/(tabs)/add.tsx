import React, { useState, useMemo } from 'react';
import {
    View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl,
    Alert, Modal, KeyboardAvoidingView, Platform, TextInput,
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
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                {/* Header */}
                <View className="px-4 pt-4 pb-2">
                    <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>{t.earnings.title}</Text>
                    <Text className="text-sm mt-1" style={{ color: theme.colors.subtext }}>{t.earnings.subtitle}</Text>
                </View>

                {/* Period Selector */}
                <View className="px-4 mt-2">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {PERIODS.map((p) => (
                            <Pressable
                                key={p.key}
                                className="px-4 py-2 rounded-full"
                                style={{
                                    backgroundColor: period === p.key ? theme.colors.primary : theme.colors.card,
                                    borderWidth: 1,
                                    borderColor: period === p.key ? theme.colors.primary : theme.colors.border,
                                }}
                                onPress={() => setPeriod(p.key)}
                            >
                                <Text className="text-sm font-semibold" style={{ color: period === p.key ? '#fff' : theme.colors.subtext }}>
                                    {p.label}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* ── Cash Summary Cards ── */}
                <View className="px-4 mt-4">
                    {isLoading ? (
                        <View className="rounded-3xl p-8 items-center" style={{ backgroundColor: theme.colors.card }}>
                            <ActivityIndicator color={theme.colors.primary} />
                        </View>
                    ) : cash ? (
                        <>
                            {/* Cash in Hand — hero card */}
                            <View
                                className="rounded-3xl p-6 mb-3"
                                style={{
                                    backgroundColor: theme.colors.primary + '15',
                                    borderWidth: 1,
                                    borderColor: theme.colors.primary + '40',
                                }}
                            >
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-xs font-bold uppercase tracking-wide"
                                        style={{ color: theme.colors.primary }}>
                                        {t.earnings.cash_in_hand}
                                    </Text>
                                    <Ionicons name="cash-outline" size={20} color={theme.colors.primary} />
                                </View>
                                <Text className="text-4xl font-bold mt-2" style={{ color: theme.colors.text }}>
                                    {formatCurrency(cash.cashCollected)}
                                </Text>
                                <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                                    {cash.totalDeliveries} {cash.totalDeliveries === 1 ? t.earnings.delivery : t.earnings.deliveries}
                                    {' · '}{t.earnings.cash_in_hand_sub}
                                </Text>
                            </View>

                            {/* You Owe / Platform Owes — side by side */}
                            <View className="flex-row gap-3 mb-3">
                                {/* You owe platform */}
                                <View
                                    className="flex-1 rounded-2xl p-4"
                                    style={{
                                        backgroundColor: '#1a0a0a',
                                        borderWidth: 1,
                                        borderColor: '#3b1212',
                                    }}
                                >
                                    <View className="flex-row items-center justify-between mb-1">
                                        <Text className="text-[10px] font-bold uppercase tracking-wide"
                                            style={{ color: '#ef4444' }}>
                                            {t.earnings.you_owe}
                                        </Text>
                                    </View>
                                    <Text className="text-2xl font-bold" style={{ color: '#ef4444' }}>
                                        {formatCurrency(cash.youOwePlatform)}
                                    </Text>
                                </View>

                                {/* Platform owes you */}
                                <View
                                    className="flex-1 rounded-2xl p-4"
                                    style={{
                                        backgroundColor: '#071a0f',
                                        borderWidth: 1,
                                        borderColor: '#14532d',
                                    }}
                                >
                                    <View className="flex-row items-center justify-between mb-1">
                                        <Text className="text-[10px] font-bold uppercase tracking-wide"
                                            style={{ color: '#22c55e' }}>
                                            {t.earnings.platform_owes}
                                        </Text>
                                    </View>
                                    <Text className="text-2xl font-bold" style={{ color: '#22c55e' }}>
                                        {formatCurrency(cash.platformOwesYou)}
                                    </Text>
                                </View>
                            </View>

                            {/* Net Settlement — combined card */}
                            <View
                                className="rounded-2xl p-4 mb-3"
                                style={{
                                    backgroundColor: theme.colors.card,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                }}
                            >
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center" style={{ gap: 8 }}>
                                        <Ionicons
                                            name={cash.netSettlement >= 0 ? 'arrow-down-circle' : 'arrow-up-circle'}
                                            size={20}
                                            color={cash.netSettlement >= 0 ? '#22c55e' : '#ef4444'}
                                        />
                                        <View>
                                            <Text className="text-xs font-bold uppercase tracking-wide"
                                                style={{ color: theme.colors.subtext }}>
                                                {t.earnings.net_settlement}
                                            </Text>
                                            <Text className="text-xs mt-0.5" style={{ color: theme.colors.subtext }}>
                                                {cash.netSettlement >= 0
                                                    ? t.earnings.platform_gives_you
                                                    : t.earnings.you_should_give
                                                }
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className="text-xl font-bold"
                                        style={{ color: cash.netSettlement >= 0 ? '#22c55e' : '#ef4444' }}>
                                        {formatCurrency(Math.abs(cash.netSettlement))}
                                    </Text>
                                </View>
                            </View>

                            {/* Take Home — result card */}
                            <View
                                className="rounded-3xl p-6"
                                style={{
                                    backgroundColor: theme.colors.income + '15',
                                    borderWidth: 1,
                                    borderColor: theme.colors.income + '40',
                                }}
                            >
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-xs font-bold uppercase tracking-wide"
                                        style={{ color: theme.colors.income }}>
                                        {t.earnings.take_home}
                                    </Text>
                                    <Ionicons name="wallet-outline" size={20} color={theme.colors.income} />
                                </View>
                                <Text className="text-4xl font-bold mt-2" style={{ color: theme.colors.text }}>
                                    {formatCurrency(cash.takeHome)}
                                </Text>
                                <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                                    {t.earnings.take_home_sub}
                                </Text>
                            </View>
                        </>
                    ) : null}
                </View>

                {/* ── Settlement Breakdown ── */}
                {breakdownItems.length > 0 && (
                    <View className="px-4 mt-5">
                        <Text className="text-sm font-bold mb-3" style={{ color: theme.colors.text }}>
                            {t.earnings.settlement_breakdown}
                        </Text>
                        <View style={{ gap: 8 }}>
                            {breakdownItems.map((item: any, idx: number) => {
                                const isReceivable = item.direction === 'RECEIVABLE';
                                const color = isReceivable ? '#ef4444' : '#22c55e';
                                const icon = isReceivable ? 'arrow-up-outline' : 'arrow-down-outline';
                                return (
                                    <View
                                        key={`${item.category}-${idx}`}
                                        className="rounded-2xl p-4 flex-row items-center justify-between"
                                        style={{
                                            backgroundColor: theme.colors.card,
                                            borderWidth: 1,
                                            borderColor: theme.colors.border,
                                        }}
                                    >
                                        <View className="flex-row items-center flex-1" style={{ gap: 10 }}>
                                            <Ionicons name={icon as any} size={18} color={color} />
                                            <View className="flex-1">
                                                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }} numberOfLines={1}>
                                                    {item.label}
                                                </Text>
                                                <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                                                    {item.count} {item.count === 1 ? t.earnings.delivery : t.earnings.deliveries}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text className="text-base font-bold" style={{ color }}>
                                            {isReceivable ? '-' : '+'}{formatCurrency(item.totalAmount)}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* ── Settlement Requests ── */}
                {(requestsLoading || pendingRequests.length > 0) && (
                    <View className="px-4 mt-5">
                        <View className="flex-row items-center mb-3" style={{ gap: 8 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' }} />
                            <Text className="text-sm font-bold" style={{ color: theme.colors.text }}>
                                {t.earnings.settlement_requests}
                            </Text>
                            {pendingRequests.length > 0 && (
                                <View style={{
                                    backgroundColor: '#f59e0b20',
                                    borderRadius: 999,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderWidth: 1,
                                    borderColor: '#f59e0b40',
                                }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b' }}>
                                        {pendingRequests.length} {t.earnings.pending_requests}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {requestsLoading ? (
                            <ActivityIndicator color="#f59e0b" />
                        ) : (
                            <View style={{ gap: 10 }}>
                                {pendingRequests.map((req: any) => {
                                    const isResponding = respondingId === req.id;
                                    const periodStart = req.periodStart ? format(new Date(req.periodStart), 'MMM d, yyyy') : null;
                                    const periodEnd = req.periodEnd ? format(new Date(req.periodEnd), 'MMM d, yyyy') : null;
                                    const expiresAt = req.expiresAt ? format(new Date(req.expiresAt), 'MMM d, HH:mm') : null;
                                    const requestedBy = req.requestedBy
                                        ? `${req.requestedBy.firstName ?? ''} ${req.requestedBy.lastName ?? ''}`.trim()
                                        : 'Admin';

                                    return (
                                        <View
                                            key={req.id}
                                            className="rounded-2xl p-4"
                                            style={{
                                                backgroundColor: '#1a1500',
                                                borderWidth: 1,
                                                borderColor: '#3d2e00',
                                            }}
                                        >
                                            <View className="flex-row justify-between items-start mb-3">
                                                <View className="flex-1">
                                                    <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: '#f59e0b', textTransform: 'uppercase', marginBottom: 4 }}>
                                                        {t.earnings.settlement_requests}
                                                    </Text>
                                                    <Text style={{ fontSize: 28, fontWeight: '800', color: '#f59e0b' }}>
                                                        {formatCurrency(Number(req.amount ?? 0))}
                                                    </Text>
                                                </View>
                                                <View style={{
                                                    backgroundColor: '#f59e0b20',
                                                    borderRadius: 8,
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 4,
                                                    borderWidth: 1,
                                                    borderColor: '#f59e0b40',
                                                }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#f59e0b' }}>
                                                        {t.earnings.awaiting_response}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={{ gap: 4, marginBottom: 14 }}>
                                                {periodStart && periodEnd && (
                                                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                                                        {periodStart} — {periodEnd}
                                                    </Text>
                                                )}
                                                {req.note ? (
                                                    <Text style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                                                        "{req.note}"
                                                    </Text>
                                                ) : null}
                                                <Text style={{ fontSize: 11, color: '#6b7280' }}>
                                                    {t.earnings.requested_by} {requestedBy}
                                                    {expiresAt ? ` · ${t.earnings.expires} ${expiresAt}` : ''}
                                                </Text>
                                            </View>

                                            <View className="flex-row" style={{ gap: 10 }}>
                                                <Pressable
                                                    onPress={() => handleAccept(req.id)}
                                                    disabled={isResponding}
                                                    className="flex-1 rounded-xl py-3 items-center"
                                                    style={{
                                                        backgroundColor: isResponding ? '#14532d80' : '#14532d',
                                                        borderWidth: 1,
                                                        borderColor: '#22c55e40',
                                                    }}
                                                >
                                                    {isResponding ? (
                                                        <ActivityIndicator size="small" color="#22c55e" />
                                                    ) : (
                                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#22c55e' }}>
                                                            {t.earnings.accept}
                                                        </Text>
                                                    )}
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => {
                                                        setDisputeReason('');
                                                        setDisputeModalRequestId(req.id);
                                                    }}
                                                    className="flex-1 rounded-xl py-3 items-center"
                                                    style={{
                                                        backgroundColor: '#3b0000',
                                                        borderWidth: 1,
                                                        borderColor: '#ef444440',
                                                        opacity: isResponding ? 0.5 : 1,
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444' }}>
                                                        {t.earnings.dispute}
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

                {/* ── Settlement List ── */}
                <View className="px-4 mt-5">
                    <Text className="text-sm font-bold mb-3" style={{ color: theme.colors.text }}>
                        {t.earnings.deliveries_list}
                    </Text>

                    {settlementsLoading ? (
                        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
                    ) : settlements.length === 0 ? (
                        <View className="items-center py-12">
                            <Text className="text-4xl mb-3">💰</Text>
                            <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>{t.earnings.no_earnings_title}</Text>
                            <Text className="text-sm mt-1" style={{ color: theme.colors.subtext }}>{t.earnings.no_earnings_sub}</Text>
                        </View>
                    ) : (
                        <View style={{ gap: 8 }}>
                            {settlements.map((s: any) => {
                                const businessNames = s.order?.businesses?.map((b: any) => b.business?.name).filter(Boolean).join(', ') ?? '—';
                                const isPaid = s.status === 'PAID';
                                const isPayable = s.direction === 'PAYABLE';
                                const directionLabel = isPayable ? t.earnings.platform_owes_you : (s.rule?.name ?? t.earnings.commission);
                                const directionColor = isPayable ? '#22c55e' : '#f59e0b';
                                return (
                                    <View
                                        key={s.id}
                                        className="rounded-2xl p-4"
                                        style={{
                                            backgroundColor: theme.colors.card,
                                            borderWidth: 1,
                                            borderColor: isPaid ? theme.colors.income + '30' : '#f59e0b30',
                                        }}
                                    >
                                        <View className="flex-row items-start justify-between">
                                            <View className="flex-1 mr-3">
                                                <Text className="font-semibold text-sm" style={{ color: theme.colors.text }} numberOfLines={1}>
                                                    {businessNames}
                                                </Text>
                                                <Text className="text-xs mt-0.5" style={{ color: theme.colors.subtext }} numberOfLines={1}>
                                                    📍 {s.order?.dropOffLocation?.address ?? '—'}
                                                </Text>
                                                <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                                                    {formatDate(s.createdAt)}
                                                </Text>
                                                <View style={{ flexDirection: 'row', marginTop: 5, gap: 4, flexWrap: 'wrap' }}>
                                                    <View style={{
                                                        backgroundColor: directionColor + '22',
                                                        borderRadius: 10,
                                                        paddingHorizontal: 7,
                                                        paddingVertical: 2,
                                                    }}>
                                                        <Text style={{ color: directionColor, fontSize: 10, fontWeight: '700' }}>
                                                            {directionLabel}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View className="items-end">
                                                <Text className="text-lg font-bold"
                                                    style={{ color: isPayable ? theme.colors.income : '#f59e0b' }}>
                                                    {isPayable ? '+' : '-'}{formatCurrency(Number(s.amount ?? 0))}
                                                </Text>
                                                <View
                                                    className="mt-1 px-2 py-0.5 rounded-full"
                                                    style={{ backgroundColor: isPaid ? theme.colors.income + '20' : '#f59e0b20' }}
                                                >
                                                    <Text className="text-xs font-semibold" style={{ color: isPaid ? theme.colors.income : '#f59e0b' }}>
                                                        {isPaid ? t.earnings.paid : t.earnings.pending}
                                                    </Text>
                                                </View>
                                                {isPaid && s.paidAt && (
                                                    <Text className="text-xs mt-0.5" style={{ color: theme.colors.subtext }}>
                                                        {t.earnings.paid_on} {formatDate(s.paidAt)}
                                                    </Text>
                                                )}
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
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, justifyContent: 'flex-end' }}
                >
                    <Pressable
                        style={{ flex: 1, backgroundColor: '#00000080' }}
                        onPress={() => setDisputeModalRequestId(null)}
                    />
                    <View style={{
                        backgroundColor: theme.colors.card,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        padding: 24,
                        paddingBottom: 40,
                        borderTopWidth: 1,
                        borderColor: theme.colors.border,
                        gap: 16,
                    }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.text }}>
                            {t.earnings.dispute_title}
                        </Text>
                        <TextInput
                            value={disputeReason}
                            onChangeText={setDisputeReason}
                            placeholder={t.earnings.dispute_placeholder}
                            placeholderTextColor={theme.colors.subtext}
                            multiline
                            numberOfLines={3}
                            style={{
                                borderRadius: 12,
                                paddingHorizontal: 14,
                                paddingVertical: 12,
                                color: theme.colors.text,
                                backgroundColor: theme.colors.background,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                fontSize: 15,
                                minHeight: 80,
                                textAlignVertical: 'top',
                            }}
                        />
                        <View className="flex-row" style={{ gap: 10 }}>
                            <Pressable
                                onPress={() => setDisputeModalRequestId(null)}
                                className="flex-1 rounded-xl py-3.5 items-center"
                                style={{
                                    backgroundColor: theme.colors.background,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                }}
                            >
                                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.subtext }}>
                                    {t.common.cancel}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSubmitDispute}
                                disabled={respondingId !== null}
                                className="flex-[2] rounded-xl py-3.5 items-center"
                                style={{ backgroundColor: '#ef4444' }}
                            >
                                {respondingId ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                                        {t.earnings.dispute_submit}
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

