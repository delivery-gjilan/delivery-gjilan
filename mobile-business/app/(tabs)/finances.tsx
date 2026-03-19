import { useMemo, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client/react';
import { format, startOfDay, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import {
    GET_MY_BUSINESS_SETTLEMENTS,
    GET_MY_BUSINESS_SETTLEMENT_SUMMARY,
    GET_LAST_BUSINESS_PAID_SETTLEMENT,
    GET_MY_SETTLEMENT_REQUESTS,
    RESPOND_TO_SETTLEMENT_REQUEST,
} from '@/graphql/settlements';
import { useAuthStore } from '@/store/authStore';

// ─── Types ──────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'last_month' | 'last_settlement' | 'all';
type DirectionFilter = 'ALL' | 'RECEIVABLE' | 'PAYABLE';

// ─── Constants ───────────────────────────────────────────────────────────────

const DIRECTION_FILTERS: { key: DirectionFilter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'RECEIVABLE', label: 'Owed to Platform' },
    { key: 'PAYABLE', label: 'Payout to Me' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPeriodDates(
    period: Period,
    lastPaidDate: string | null,
): { startDate?: string; endDate?: string } {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    switch (period) {
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
        case 'last_month': {
            const prev = subMonths(now, 1);
            const start = startOfMonth(prev);
            const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString() };
        }
        case 'last_settlement': {
            if (!lastPaidDate) return {};
            return {
                startDate: startOfDay(new Date(lastPaidDate)).toISOString(),
                endDate: endOfToday.toISOString(),
            };
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

function getStatusColor(status: string): string {
    switch (status) {
        case 'PAID':
            return '#22c55e';
        case 'PENDING':
            return '#f59e0b';
        case 'OVERDUE':
            return '#ef4444';
        case 'CANCELLED':
            return '#6b7280';
        default:
            return '#9ca3af';
    }
}

function getStatusBg(status: string): string {
    switch (status) {
        case 'PAID':
            return '#22c55e18';
        case 'PENDING':
            return '#f59e0b18';
        case 'OVERDUE':
            return '#ef444418';
        case 'CANCELLED':
            return '#6b728018';
        default:
            return '#9ca3af18';
    }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FinancesScreen() {
    const { user } = useAuthStore();
    const [period, setPeriod] = useState<Period>('month');
    const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [disputeModalRequestId, setDisputeModalRequestId] = useState<string | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [respondingId, setRespondingId] = useState<string | null>(null);

    const businessId = user?.businessId ?? '';

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
        variables: { businessId, status: 'PENDING_APPROVAL', limit: 20 },
        skip: !businessId,
        fetchPolicy: 'network-only',
    });

    const [respondToRequest] = useMutation(RESPOND_TO_SETTLEMENT_REQUEST);

    const pendingRequests: any[] = (requestsData as any)?.settlementRequests ?? [];

    const lastPaidRaw = (lastPaidData as any)?.settlements?.[0];
    const lastPaidDate: string | null =
        lastPaidRaw?.paidAt ?? lastPaidRaw?.createdAt ?? null;

    const PERIODS: { key: Period; label: string; disabled?: boolean }[] = [
        { key: 'week', label: 'This Week' },
        { key: 'month', label: 'This Month' },
        { key: 'last_month', label: 'Last Month' },
        {
            key: 'last_settlement',
            label: 'From Last Settlement',
            disabled: !lastPaidDate,
        },
        { key: 'all', label: 'All Time' },
    ];

    const { startDate, endDate } = getPeriodDates(period, lastPaidDate);

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
    } = useQuery(GET_MY_BUSINESS_SETTLEMENTS, {
        variables: {
            businessId,

            direction: directionFilter === 'ALL' ? undefined : directionFilter,
            startDate,
            endDate,
            limit: 100,
        },
        skip: !businessId,
        fetchPolicy: 'network-only',
    });

    const summary = (summaryData as any)?.settlementSummary;
    const settlements: any[] = (settlementsData as any)?.settlements ?? [];

    // Compute revenue generated & commission owed from settlement rows
    const computed = useMemo(() => {
        let totalGross = 0;
        let totalCommissionOwed = 0; // RECEIVABLE = business owes platform
        let pendingOwed = 0;         // pending RECEIVABLE still to be paid

        settlements.forEach((s: any) => {
            const businessOrder = (s.order?.businesses ?? []).find(
                (entry: any) => entry?.business?.id === businessId,
            );
            const items = businessOrder?.items ?? [];
            const gross = items.reduce(
                (acc: number, item: any) =>
                    acc + Number(item?.unitPrice ?? 0) * Number(item?.quantity ?? 0),
                0,
            );
            totalGross += gross;

            if (s.direction === 'RECEIVABLE') {
                totalCommissionOwed += Number(s.amount ?? 0);
                if (s.status === 'PENDING' || s.status === 'OVERDUE') {
                    pendingOwed += Number(s.amount ?? 0);
                }
            }
        });

        return { totalGross, totalCommissionOwed, pendingOwed };
    }, [settlements, businessId]);

    const filteredSettlements = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return settlements;
        return settlements.filter((s: any) => {
            const displayId = String(s?.order?.displayId ?? '').toLowerCase();
            const orderId = String(s?.order?.id ?? '').toLowerCase();
            return (
                displayId.includes(query) ||
                orderId.includes(query) ||
                orderId.slice(-6).includes(query)
            );
        });
    }, [searchQuery, settlements]);

    const activePeriodLabel = useMemo(() => {
        if (period === 'last_settlement' && lastPaidDate) {
            return `From ${format(new Date(lastPaidDate), 'MMM d, yyyy')} — Today`;
        }
        return '';
    }, [period, lastPaidDate]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            refetchSummary(),
            refetchSettlements(),
            refetchLastPaid(),
            refetchRequests(),
        ]);
        setRefreshing(false);
    };

    const handleAccept = async (requestId: string) => {
        Alert.alert(
            'Accept Settlement',
            'Accepting will mark all pending commissions for this period as paid. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Accept',
                    style: 'default',
                    onPress: async () => {
                        try {
                            setRespondingId(requestId);
                            await respondToRequest({
                                variables: { requestId, action: 'ACCEPT' },
                            });
                            await refetchRequests();
                            await Promise.all([refetchSummary(), refetchSettlements()]);
                        } catch (err: any) {
                            Alert.alert('Error', err?.message ?? 'Failed to accept request');
                        } finally {
                            setRespondingId(null);
                        }
                    },
                },
            ],
        );
    };

    const handleOpenDisputeModal = (requestId: string) => {
        setDisputeReason('');
        setDisputeModalRequestId(requestId);
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
            Alert.alert('Error', err?.message ?? 'Failed to dispute request');
        } finally {
            setRespondingId(null);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <SafeAreaView className="flex-1 bg-[#0a0f1a]">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#0b89a9"
                    />
                }
            >
                {/* ── Header ── */}
                <View className="px-5 pt-5 pb-3">
                    <Text className="text-2xl font-bold text-white tracking-tight">Finances</Text>
                    <Text className="text-sm mt-0.5 text-gray-500">
                        Revenue, commissions &amp; settlement history
                    </Text>
                </View>

                {/* ── Period Selector ── */}
                <View className="px-5 mt-1">
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
                                    onPress={() => setPeriod(p.key)}
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
                                        borderRadius: 999,
                                        backgroundColor: active ? '#0b89a9' : '#1a2233',
                                        borderWidth: 1,
                                        borderColor: active ? '#0b89a9' : '#263145',
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

                    {/* Active range label for "From Last Settlement" */}
                    {activePeriodLabel !== '' && (
                        <View
                            className="mt-2 rounded-xl px-3 py-2"
                            style={{
                                backgroundColor: '#0b89a912',
                                borderWidth: 1,
                                borderColor: '#0b89a930',
                            }}
                        >
                            <Text className="text-xs text-[#0b89a9] font-semibold">
                                Active range: {activePeriodLabel}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── Summary Cards ── */}
                <View className="px-5 mt-5" style={{ gap: 12 }}>
                    {summaryLoading || settlementsLoading ? (
                        <View
                            className="rounded-3xl p-8 items-center justify-center"
                            style={{ backgroundColor: '#1a2233' }}
                        >
                            <ActivityIndicator color="#0b89a9" />
                            <Text className="text-xs text-gray-500 mt-2">Loading summary…</Text>
                        </View>
                    ) : (
                        <>
                            {/* Revenue Generated — hero card */}
                            <View
                                className="rounded-3xl p-6"
                                style={{
                                    backgroundColor: '#0b89a910',
                                    borderWidth: 1,
                                    borderColor: '#0b89a935',
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 11,
                                        fontWeight: '700',
                                        letterSpacing: 1.2,
                                        color: '#0b89a9',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Revenue Generated
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 44,
                                        fontWeight: '800',
                                        color: '#fff',
                                        marginTop: 6,
                                        lineHeight: 50,
                                    }}
                                >
                                    {formatCurrency(computed.totalGross)}
                                </Text>
                                <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                                    Gross order value across {summary?.count ?? settlements.length}{' '}
                                    {(summary?.count ?? settlements.length) === 1
                                        ? 'settlement'
                                        : 'settlements'}
                                </Text>
                            </View>

                            {/* Owed to Platform + Net Payout row */}
                            <View style={{ flexDirection: 'row', gap: 10 }}>
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
                                        Owed to Platform
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 26,
                                            fontWeight: '800',
                                            color: '#ef4444',
                                            marginTop: 6,
                                        }}
                                    >
                                        {formatCurrency(computed.pendingOwed)}
                                    </Text>
                                    <Text
                                        style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}
                                    >
                                        Unpaid commission
                                    </Text>
                                    {computed.totalCommissionOwed > 0 && (
                                        <Text
                                            style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}
                                        >
                                            {formatCurrency(computed.totalCommissionOwed)} total charged
                                        </Text>
                                    )}
                                </View>

                                {/* Net Payout from Platform */}
                                <View
                                    style={{
                                        flex: 1,
                                        borderRadius: 20,
                                        padding: 18,
                                        backgroundColor: '#0a1a0f',
                                        borderWidth: 1,
                                        borderColor: '#12362a',
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 10,
                                            fontWeight: '700',
                                            letterSpacing: 1,
                                            color: '#22c55e',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        Net Payout
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 26,
                                            fontWeight: '800',
                                            color: '#22c55e',
                                            marginTop: 6,
                                        }}
                                    >
                                        {formatCurrency(summary?.totalPayable ?? 0)}
                                    </Text>
                                    <Text
                                        style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}
                                    >
                                        Platform pays you
                                    </Text>
                                </View>
                            </View>


                        </>
                    )}
                </View>

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
                                Settlement Requests
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
                                        {pendingRequests.length} pending
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
                                    const periodStart = req.periodStart
                                        ? format(new Date(req.periodStart), 'MMM d, yyyy')
                                        : null;
                                    const periodEnd = req.periodEnd
                                        ? format(new Date(req.periodEnd), 'MMM d, yyyy')
                                        : null;
                                    const expiresAt = req.expiresAt
                                        ? format(new Date(req.expiresAt), 'MMM d, yyyy HH:mm')
                                        : null;
                                    const requestedBy = req.requestedBy
                                        ? `${req.requestedBy.firstName ?? ''} ${req.requestedBy.lastName ?? ''}`.trim()
                                        : 'Admin';

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
                                                {periodStart && periodEnd && (
                                                    <Text
                                                        style={{
                                                            fontSize: 12,
                                                            color: '#9ca3af',
                                                        }}
                                                    >
                                                        Period: {periodStart} — {periodEnd}
                                                    </Text>
                                                )}
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
                                                    Requested by {requestedBy}
                                                    {expiresAt ? ` · Expires ${expiresAt}` : ''}
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
                                                            Accept
                                                        </Text>
                                                    )}
                                                </Pressable>
                                                <Pressable
                                                    onPress={() =>
                                                        handleOpenDisputeModal(req.id)
                                                    }
                                                    disabled={isResponding}
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
                                                        Dispute
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

                {/* ── Filters ── */}
                <View className="px-5 mt-6" style={{ gap: 10 }}>
                    <Text
                        style={{
                            fontSize: 11,
                            fontWeight: '700',
                            letterSpacing: 1,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                        }}
                    >
                        Filter settlements
                    </Text>

                    {/* Search */}
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search by order ID…"
                        placeholderTextColor="#4b5563"
                        style={{
                            borderRadius: 12,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            color: '#fff',
                            backgroundColor: '#1a2233',
                            borderWidth: 1,
                            borderColor: '#263145',
                            fontSize: 14,
                        }}
                    />

                    {/* Direction chips */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8 }}
                    >
                        {DIRECTION_FILTERS.map((f) => {
                            const active = directionFilter === f.key;
                            return (
                                <Pressable
                                    key={f.key}
                                    onPress={() => setDirectionFilter(f.key)}
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 7,
                                        borderRadius: 999,
                                        backgroundColor: active ? '#1a0a0a' : '#1a2233',
                                        borderWidth: 1,
                                        borderColor: active ? '#ef4444' : '#263145',
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: '600',
                                            color: active ? '#ef4444' : '#8899aa',
                                        }}
                                    >
                                        {f.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* ── Settlement Table ── */}
                <View className="px-5 mt-6">
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 10,
                        }}
                    >
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                            Settlements
                        </Text>
                        {filteredSettlements.length > 0 && (
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                {filteredSettlements.length} record
                                {filteredSettlements.length !== 1 ? 's' : ''}
                            </Text>
                        )}
                    </View>

                    {settlementsLoading ? (
                        <ActivityIndicator color="#0b89a9" style={{ marginTop: 16 }} />
                    ) : filteredSettlements.length === 0 ? (
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
                                            { label: 'Type', w: 130 },
                                            { label: 'Status', w: 90 },
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

                                    {/* Table rows */}
                                    {filteredSettlements.map((s: any, idx: number) => {
                                        const businessOrder = (s.order?.businesses ?? []).find(
                                            (entry: any) => entry?.business?.id === businessId,
                                        );
                                        const items = businessOrder?.items ?? [];
                                        const grossFromItems = items.reduce(
                                            (acc: number, item: any) =>
                                                acc +
                                                Number(item?.unitPrice ?? 0) *
                                                    Number(item?.quantity ?? 0),
                                            0,
                                        );
                                        const settlementAmount = Number(s.amount ?? 0);
                                        const isReceivable = s.direction === 'RECEIVABLE';

                                        // RECEIVABLE: business owes platform (commission = amount, net = gross - amount)
                                        // PAYABLE: platform pays business (commission = gross - amount, net = amount)
                                        const commissionAmount = isReceivable
                                            ? settlementAmount
                                            : Math.max(0, grossFromItems - settlementAmount);
                                        const netAmount = isReceivable
                                            ? Math.max(0, grossFromItems - settlementAmount)
                                            : settlementAmount;

                                        const rowBg =
                                            idx % 2 === 0 ? '#0d1421' : '#0a0f1a';
                                        const statusColor = getStatusColor(s.status);
                                        const statusBg = getStatusBg(s.status);

                                        return (
                                            <View
                                                key={s.id}
                                                style={{
                                                    flexDirection: 'row',
                                                    borderBottomWidth: 1,
                                                    borderBottomColor: '#1a2233',
                                                    backgroundColor: rowBg,
                                                }}
                                            >
                                                {/* Order */}
                                                <Text
                                                    style={{
                                                        width: 100,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 12,
                                                        fontSize: 12,
                                                        fontWeight: '700',
                                                        color: '#fff',
                                                    }}
                                                >
                                                    #
                                                    {s.order?.displayId ??
                                                        s.order?.id?.slice(-6) ??
                                                        '—'}
                                                </Text>

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
                                                        s.order?.orderDate ?? s.createdAt,
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
                                                    {formatCurrency(grossFromItems)}
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
                                                    {formatCurrency(commissionAmount)}
                                                </Text>

                                                {/* Net */}
                                                <Text
                                                    style={{
                                                        width: 100,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 12,
                                                        fontSize: 12,
                                                        fontWeight: '700',
                                                        color: '#22c55e',
                                                        textAlign: 'right',
                                                    }}
                                                >
                                                    {formatCurrency(netAmount)}
                                                </Text>

                                                {/* Type badge */}
                                                <View
                                                    style={{
                                                        width: 130,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 12,
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            paddingHorizontal: 8,
                                                            paddingVertical: 3,
                                                            borderRadius: 6,
                                                            backgroundColor: isReceivable
                                                                ? '#ef444418'
                                                                : '#22c55e18',
                                                            alignSelf: 'flex-start',
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                fontSize: 10,
                                                                fontWeight: '700',
                                                                color: isReceivable
                                                                    ? '#ef4444'
                                                                    : '#22c55e',
                                                            }}
                                                        >
                                                            {isReceivable
                                                                ? 'OWES PLATFORM'
                                                                : 'PAYOUT TO ME'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* Status badge */}
                                                <View
                                                    style={{
                                                        width: 90,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 12,
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            paddingHorizontal: 7,
                                                            paddingVertical: 3,
                                                            borderRadius: 6,
                                                            backgroundColor: statusBg,
                                                            alignSelf: 'flex-start',
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                fontSize: 10,
                                                                fontWeight: '700',
                                                                color: statusColor,
                                                            }}
                                                        >
                                                            {s.status}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>
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
                            Dispute Settlement Request
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                color: '#6b7280',
                                marginBottom: 18,
                            }}
                        >
                            Optionally explain why you are disputing this request.
                        </Text>
                        <TextInput
                            value={disputeReason}
                            onChangeText={setDisputeReason}
                            placeholder="Reason for dispute (optional)…"
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
                                    Cancel
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSubmitDispute}
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
                                        Submit Dispute
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
