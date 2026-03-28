import React, { useState, useMemo } from 'react';
import {
    View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useQuery } from '@apollo/client/react';
import { GET_MY_SETTLEMENTS, GET_MY_SETTLEMENT_SUMMARY } from '@/graphql/operations/driver';
import { format, startOfMonth, startOfWeek, subMonths } from 'date-fns';

type Period = 'week' | 'month' | 'last_month' | 'all';

function getPeriodDates(period: Period): { startDate?: string; endDate?: string } {
    const now = new Date();
    switch (period) {
        case 'week': {
            const start = startOfWeek(now, { weekStartsOn: 1 });
            const end = new Date(now); end.setHours(23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString() };
        }
        case 'month': {
            const start = startOfMonth(now);
            const end = new Date(now); end.setHours(23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString() };
        }
        case 'last_month': {
            const prevMonth = subMonths(now, 1);
            const start = startOfMonth(prevMonth);
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

export default function EarningsScreen() {
    const theme = useTheme();
    const { t } = useTranslations();
    const [period, setPeriod] = useState<Period>('month');

    const PERIODS: { key: Period; label: string }[] = [
        { key: 'week', label: t.earnings.period_week },
        { key: 'month', label: t.earnings.period_month },
        { key: 'last_month', label: t.earnings.period_last_month },
        { key: 'all', label: t.earnings.period_all },
    ];
    const [refreshing, setRefreshing] = useState(false);

    const { startDate, endDate } = getPeriodDates(period);

    const { data: summaryData, loading: summaryLoading, refetch: refetchSummary } = useQuery(
        GET_MY_SETTLEMENT_SUMMARY,
        { variables: { startDate, endDate }, fetchPolicy: 'network-only' }
    );

    const { data: settlementsData, loading: settlementsLoading, refetch: refetchSettlements } = useQuery(
        GET_MY_SETTLEMENTS,
        { variables: { startDate, endDate, limit: 50 }, fetchPolicy: 'network-only' }
    );

    const summary = (summaryData as any)?.settlementSummary;
    const settlements = (settlementsData as any)?.settlements ?? [];

    const pendingPayable = useMemo(() =>
        settlements
            .filter((s: any) => s.direction === 'PAYABLE' && s.status === 'PENDING')
            .reduce((sum: number, s: any) => sum + Number(s.amount), 0),
        [settlements],
    );
    const pendingReceivable = useMemo(() =>
        settlements
            .filter((s: any) => s.direction === 'RECEIVABLE' && s.status === 'PENDING')
            .reduce((sum: number, s: any) => sum + Number(s.amount), 0),
        [settlements],
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchSummary(), refetchSettlements()]);
        setRefreshing(false);
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 32 }}
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

                {/* Summary Cards */}
                <View className="px-4 mt-4">
                    {summaryLoading ? (
                        <View className="rounded-3xl p-6 items-center" style={{ backgroundColor: theme.colors.card }}>
                            <ActivityIndicator color={theme.colors.primary} />
                        </View>
                    ) : (
                        <>
                            {/* Net earnings highlight */}
                            <View
                                className="rounded-3xl p-6 mb-3"
                                style={{ backgroundColor: theme.colors.income + '20', borderWidth: 1, borderColor: theme.colors.income + '40' }}
                            >
                                <Text className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.colors.income }}>
                                    {t.earnings.net_earnings}
                                </Text>
                                <Text className="text-5xl font-bold mt-2" style={{ color: theme.colors.text }}>
                                    {formatCurrency(summary?.totalAmount ?? 0)}
                                </Text>
                                <Text className="text-sm mt-1" style={{ color: theme.colors.subtext }}>
                                    {summary?.count ?? 0} {(summary?.count ?? 0) === 1 ? t.earnings.delivery : t.earnings.deliveries}
                                </Text>
                            </View>

                            {/* Paid / Pending split */}
                            <View className="flex-row gap-3">
                                <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}>
                                    <Text className="text-xs font-semibold" style={{ color: theme.colors.subtext }}>{t.earnings.paid}</Text>
                                    <Text className="text-2xl font-bold mt-1" style={{ color: theme.colors.income }}>
                                        {formatCurrency(summary?.totalPaid ?? 0)}
                                    </Text>
                                </View>
                                <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}>
                                    <Text className="text-xs font-semibold" style={{ color: theme.colors.subtext }}>{t.earnings.pending}</Text>
                                    <Text className="text-2xl font-bold mt-1" style={{ color: '#f59e0b' }}>
                                        {formatCurrency(summary?.totalPending ?? 0)}
                                    </Text>
                                    {(summary?.pendingCount ?? 0) > 0 && (
                                        <Text className="text-xs mt-0.5" style={{ color: theme.colors.subtext }}>
                                            {summary.pendingCount} {t.earnings.unsettled}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Pending balance direction breakdown */}
                            {(pendingPayable > 0 || pendingReceivable > 0) && (
                                <View
                                    className="mt-3 rounded-2xl p-4"
                                    style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, gap: 10 }}
                                >
                                    <Text className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.colors.subtext }}>
                                        {t.earnings.pending_balance}
                                    </Text>
                                    {pendingPayable > 0 && (
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-row items-center" style={{ gap: 8 }}>
                                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' }} />
                                                <Text className="text-sm" style={{ color: theme.colors.subtext }}>{t.earnings.platform_owes_you}</Text>
                                            </View>
                                            <Text className="font-bold" style={{ color: '#22c55e', fontSize: 15 }}>
                                                {formatCurrency(pendingPayable)}
                                            </Text>
                                        </View>
                                    )}
                                    {pendingReceivable > 0 && (
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-row items-center" style={{ gap: 8 }}>
                                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' }} />
                                                <Text className="text-sm" style={{ color: theme.colors.subtext }}>{t.earnings.you_owe_platform}</Text>
                                            </View>
                                            <Text className="font-bold" style={{ color: '#f59e0b', fontSize: 15 }}>
                                                {formatCurrency(pendingReceivable)}
                                            </Text>
                                        </View>
                                    )}
                                    {pendingPayable > 0 && pendingReceivable > 0 && (
                                        <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8 }}>
                                            <View className="flex-row items-center justify-between">
                                                <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>{t.earnings.net_pending}</Text>
                                                <Text className="font-bold" style={{
                                                    color: pendingPayable >= pendingReceivable ? '#22c55e' : '#f59e0b',
                                                    fontSize: 15,
                                                }}>
                                                    {formatCurrency(Math.abs(pendingPayable - pendingReceivable))}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )}
                        </>
                    )}
                </View>

                {/* Delivery list */}
                <View className="px-4 mt-6">
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
                                const businessNames = s.order?.businesses?.map((b: any) => b.business.name).join(', ') ?? '—';
                                const isPaid = s.status === 'PAID';
                                const isPayable = s.direction === 'PAYABLE';
                                const directionLabel = isPayable ? t.earnings.platform_owes_you : t.earnings.commission;
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
                                                <View style={{ flexDirection: 'row', marginTop: 5 }}>
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
                                                <Text className="text-lg font-bold" style={{ color: theme.colors.income }}>
                                                    {formatCurrency(s.amount)}
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
        </SafeAreaView>
    );
}

