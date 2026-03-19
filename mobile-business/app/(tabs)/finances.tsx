import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client/react';
import { format, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { GET_MY_BUSINESS_SETTLEMENTS, GET_MY_BUSINESS_SETTLEMENT_SUMMARY } from '@/graphql/settlements';
import { useAuthStore } from '@/store/authStore';

type Period = 'week' | 'month' | 'last_month' | 'all';
type StatusFilter = 'ALL' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
type DirectionFilter = 'ALL' | 'RECEIVABLE' | 'PAYABLE';

const PERIODS: { key: Period; label: string }[] = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'last_month', label: 'Last Month' },
    { key: 'all', label: 'All Time' },
];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'PAID', label: 'Paid' },
    { key: 'OVERDUE', label: 'Overdue' },
    { key: 'CANCELLED', label: 'Cancelled' },
];

const DIRECTION_FILTERS: { key: DirectionFilter; label: string }[] = [
    { key: 'ALL', label: 'All flow' },
    { key: 'RECEIVABLE', label: 'Receivable' },
    { key: 'PAYABLE', label: 'Payable' },
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

function formatDateTime(dateStr?: string | null) {
    if (!dateStr) return '—';
    try { return format(new Date(dateStr), 'MMM d, yyyy HH:mm'); } catch { return '—'; }
}

function calculateSettlementCommission(direction: 'RECEIVABLE' | 'PAYABLE', gross: number, amount: number) {
    return direction === 'RECEIVABLE' ? amount : Math.max(0, gross - amount);
}

function calculateSettlementNet(direction: 'RECEIVABLE' | 'PAYABLE', gross: number, amount: number) {
    return direction === 'RECEIVABLE' ? Math.max(0, gross - amount) : amount;
}

export default function FinancesScreen() {
    const { user } = useAuthStore();
    const [period, setPeriod] = useState<Period>('month');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
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
            variables: {
                businessId,
                status: statusFilter === 'ALL' ? undefined : statusFilter,
                direction: directionFilter === 'ALL' ? undefined : directionFilter,
                startDate,
                endDate,
                limit: 50,
            },
            skip: !businessId,
            fetchPolicy: 'network-only',
        }
    );

    const summary = (summaryData as any)?.settlementSummary;
    const settlements = (settlementsData as any)?.settlements ?? [];

    const filteredSettlements = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return settlements;

        return settlements.filter((s: any) => {
            const displayId = String(s?.order?.displayId ?? '').toLowerCase();
            const orderId = String(s?.order?.id ?? '').toLowerCase();
            const shortOrderId = orderId.slice(-6);
            return displayId.includes(query) || orderId.includes(query) || shortOrderId.includes(query);
        });
    }, [searchQuery, settlements]);

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
                    <Text className="text-sm mt-1 text-gray-400">Business settlements and commission breakdown</Text>
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

                {/* Filter controls */}
                <View className="px-4 mt-3" style={{ gap: 10 }}>
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search by order id"
                        placeholderTextColor="#6b7280"
                        className="rounded-xl px-3 py-2 text-white bg-[#1f2937] border border-[#374151]"
                    />

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {STATUS_FILTERS.map((f) => (
                            <Pressable
                                key={f.key}
                                className="px-3 py-2 rounded-full"
                                style={{
                                    backgroundColor: statusFilter === f.key ? '#0b89a9' : '#1f2937',
                                    borderWidth: 1,
                                    borderColor: statusFilter === f.key ? '#0b89a9' : '#374151',
                                }}
                                onPress={() => setStatusFilter(f.key)}
                            >
                                <Text className="text-xs font-semibold" style={{ color: statusFilter === f.key ? '#fff' : '#9ca3af' }}>
                                    {f.label}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {DIRECTION_FILTERS.map((f) => (
                            <Pressable
                                key={f.key}
                                className="px-3 py-2 rounded-full"
                                style={{
                                    backgroundColor: directionFilter === f.key ? '#0b89a9' : '#1f2937',
                                    borderWidth: 1,
                                    borderColor: directionFilter === f.key ? '#0b89a9' : '#374151',
                                }}
                                onPress={() => setDirectionFilter(f.key)}
                            >
                                <Text className="text-xs font-semibold" style={{ color: directionFilter === f.key ? '#fff' : '#9ca3af' }}>
                                    {f.label}
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
                                    TOTAL SETTLEMENT FLOW
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

                {/* Settlement table */}
                <View className="px-4 mt-6">
                    <Text className="text-sm font-bold mb-3 text-white">Settlements</Text>

                    {settlementsLoading ? (
                        <ActivityIndicator color="#0b89a9" style={{ marginTop: 16 }} />
                    ) : filteredSettlements.length === 0 ? (
                        <View className="items-center py-12">
                            <Text className="text-base font-semibold text-white">No settlements yet</Text>
                            <Text className="text-sm mt-1 text-gray-400">Try a different period or filter.</Text>
                        </View>
                    ) : (
                        <View className="rounded-2xl border border-[#374151] overflow-hidden bg-[#111827]">
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View>
                                    <View className="flex-row border-b border-[#374151] bg-[#0f172a]">
                                        <Text className="px-3 py-2 text-[11px] font-semibold text-gray-400" style={{ width: 108 }}>Order</Text>
                                        <Text className="px-3 py-2 text-[11px] font-semibold text-gray-400" style={{ width: 160 }}>Timestamp</Text>
                                        <Text className="px-3 py-2 text-[11px] font-semibold text-gray-400 text-right" style={{ width: 110 }}>Gross</Text>
                                        <Text className="px-3 py-2 text-[11px] font-semibold text-gray-400" style={{ width: 110 }}>Direction</Text>
                                        <Text className="px-3 py-2 text-[11px] font-semibold text-gray-400 text-right" style={{ width: 120 }}>Commission</Text>
                                        <Text className="px-3 py-2 text-[11px] font-semibold text-gray-400 text-right" style={{ width: 110 }}>Net</Text>
                                        <Text className="px-3 py-2 text-[11px] font-semibold text-gray-400" style={{ width: 96 }}>Status</Text>
                                        <Text className="px-3 py-2 text-[11px] font-semibold text-gray-400" style={{ width: 250 }}>Reason</Text>
                                    </View>

                                    {filteredSettlements.map((s: any) => {
                                        const isPaid = s.status === 'PAID';
                                        const isReceivable = s.direction === 'RECEIVABLE';
                                        const businessOrder = (s.order?.businesses ?? []).find(
                                            (entry: any) => entry?.business?.id === businessId
                                        );
                                        const businessItems = businessOrder?.items ?? [];
                                        const grossFromItems = businessItems.reduce(
                                            (sum: number, item: any) => sum + Number(item?.unitPrice ?? 0) * Number(item?.quantity ?? 0),
                                            0
                                        );
                                        const settlementAmount = Number(s.amount ?? 0);
                                        const commissionAmount = calculateSettlementCommission(s.direction, grossFromItems, settlementAmount);
                                        const netAmount = calculateSettlementNet(s.direction, grossFromItems, settlementAmount);

                                        return (
                                            <View key={s.id} className="flex-row border-b border-[#1f2937]" style={{ backgroundColor: '#111827' }}>
                                                <Text className="px-3 py-2 text-xs font-semibold text-white" style={{ width: 108 }}>
                                                    #{s.order?.displayId ?? s.order?.id?.slice(-6) ?? '—'}
                                                </Text>
                                                <Text className="px-3 py-2 text-xs text-gray-400" style={{ width: 160 }}>
                                                    {formatDateTime(s.order?.orderDate ?? s.createdAt)}
                                                </Text>
                                                <Text className="px-3 py-2 text-xs text-gray-200 text-right" style={{ width: 110 }}>
                                                    {formatCurrency(grossFromItems)}
                                                </Text>
                                                <Text className="px-3 py-2 text-xs text-gray-300" style={{ width: 110 }}>
                                                    {s.direction}
                                                </Text>
                                                <Text className="px-3 py-2 text-xs text-[#f59e0b] text-right" style={{ width: 120 }}>
                                                    {formatCurrency(commissionAmount)}
                                                </Text>
                                                <Text className="px-3 py-2 text-xs font-semibold text-[#22c55e] text-right" style={{ width: 110 }}>
                                                    {formatCurrency(netAmount)}
                                                </Text>
                                                <View className="px-3 py-2" style={{ width: 96 }}>
                                                    <View
                                                        className="px-2 py-0.5 rounded-full self-start"
                                                        style={{ backgroundColor: isPaid ? '#22c55e20' : '#f59e0b20' }}
                                                    >
                                                        <Text
                                                            className="text-[10px] font-bold"
                                                            style={{ color: isPaid ? '#22c55e' : '#f59e0b' }}
                                                        >
                                                            {s.status}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text className="px-3 py-2 text-xs text-gray-400" style={{ width: 250 }}>
                                                    {isReceivable
                                                        ? 'Commission due to platform from this order.'
                                                        : 'Payout due to your business for this order.'}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
