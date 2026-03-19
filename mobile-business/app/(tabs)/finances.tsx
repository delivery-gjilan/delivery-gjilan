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
import { format, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import {
    GET_MY_BUSINESS_SETTLEMENTS,
    GET_MY_BUSINESS_SETTLEMENT_SUMMARY,
    GET_LAST_BUSINESS_PAID_SETTLEMENT,
    GET_MY_SETTLEMENT_REQUESTS,
    RESPOND_TO_SETTLEMENT_REQUEST,
} from '@/graphql/settlements';
import { useAuthStore } from '@/store/authStore';

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


// ─── Component ───────────────────────────────────────────────────────────────

export default function FinancesScreen() {
    const { user } = useAuthStore();
    const [period, setPeriod] = useState<Period>('month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [customModalOpen, setCustomModalOpen] = useState(false);
    const [customStartInput, setCustomStartInput] = useState('');
    const [customEndInput, setCustomEndInput] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [disputeModalRequestId, setDisputeModalRequestId] = useState<string | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [selectedSettlement, setSelectedSettlement] = useState<any | null>(null);

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
        { key: 'last_settlement', label: 'From Last Settlement', disabled: !lastPaidDate },
        { key: 'today', label: 'Today' },
        { key: 'week', label: 'This Week' },
        { key: 'month', label: 'This Month' },
        { key: 'custom', label: customStart && customEnd ? `${customStart} – ${customEnd}` : 'Custom Range' },
        { key: 'all', label: 'All Time' },
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
    } = useQuery(GET_MY_BUSINESS_SETTLEMENTS, {
        variables: {
            businessId,
            startDate,
            endDate,
            limit: 500,
        },
        skip: !businessId,
        fetchPolicy: 'network-only',
    });

    const summary = (summaryData as any)?.settlementSummary;
    const settlements: any[] = (settlementsData as any)?.settlements ?? [];

    // Compute revenue generated & commission owed from settlement rows
    const computed = useMemo(() => {
        let totalGross = 0;
        let pendingOwed = 0;
        let hasPartiallyPaid = false;

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

    const totalPages = Math.max(1, Math.ceil(filteredSettlements.length / PAGE_SIZE));

    const paginatedSettlements = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredSettlements.slice(start, start + PAGE_SIZE);
    }, [filteredSettlements, currentPage]);

    const onRefresh = async () => {
        setRefreshing(true);
        setCurrentPage(1);
        await Promise.all([
            refetchSummary(),
            refetchSettlements(),
            refetchLastPaid(),
            refetchRequests(),
        ]);
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
        setCurrentPage(1);
    };

    const handleApplyCustomRange = () => {
        const s = parseCustomDate(customStartInput);
        const e = parseCustomDate(customEndInput);
        if (!s || !e) {
            Alert.alert('Invalid date', 'Please enter dates in DD/MM/YYYY format.');
            return;
        }
        if (s > e) {
            Alert.alert('Invalid range', 'Start date must be before end date.');
            return;
        }
        setCustomStart(customStartInput);
        setCustomEnd(customEndInput);
        setPeriod('custom');
        setCurrentPage(1);
        setCustomModalOpen(false);
    };

    const handleAccept = async (requestId: string) => {
        const req = pendingRequests.find((r: any) => r.id === requestId);
        const requestedAmount = Number(req?.amount ?? 0);
        Alert.alert(
            'Accept Settlement',
            Number.isFinite(requestedAmount) && requestedAmount > 0
                ? `Accepting will settle up to ${formatCurrency(requestedAmount)} for this request period. Continue?`
                : 'Accept this settlement request?',
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
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {/* Revenue Generated */}
                            <View
                                style={{
                                    flex: 1,
                                    borderRadius: 20,
                                    padding: 18,
                                    backgroundColor: '#0b89a910',
                                    borderWidth: 1,
                                    borderColor: '#0b89a935',
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 10,
                                        fontWeight: '700',
                                        letterSpacing: 1,
                                        color: '#0b89a9',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Revenue
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
                                    {filteredSettlements.length}{' '}
                                    {filteredSettlements.length === 1 ? 'order' : 'orders'}
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
                                    Owed
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
                                        Includes partial balance
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

                {/* ── Settlement Table ── */}
                <View className="px-5 mt-6">
                    {/* Last settlement timestamp banner */}
                    {period === 'last_settlement' && lastPaidDate && (
                        <View
                            style={{
                                borderRadius: 12,
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                backgroundColor: '#0b89a910',
                                borderWidth: 1,
                                borderColor: '#0b89a930',
                                marginBottom: 10,
                                gap: 2,
                            }}
                        >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#0b89a9', textTransform: 'uppercase', letterSpacing: 0.8 }}>
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
                                    {paginatedSettlements.map((s: any, idx: number) => {
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

                                        const isPayable = s.direction === 'PAYABLE';
                                        const rowBg = isPayable
                                            ? '#071a0f'
                                            : idx % 2 === 0 ? '#0d1421' : '#0a0f1a';

                                        return (
                                            <Pressable
                                                key={s.id}
                                                onPress={() => setSelectedSettlement(s)}
                                                style={{
                                                    flexDirection: 'row',
                                                    borderBottomWidth: 1,
                                                    borderBottomColor: '#1a2233',
                                                    backgroundColor: rowBg,
                                                    borderLeftWidth: isPayable ? 3 : 0,
                                                    borderLeftColor: '#22c55e',
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
                                                        color: isPayable ? '#22c55e' : '#e2e8f0',
                                                        textAlign: 'right',
                                                    }}
                                                >
                                                    {formatCurrency(netAmount)}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>
                    )}

                    {/* ── Pagination ── */}
                    {filteredSettlements.length > PAGE_SIZE && (
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 12,
                                paddingHorizontal: 4,
                            }}
                        >
                            <Pressable
                                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 10,
                                    backgroundColor: currentPage === 1 ? '#1a2233' : '#0b89a9',
                                    opacity: currentPage === 1 ? 0.4 : 1,
                                }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>← Prev</Text>
                            </Pressable>

                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                Page {currentPage} of {totalPages}
                            </Text>

                            <Pressable
                                onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 10,
                                    backgroundColor: currentPage === totalPages ? '#1a2233' : '#0b89a9',
                                    opacity: currentPage === totalPages ? 0.4 : 1,
                                }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Next →</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </ScrollView>

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
                            Custom Date Range
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -8 }}>
                            Enter dates in DD/MM/YYYY format
                        </Text>

                        <View style={{ gap: 10 }}>
                            <View>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>From</Text>
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
                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>To</Text>
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
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#9ca3af' }}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleApplyCustomRange}
                                style={{
                                    flex: 2,
                                    borderRadius: 12,
                                    paddingVertical: 14,
                                    alignItems: 'center',
                                    backgroundColor: '#0b89a9',
                                }}
                            >
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Apply Range</Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Order Detail Modal ── */}
            <Modal
                visible={selectedSettlement !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedSettlement(null)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' }}
                    onPress={() => setSelectedSettlement(null)}
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
                            const s = selectedSettlement;
                            if (!s) return null;

                            const businessOrder = (s.order?.businesses ?? []).find(
                                (e: any) => e?.business?.id === businessId,
                            );
                            const items: any[] = businessOrder?.items ?? [];
                            const isPayable = s.direction === 'PAYABLE';
                            const isReceivable = !isPayable;
                            const settlementAmount = Number(s.amount ?? 0);
                            const grossFromItems = items.reduce(
                                (acc: number, item: any) =>
                                    acc + Number(item?.unitPrice ?? 0) * Number(item?.quantity ?? 0),
                                0,
                            );
                            const commissionAmount = isReceivable
                                ? settlementAmount
                                : Math.max(0, grossFromItems - settlementAmount);
                            const netAmount = isReceivable
                                ? Math.max(0, grossFromItems - settlementAmount)
                                : settlementAmount;

                            const promotions: any[] = s.order?.orderPromotions ?? [];
                            const itemDiscounts = promotions
                                .filter((p: any) => p.appliesTo === 'PRICE')
                                .reduce((acc: number, p: any) => acc + Number(p.discountAmount ?? 0), 0);
                            const deliveryDiscounts = promotions
                                .filter((p: any) => p.appliesTo === 'DELIVERY')
                                .reduce((acc: number, p: any) => acc + Number(p.discountAmount ?? 0), 0);
                            const totalDiscounts = itemDiscounts + deliveryDiscounts;

                            const orderId = s.order?.displayId ?? s.order?.id?.slice(-6) ?? '—';

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
                                                Order #{orderId}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                                                {formatDateTime(s.order?.orderDate ?? s.createdAt)}
                                            </Text>
                                        </View>
                                        <View style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 10,
                                            backgroundColor: isPayable ? '#22c55e20' : '#ef444420',
                                            borderWidth: 1,
                                            borderColor: isPayable ? '#22c55e40' : '#ef444440',
                                        }}>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: isPayable ? '#22c55e' : '#ef4444' }}>
                                                {isPayable ? 'PAYOUT TO ME' : 'OWES PLATFORM'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Settlement status pill */}
                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                                        {[{ label: 'Status', value: s.status },
                                          s.paidAt ? { label: 'Paid at', value: formatDateTime(s.paidAt) } : null,
                                          s.paymentMethod ? { label: 'Method', value: s.paymentMethod } : null,
                                        ].filter(Boolean).map((chip: any) => (
                                            <View key={chip.label} style={{
                                                paddingHorizontal: 10,
                                                paddingVertical: 5,
                                                borderRadius: 8,
                                                backgroundColor: '#1a2233',
                                                borderWidth: 1,
                                                borderColor: '#263145',
                                            }}>
                                                <Text style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6 }}>{chip.label}</Text>
                                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#e2e8f0' }}>{chip.value}</Text>
                                            </View>
                                        ))}
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
                                                {/* Child items (modifiers shown as sub-rows) */}
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
                                            s.order?.originalPrice && s.order.originalPrice !== s.order.orderPrice
                                                ? { label: 'Original price', value: formatCurrency(s.order.originalPrice), color: '#6b7280' }
                                                : null,
                                            { label: 'Delivery fee', value: formatCurrency(Number(s.order?.deliveryPrice ?? 0)), color: '#e2e8f0' },
                                            s.order?.originalDeliveryPrice && s.order.originalDeliveryPrice !== s.order.deliveryPrice
                                                ? { label: 'Original delivery', value: formatCurrency(s.order.originalDeliveryPrice), color: '#6b7280' }
                                                : null,
                                            itemDiscounts > 0
                                                ? { label: 'Item discount', value: `−${formatCurrency(itemDiscounts)}`, color: '#22c55e' }
                                                : null,
                                            deliveryDiscounts > 0
                                                ? { label: 'Delivery discount', value: `−${formatCurrency(deliveryDiscounts)}`, color: '#22c55e' }
                                                : null,
                                            { label: 'Order total', value: formatCurrency(Number(s.order?.totalPrice ?? 0)), color: '#fff', bold: true },
                                            { label: 'Platform commission', value: `−${formatCurrency(commissionAmount)}`, color: '#f59e0b', bold: false },
                                            { label: isPayable ? 'Payout to you' : 'Net (after commission)', value: formatCurrency(netAmount), color: isPayable ? '#22c55e' : '#e2e8f0', bold: true },
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
                                        onPress={() => setSelectedSettlement(null)}
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
                                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#9ca3af' }}>Close</Text>
                                    </Pressable>
                                </ScrollView>
                            );
                        })()}
                    </Pressable>
                </Pressable>
            </Modal>

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
