'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { ArrowLeft, ChevronDown, Calendar } from 'lucide-react';
import Link from 'next/link';
import { DateRange, Range } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import './dateRangePicker.css';
import {
    GET_SETTLEMENTS,
    MARK_SETTLEMENTS_PAID,
    MARK_SETTLEMENT_PARTIAL,
    UNSETTLE_SETTLEMENT,
} from '@/graphql/operations/settlements/queries';
import { format, startOfDay, startOfMonth } from 'date-fns';
import { toast } from 'sonner';

interface Settlement {
    id: string;
    type: 'DRIVER_PAYMENT' | 'BUSINESS_PAYMENT';
    driver?: { id: string; firstName: string; lastName: string; phoneNumber: string };
    business?: { id: string; name: string };
    order: { id: string; orderPrice: number; deliveryPrice: number; totalPrice: number };
    amount: number;
    status: 'PENDING' | 'PAID';
    paidAt?: string;
    createdAt: string;
}

export default function FinancesDashboard() {
    const [activeView, setActiveView] = useState<'drivers' | 'businesses'>('drivers');
    const [dateMode, setDateMode] = useState<'all' | 'today' | 'month' | 'custom'>('month');
    const [dateRange, setDateRange] = useState<Range>({
        startDate: startOfMonth(new Date()),
        endDate: new Date(),
        key: 'selection',
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({});
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Calculate date range for query
    const getDateRange = () => {
        const now = new Date();
        const today = startOfDay(now);
        const monthStart = startOfMonth(now);

        switch (dateMode) {
            case 'today': {
                const startISO = today.toISOString();
                const endOfDay = new Date(today);
                endOfDay.setHours(23, 59, 59, 999);
                const endISO = endOfDay.toISOString();
                return { start: startISO, end: endISO };
            }
            case 'month': {
                const startISO = monthStart.toISOString();
                const endOfMonth = new Date(now);
                endOfMonth.setHours(23, 59, 59, 999);
                const endISO = endOfMonth.toISOString();
                return { start: startISO, end: endISO };
            }
            case 'custom': {
                if (!dateRange.startDate || !dateRange.endDate) {
                    return { start: '', end: '' };
                }
                const start = new Date(dateRange.startDate);
                const end = new Date(dateRange.endDate);
                end.setHours(23, 59, 59, 999);
                return { start: start.toISOString(), end: end.toISOString() };
            }
            default:
                return { start: '', end: '' };
        }
    };

    const { start: dateStart, end: dateEnd } = getDateRange();

    // Fetch settlements
    const {
        data: settlementsData,
        loading: settlementsLoading,
        refetch: refetchSettlements,
    } = useQuery(GET_SETTLEMENTS, {
        variables: {
            startDate: dateStart || undefined,
            endDate: dateEnd || undefined,
        },
        fetchPolicy: 'network-only',
    });

    // Mutations
    const [markSettlementsPaid, { loading: markPaidLoading }] = useMutation(MARK_SETTLEMENTS_PAID, {
        onCompleted: () => refetchSettlements(),
    });

    const [markSettlementPartial, { loading: markPartialLoading }] = useMutation(MARK_SETTLEMENT_PARTIAL, {
        onCompleted: () => refetchSettlements(),
    });

    const [unsettleSettlement, { loading: unsettleLoading }] = useMutation(UNSETTLE_SETTLEMENT, {
        onCompleted: () => refetchSettlements(),
    });

    const settlements: Settlement[] = ((settlementsData as any)?.settlements || []) as Settlement[];

    // Sort by order total descending
    const sortedSettlements = useMemo(() => {
        return [...settlements].sort((a, b) => {
            const aTotal = a.type === 'DRIVER_PAYMENT' ? a.order?.deliveryPrice ?? 0 : a.order?.orderPrice ?? 0;
            const bTotal = b.type === 'DRIVER_PAYMENT' ? b.order?.deliveryPrice ?? 0 : b.order?.orderPrice ?? 0;
            return bTotal - aTotal;
        });
    }, [settlements]);

    // Group settlements by driver/business
    interface GroupedSettlement {
        id: string;
        name: string;
        type: 'DRIVER' | 'BUSINESS';
        total: number;
        pending: number;
        paid: number;
        pendingIds: string[];
        settlements: Settlement[];
    }

    const groupedSettlements = useMemo(() => {
        const groups = new Map<string, GroupedSettlement>();

        sortedSettlements.forEach((settlement) => {
            const isDriver = settlement.type === 'DRIVER_PAYMENT';
            const groupId = isDriver ? settlement.driver?.id : settlement.business?.id;
            const groupName = isDriver
                ? `${settlement.driver?.firstName} ${settlement.driver?.lastName}`
                : settlement.business?.name;

            if (!groupId || !groupName) return;

            const key = `${isDriver ? 'driver' : 'business'}-${groupId}`;

            if (!groups.has(key)) {
                groups.set(key, {
                    id: groupId,
                    name: groupName,
                    type: isDriver ? 'DRIVER' : 'BUSINESS',
                    total: 0,
                    pending: 0,
                    paid: 0,
                    pendingIds: [],
                    settlements: [],
                });
            }

            const group = groups.get(key)!;
            group.total += settlement.amount;
            if (settlement.status === 'PENDING') {
                group.pending += settlement.amount;
                group.pendingIds.push(settlement.id);
            } else {
                group.paid += settlement.amount;
            }
            group.settlements.push(settlement);
        });

        return Array.from(groups.values()).sort((a, b) => b.total - a.total);
    }, [sortedSettlements]);

    // Filter grouped settlements by view
    const filteredGroupedSettlements = useMemo(() => {
        return groupedSettlements.filter((group) =>
            activeView === 'drivers' ? group.type === 'DRIVER' : group.type === 'BUSINESS'
        );
    }, [groupedSettlements, activeView]);

    // Get unique businesses and drivers
    const { businesses, drivers } = useMemo(() => {
        const businessMap = new Map<string, string>();
        const driverMap = new Map<string, string>();

        settlements.forEach((s) => {
            if (s.business) {
                businessMap.set(s.business.id, s.business.name);
            }
            if (s.driver) {
                driverMap.set(s.driver.id, `${s.driver.firstName} ${s.driver.lastName}`);
            }
        });

        return {
            businesses: Array.from(businessMap.entries()).map(([id, name]) => ({ id, name })),
            drivers: Array.from(driverMap.entries()).map(([id, name]) => ({ id, name })),
        };
    }, [settlements]);

    // Calculate totals
    const totals = useMemo(() => {
        const pending = filteredGroupedSettlements.reduce((sum, g) => sum + g.pending, 0);
        const paid = filteredGroupedSettlements.reduce((sum, g) => sum + g.paid, 0);
        const total = pending + paid;

        return { total, pending, paid };
    }, [filteredGroupedSettlements]);

    const handleSettle = async (ids: string[]) => {
        if (ids.length === 0) return;
        try {
            await markSettlementsPaid({ variables: { ids } });
        } catch (error) {
            console.error('Error settling:', error);
        }
    };

    const handlePartialSettle = async (settlementId: string) => {
        const rawAmount = partialAmounts[settlementId] ?? '';
        const amount = Number(rawAmount);
        if (!amount || amount <= 0) {
            toast.warning('Enter an amount greater than 0.');
            return;
        }

        try {
            await markSettlementPartial({
                variables: { settlementId, amount },
            });
            setPartialAmounts((prev) => ({ ...prev, [settlementId]: '' }));
        } catch (error) {
            console.error('Error settling partially:', error);
        }
    };

    const handleUnsettle = async (settlementId: string) => {
        try {
            await unsettleSettlement({ variables: { settlementId } });
        } catch (error) {
            console.error('Error unsettling:', error);
        }
    };

    const toggleExpandedGroup = (groupId: string) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [groupId]: !prev[groupId],
        }));
    };

    const handleSettleGroup = async (pendingIds: string[]) => {
        if (pendingIds.length === 0) return;
        try {
            await markSettlementsPaid({ variables: { ids: pendingIds } });
        } catch (error) {
            console.error('Error settling group:', error);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white">
            {/* Header */}
            <div className="border-b border-zinc-800 p-6">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="text-zinc-500 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-2xl font-bold">Finances</h1>
                    </div>

                    {/* View Toggle */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveView('drivers')}
                            className={`px-4 py-2 rounded font-semibold transition-colors ${
                                activeView === 'drivers'
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-[#09090b] border border-zinc-800 text-zinc-500 hover:text-white'
                            }`}
                        >
                            Drivers
                        </button>
                        <button
                            onClick={() => setActiveView('businesses')}
                            className={`px-4 py-2 rounded font-semibold transition-colors ${
                                activeView === 'businesses'
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-[#09090b] border border-zinc-800 text-zinc-500 hover:text-white'
                            }`}
                        >
                            Businesses
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters & Summary */}
            <div className="bg-[#1a1a1a] border-b border-zinc-800 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Date Filters */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            {(['all', 'today', 'month', 'custom'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => {
                                        setDateMode(mode);
                                        if (mode !== 'custom') {
                                            setShowDatePicker(false);
                                        }
                                    }}
                                    className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                                        dateMode === mode
                                            ? 'bg-violet-600 text-white'
                                            : 'bg-[#09090b] border border-zinc-800 text-zinc-500 hover:text-white'
                                    }`}
                                >
                                    {mode === 'all' ? 'All' : mode === 'today' ? 'Today' : mode === 'month' ? 'This Month' : 'Custom'}
                                </button>
                            ))}
                        </div>

                        {dateMode === 'custom' && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowDatePicker(!showDatePicker)}
                                    className="w-full flex items-center gap-2 bg-[#09090b] border border-zinc-800 rounded px-4 py-3 text-sm text-white hover:border-zinc-700 transition-colors"
                                >
                                    <Calendar size={16} />
                                    <span>
                                        {dateRange.startDate && dateRange.endDate
                                            ? `${format(new Date(dateRange.startDate), 'MMM dd')} - ${format(new Date(dateRange.endDate), 'MMM dd, yyyy')}`
                                            : 'Select date range'}
                                    </span>
                                </button>

                                {showDatePicker && (
                                    <div className="absolute top-full left-0 mt-2 z-50 bg-[#1a1a1a] border border-zinc-800 rounded shadow-lg">
                                        <DateRange
                                            ranges={[dateRange]}
                                            onChange={(item: any) => setDateRange(item.selection)}
                                            maxDate={new Date()}
                                            rangeColors={['#06b6d4']}
                                            className="rdrCalendarWrapper dark-theme"
                                            inputRanges={[]}
                                        />
                                        <div className="p-3 border-t border-zinc-800 flex gap-2">
                                            <button
                                                onClick={() => setShowDatePicker(false)}
                                                className="flex-1 bg-violet-600 hover:bg-violet-700 rounded px-3 py-2 text-sm font-semibold text-white transition-colors"
                                            >
                                                Done
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setDateRange({
                                                        startDate: new Date(),
                                                        endDate: new Date(),
                                                        key: 'selection',
                                                    });
                                                    setShowDatePicker(false);
                                                }}
                                                className="flex-1 bg-neutral-700 hover:bg-neutral-600 rounded px-3 py-2 text-sm font-semibold text-white transition-colors"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setDateMode('month');
                                setShowDatePicker(false);
                            }}
                            className="w-full bg-neutral-700 hover:bg-neutral-600 rounded px-3 py-2 text-sm text-white transition-colors"
                        >
                            Reset Filters
                        </button>
                    </div>

                    {/* Summary */}
                    <div className="space-y-3">
                        <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-4">
                            <div className="text-xs text-zinc-600 uppercase font-semibold mb-1">Total Earned</div>
                            <div className="text-3xl font-bold text-violet-400">${totals.total.toFixed(2)}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-4">
                                <div className="text-xs text-zinc-600 uppercase font-semibold mb-1">Pending</div>
                                <div className="text-xl font-bold text-amber-400">${totals.pending.toFixed(2)}</div>
                            </div>
                            <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-4">
                                <div className="text-xs text-zinc-600 uppercase font-semibold mb-1">Paid</div>
                                <div className="text-xl font-bold text-green-400">${totals.paid.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settlements Grouped View */}
            <div className="p-6">
                {settlementsLoading ? (
                    <div className="text-center text-zinc-500 py-8">Loading...</div>
                ) : filteredGroupedSettlements.length === 0 ? (
                    <div className="text-center text-zinc-500 py-8">No settlements found.</div>
                ) : (
                    <div className="space-y-3">
                        {filteredGroupedSettlements.map((group) => {
                            const groupKey = `${group.type.toLowerCase()}-${group.id}`;
                            const isExpanded = expandedGroups[groupKey];

                            return (
                                <div key={groupKey} className="border border-zinc-800 rounded-lg overflow-hidden">
                                    {/* Group Header */}
                                    <div className="bg-[#09090b] p-4 cursor-pointer hover:bg-[#131313] transition-colors" onClick={() => toggleExpandedGroup(groupKey)}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1">
                                                <ChevronDown
                                                    size={18}
                                                    className={`transition-transform text-zinc-500 ${isExpanded ? 'rotate-180' : ''}`}
                                                />
                                                <div>
                                                    <div className="font-semibold text-white">{group.name}</div>
                                                    <div className="text-xs text-zinc-600">
                                                        {group.type === 'DRIVER' ? 'Driver' : 'Business'} â€¢{' '}
                                                        {group.settlements.length} settlement{group.settlements.length !== 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 text-right">
                                                <div>
                                                    <div className="text-xs text-zinc-600 uppercase font-semibold">Total</div>
                                                    <div className="text-lg font-bold text-violet-400">${group.total.toFixed(2)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-zinc-600 uppercase font-semibold">Pending</div>
                                                    <div className="text-lg font-bold text-amber-400">${group.pending.toFixed(2)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-zinc-600 uppercase font-semibold">Paid</div>
                                                    <div className="text-lg font-bold text-green-400">${group.paid.toFixed(2)}</div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={group.pending}
                                                        step="0.01"
                                                        value={partialAmounts[`group-${groupKey}`] ?? ''}
                                                        onChange={(e) =>
                                                            setPartialAmounts((prev) => ({
                                                                ...prev,
                                                                [`group-${groupKey}`]: e.target.value,
                                                            }))
                                                        }
                                                        placeholder="Partial Amt"
                                                        className="w-24 bg-[#09090b] border border-zinc-800 rounded px-2 py-2 text-sm text-white"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const rawAmount = partialAmounts[`group-${groupKey}`] ?? '';
                                                            const amount = Number(rawAmount);
                                                            if (amount > 0 && amount < group.pending) {
                                                                handlePartialSettle(group.pendingIds[0]);
                                                            }
                                                        }}
                                                        disabled={markPartialLoading || group.pending === 0}
                                                        className="bg-amber-600 hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed rounded px-3 py-2 text-sm font-semibold text-white transition-colors"
                                                    >
                                                        Partial
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSettleGroup(group.pendingIds);
                                                        }}
                                                        disabled={markPaidLoading || group.pendingIds.length === 0}
                                                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed rounded px-4 py-2 text-sm font-semibold text-white transition-colors"
                                                    >
                                                        Settle All ({group.pendingIds.length})
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expandable History */}
                                    {isExpanded && (
                                        <div className="bg-[#09090b]/50 border-t border-zinc-800 p-4">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="border-b border-zinc-800">
                                                            <th className="px-3 py-2 text-left font-semibold text-zinc-500">Order Value</th>
                                                            <th className="px-3 py-2 text-right font-semibold text-zinc-500">My Cut</th>
                                                            <th className="px-3 py-2 text-left font-semibold text-zinc-500">Status</th>
                                                            <th className="px-3 py-2 text-left font-semibold text-zinc-500">Date</th>
                                                            <th className="px-3 py-2 text-right font-semibold text-zinc-500">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.settlements.map((settlement) => {
                                                            const orderValue =
                                                                settlement.type === 'DRIVER_PAYMENT'
                                                                    ? settlement.order?.deliveryPrice ?? 0
                                                                    : settlement.order?.orderPrice ?? 0;
                                                            const isPending = settlement.status === 'PENDING';

                                                            return (
                                                                <tr key={settlement.id} className="border-b border-zinc-800 hover:bg-[#131313] transition-colors">
                                                                    <td className="px-3 py-2 text-zinc-400">${orderValue.toFixed(2)}</td>
                                                                    <td className="px-3 py-2 text-right text-violet-400 font-semibold">${settlement.amount.toFixed(2)}</td>
                                                                    <td className="px-3 py-2">
                                                                        <span
                                                                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                                                                settlement.status === 'PAID'
                                                                                    ? 'bg-green-500/20 text-green-300'
                                                                                    : 'bg-amber-500/20 text-amber-300'
                                                                            }`}
                                                                        >
                                                                            {settlement.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-zinc-500">
                                                                        {format(new Date(settlement.createdAt), 'MMM dd, yyyy')}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right">
                                                                        {isPending ? (
                                                                            <span className="text-zinc-500 text-[11px]">Pending</span>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleUnsettle(settlement.id)}
                                                                                disabled={unsettleLoading}
                                                                                className="bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded px-1.5 py-0.5 text-[11px] text-white disabled:cursor-not-allowed transition-colors"
                                                                            >
                                                                                Unsettle
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
