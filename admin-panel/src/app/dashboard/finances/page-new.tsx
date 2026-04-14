'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import {
    GET_SETTLEMENTS_PAGE as GET_SETTLEMENTS,
    MARK_SETTLEMENTS_PAID_OP as MARK_SETTLEMENTS_PAID,
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
    const [dateMode, setDateMode] = useState<'all' | 'today' | 'month' | 'custom'>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({});

    // Calculate date range
    const getDateRange = () => {
        const now = new Date();
        const today = startOfDay(now);
        const monthStart = startOfMonth(now);

        switch (dateMode) {
            case 'today':
                return { start: format(today, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
            case 'month':
                return { start: format(monthStart, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
            case 'custom':
                return { start: customStartDate, end: customEndDate };
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
            driverId: selectedDriverId || undefined,
            businessId: selectedBusinessId || undefined,
            startDate: dateStart || undefined,
            endDate: dateEnd || undefined,
            limit: 1000,
        },
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

    const settlements: Settlement[] = (settlementsData?.settlements ?? []) as Settlement[];

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
        const pending = settlements
            .filter((s) => s.status === 'PENDING')
            .reduce((sum, s) => sum + s.amount, 0);
        const paid = settlements
            .filter((s) => s.status === 'PAID')
            .reduce((sum, s) => sum + s.amount, 0);
        const total = pending + paid;

        return { total, pending, paid };
    }, [settlements]);

    // Sort by order total descending
    const sortedSettlements = useMemo(() => {
        return [...settlements].sort((a, b) => {
            const aTotal = a.type === 'DRIVER_PAYMENT' ? a.order?.deliveryPrice ?? 0 : a.order?.orderPrice ?? 0;
            const bTotal = b.type === 'DRIVER_PAYMENT' ? b.order?.deliveryPrice ?? 0 : b.order?.orderPrice ?? 0;
            return bTotal - aTotal;
        });
    }, [settlements]);

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

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white">
            {/* Header */}
            <div className="border-b border-[#262626] p-6">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="text-neutral-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl font-bold">Finances</h1>
                </div>
            </div>

            {/* Filters & Summary */}
            <div className="bg-[#1a1a1a] border-b border-[#262626] p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Filters */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            {(['all', 'today', 'month', 'custom'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setDateMode(mode)}
                                    className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                                        dateMode === mode
                                            ? 'bg-cyan-600 text-white'
                                            : 'bg-[#0a0a0a] border border-[#262626] text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    {mode === 'all' ? 'All' : mode === 'today' ? 'Today' : mode === 'month' ? 'Month' : 'Custom'}
                                </button>
                            ))}
                        </div>

                        {dateMode === 'custom' && (
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
                                />
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
                                />
                            </div>
                        )}

                        <select
                            value={selectedBusinessId}
                            onChange={(e) => setSelectedBusinessId(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
                        >
                            <option value="">All Businesses</option>
                            {businesses.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedDriverId}
                            onChange={(e) => setSelectedDriverId(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
                        >
                            <option value="">All Drivers</option>
                            {drivers.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => {
                                setSelectedBusinessId('');
                                setSelectedDriverId('');
                                setDateMode('all');
                            }}
                            className="w-full bg-neutral-700 hover:bg-neutral-600 rounded px-3 py-2 text-sm text-white transition-colors"
                        >
                            Reset
                        </button>
                    </div>

                    {/* Summary */}
                    <div className="space-y-3">
                        <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4">
                            <div className="text-xs text-neutral-500 uppercase font-semibold mb-1">Total Earned</div>
                            <div className="text-3xl font-bold text-cyan-400">${totals.total.toFixed(2)}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4">
                                <div className="text-xs text-neutral-500 uppercase font-semibold mb-1">Pending</div>
                                <div className="text-xl font-bold text-amber-400">${totals.pending.toFixed(2)}</div>
                            </div>
                            <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4">
                                <div className="text-xs text-neutral-500 uppercase font-semibold mb-1">Paid</div>
                                <div className="text-xl font-bold text-green-400">${totals.paid.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settlements Table */}
            <div className="p-6">
                {settlementsLoading ? (
                    <div className="text-center text-neutral-400 py-8">Loading...</div>
                ) : sortedSettlements.length === 0 ? (
                    <div className="text-center text-neutral-400 py-8">No settlements found.</div>
                ) : (
                    <div className="overflow-x-auto border border-[#262626] rounded-lg">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#0a0a0a] border-b border-[#262626]">
                                    <th className="px-4 py-3 text-left font-semibold text-neutral-400">Type</th>
                                    <th className="px-4 py-3 text-left font-semibold text-neutral-400">Recipient</th>
                                    <th className="px-4 py-3 text-right font-semibold text-neutral-400">Order Value</th>
                                    <th className="px-4 py-3 text-right font-semibold text-neutral-400">My Cut</th>
                                    <th className="px-4 py-3 text-left font-semibold text-neutral-400">Status</th>
                                    <th className="px-4 py-3 text-left font-semibold text-neutral-400">Date</th>
                                    <th className="px-4 py-3 text-right font-semibold text-neutral-400">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedSettlements.map((settlement) => {
                                    const orderValue =
                                        settlement.type === 'DRIVER_PAYMENT'
                                            ? settlement.order?.deliveryPrice ?? 0
                                            : settlement.order?.orderPrice ?? 0;
                                    const recipient =
                                        settlement.type === 'DRIVER_PAYMENT'
                                            ? `${settlement.driver?.firstName} ${settlement.driver?.lastName}`
                                            : settlement.business?.name;
                                    const isPending = settlement.status === 'PENDING';

                                    return (
                                        <tr key={settlement.id} className="border-b border-[#262626] hover:bg-[#0a0a0a] transition-colors">
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                                        settlement.type === 'DRIVER_PAYMENT'
                                                            ? 'bg-blue-500/20 text-blue-300'
                                                            : 'bg-green-500/20 text-green-300'
                                                    }`}
                                                >
                                                    {settlement.type === 'DRIVER_PAYMENT' ? 'Driver' : 'Business'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-white">{recipient}</td>
                                            <td className="px-4 py-3 text-right text-neutral-300">${orderValue.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right text-cyan-400 font-semibold">${settlement.amount.toFixed(2)}</td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                                        settlement.status === 'PAID'
                                                            ? 'bg-green-500/20 text-green-300'
                                                            : 'bg-amber-500/20 text-amber-300'
                                                    }`}
                                                >
                                                    {settlement.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-neutral-400">
                                                {format(new Date(settlement.createdAt), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {isPending ? (
                                                    <div className="flex items-center justify-end gap-2 flex-wrap">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={settlement.amount}
                                                            step="0.01"
                                                            value={partialAmounts[settlement.id] ?? ''}
                                                            onChange={(e) =>
                                                                setPartialAmounts((prev) => ({
                                                                    ...prev,
                                                                    [settlement.id]: e.target.value,
                                                                }))
                                                            }
                                                            placeholder="Amt"
                                                            className="w-16 bg-[#0a0a0a] border border-[#262626] rounded px-2 py-1 text-xs text-white"
                                                        />
                                                        <button
                                                            onClick={() => handlePartialSettle(settlement.id)}
                                                            disabled={markPartialLoading}
                                                            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-60 rounded px-2 py-1 text-xs text-white disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            Partial
                                                        </button>
                                                        <button
                                                            onClick={() => handleSettle([settlement.id])}
                                                            disabled={markPaidLoading}
                                                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded px-2 py-1 text-xs text-white disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            Settle
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleUnsettle(settlement.id)}
                                                        disabled={unsettleLoading}
                                                        className="bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded px-2 py-1 text-xs text-white disabled:cursor-not-allowed transition-colors"
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
                )}
            </div>
        </div>
    );
}
