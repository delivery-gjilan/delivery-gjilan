import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client/react';
import { format, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { GET_MY_BUSINESS_SETTLEMENTS, GET_MY_BUSINESS_SETTLEMENT_SUMMARY } from '@/graphql/settlements';
import { useAuthStore } from '@/store/authStore';

type Period = 'week' | 'month' | 'last_month' | 'all';

const PERIODS: { key: Period; label: string }[] = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'last_month', label: 'Last Month' },
    { key: 'all', label: 'All Time' },
];

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

export default function FinancesScreen() {
    const { user } = useAuthStore();
    const [period, setPeriod] = useState<Period>('month');
    const [refreshing, setRefreshing] = useState(false);

    const businessId = user?.businessId ?? '';
    const { startDate, endDate } = getPeriodDates(period);

    const { data: summaryData, loading: summaryLoading, refetch: refetchSummary } = useQuery(
        GET_MY_BUSINESS_SETTLEMENT_SUMMARY,
        {
            variables: { businessId, startDate, endDate },
            skip: !businessId,
            fetchPolicy: 'network-only',
        }
    );

    const { data: settlementsData, loading: settlementsLoading, refetch: refetchSettlements } = useQuery(
        GET_MY_BUSINESS_SETTLEMENTS,
        {
            variables: { businessId, startDate, endDate, limit: 50 },
            skip: !businessId,
            fetchPolicy: 'network-only',
        }
    );

    const summary = (summaryData as any)?.settlementSummary;
    const settlements = (settlementsData as any)?.settlements ?? [];

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchSummary(), refetchSettlements()]);
        setRefreshing(false);
    };

    return (
        <SafeAreaView className="flex-1 bg-[#111827]">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 32 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0b89a9" />}
            >
                {/* Header */}
                <View className="px-4 pt-4 pb-2">
                    <Text className="text-2xl font-bold text-white">Finances</Text>
                    <Text className="text-sm mt-1 text-gray-400">Your revenue & settlement history</Text>
                </View>

                {/* Period Selector */}
                <View className="px-4 mt-2">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {PERIODS.map((p) => (
                            <Pressable
                                key={p.key}
                                className="px-4 py-2 rounded-full"
                                style={{
                                    backgroundColor: period === p.key ? '#0b89a9' : '#1f2937',
                                    borderWidth: 1,
                                    borderColor: period === p.key ? '#0b89a9' : '#374151',
                                }}
                                onPress={() => setPeriod(p.key)}
                            >
                                <Text className="text-sm font-semibold" style={{ color: period === p.key ? '#fff' : '#9ca3af' }}>
                                    {p.label}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* Summary Cards */}
                <View className="px-4 mt-4">
                    {summaryLoading ? (
                        <View className="rounded-3xl p-6 items-center bg-[#1f2937]">
                            <ActivityIndicator color="#0b89a9" />
                        </View>
                    ) : (
                        <>
                            {/* Net revenue highlight */}
                            <View className="rounded-3xl p-6 mb-3 bg-[#0b89a915] border border-[#0b89a940]">
                                <Text className="text-xs font-bold uppercase tracking-wide text-[#0b89a9]">
                                    TOTAL REVENUE
                                </Text>
                                <Text className="text-5xl font-bold mt-2 text-white">
                                    {formatCurrency(summary?.totalAmount ?? 0)}
                                </Text>
                                <Text className="text-sm mt-1 text-gray-400">
                                    {summary?.count ?? 0} {(summary?.count ?? 0) === 1 ? 'settlement' : 'settlements'}
                                </Text>
                            </View>

                            {/* Paid / Pending split */}
                            <View className="flex-row gap-3 mb-3">
                                <View className="flex-1 rounded-2xl p-4 bg-[#1f2937] border border-[#374151]">
                                    <Text className="text-xs font-semibold text-gray-400">PAID</Text>
                                    <Text className="text-2xl font-bold mt-1 text-[#22c55e]">
                                        {formatCurrency(summary?.totalPaid ?? 0)}
                                    </Text>
                                </View>
                                <View className="flex-1 rounded-2xl p-4 bg-[#1f2937] border border-[#374151]">
                                    <Text className="text-xs font-semibold text-gray-400">PENDING</Text>
                                    <Text className="text-2xl font-bold mt-1 text-[#f59e0b]">
                                        {formatCurrency(summary?.totalPending ?? 0)}
                                    </Text>
                                    {(summary?.pendingCount ?? 0) > 0 && (
                                        <Text className="text-xs mt-0.5 text-gray-400">
                                            {summary.pendingCount} unsettled
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Receivable / Payable */}
                            {(summary?.totalReceivable > 0 || summary?.totalPayable > 0) && (
                                <View className="flex-row gap-3">
                                    <View className="flex-1 rounded-2xl p-4 bg-[#1f2937] border border-[#374151]">
                                        <Text className="text-xs font-semibold text-gray-400">RECEIVABLE</Text>
                                        <Text className="text-xl font-bold mt-1 text-[#0b89a9]">
                                            {formatCurrency(summary?.totalReceivable ?? 0)}
                                        </Text>
                                    </View>
                                    <View className="flex-1 rounded-2xl p-4 bg-[#1f2937] border border-[#374151]">
                                        <Text className="text-xs font-semibold text-gray-400">PAYABLE</Text>
                                        <Text className="text-xl font-bold mt-1 text-[#ef4444]">
                                            {formatCurrency(summary?.totalPayable ?? 0)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </View>

                {/* Settlement list */}
                <View className="px-4 mt-6">
                    <Text className="text-sm font-bold mb-3 text-white">Settlements</Text>

                    {settlementsLoading ? (
                        <ActivityIndicator color="#0b89a9" style={{ marginTop: 16 }} />
                    ) : settlements.length === 0 ? (
                        <View className="items-center py-12">
                            <Text className="text-4xl mb-3">💳</Text>
                            <Text className="text-base font-semibold text-white">No settlements yet</Text>
                            <Text className="text-sm mt-1 text-gray-400">Completed orders will appear here.</Text>
                        </View>
                    ) : (
                        <View style={{ gap: 8 }}>
                            {settlements.map((s: any) => {
                                const isPaid = s.status === 'PAID';
                                const isReceivable = s.direction === 'RECEIVABLE';
                                return (
                                    <View
                                        key={s.id}
                                        className="rounded-2xl p-4 bg-[#1f2937] border"
                                        style={{ borderColor: isPaid ? '#22c55e30' : '#f59e0b30' }}
                                    >
                                        <View className="flex-row items-start justify-between">
                                            <View className="flex-1 mr-3">
                                                <Text className="font-semibold text-sm text-white">
                                                    Order #{s.order?.id?.slice(-6) ?? '—'}
                                                </Text>
                                                <Text className="text-xs mt-0.5 text-gray-400">
                                                    {formatDate(s.createdAt)}
                                                </Text>
                                                {s.paymentReference && (
                                                    <Text className="text-xs mt-1 text-gray-500">
                                                        Ref: {s.paymentReference}
                                                    </Text>
                                                )}
                                            </View>
                                            <View className="items-end">
                                                <Text
                                                    className="text-lg font-bold"
                                                    style={{ color: isReceivable ? '#22c55e' : '#ef4444' }}
                                                >
                                                    {isReceivable ? '+' : '-'}{formatCurrency(Number(s.amount))}
                                                </Text>
                                                <View
                                                    className="mt-1 px-2 py-0.5 rounded-full"
                                                    style={{ backgroundColor: isPaid ? '#22c55e20' : '#f59e0b20' }}
                                                >
                                                    <Text
                                                        className="text-[11px] font-bold"
                                                        style={{ color: isPaid ? '#22c55e' : '#f59e0b' }}
                                                    >
                                                        {s.status}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        {s.paidAt && (
                                            <Text className="text-xs mt-2 text-gray-500">
                                                Paid on {formatDate(s.paidAt)}
                                                {s.paymentMethod ? ` via ${s.paymentMethod}` : ''}
                                            </Text>
                                        )}
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
