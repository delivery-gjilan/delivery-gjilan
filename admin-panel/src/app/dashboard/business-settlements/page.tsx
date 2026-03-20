'use client';

import { useState, useMemo } from 'react';
import { useQuery, useLazyQuery } from '@apollo/client/react';
import { AlertCircle, ArrowLeft, Calendar, Eye, Filter, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { DateRange, Range } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import '../finances/dateRangePicker.css';
import { GET_SETTLEMENTS } from '@/graphql/operations/settlements/queries';
import { GET_ORDER } from '@/graphql/operations/orders/queries';
import { useAuth } from '@/lib/auth-context';
import { format, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import Modal from '@/components/ui/Modal';

interface Settlement {
    id: string;
    type: 'BUSINESS';
    direction: 'RECEIVABLE' | 'PAYABLE';
    business?: { id: string; name: string };
    order: {
        id: string;
        displayId?: string;
        orderDate?: string;
        orderPrice: number;
        totalPrice: number;
    };
    amount: number;
    status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'DISPUTED';
    paidAt?: string;
    createdAt: string;
}

export default function BusinessSettlementsPage() {
    const { admin } = useAuth();
    const isBusinessUser = admin?.role === 'BUSINESS_OWNER' || admin?.role === 'BUSINESS_EMPLOYEE';
    const businessId = admin?.businessId ?? null;

    const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'>('all');
    const [directionFilter, setDirectionFilter] = useState<'all' | 'RECEIVABLE' | 'PAYABLE'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateMode, setDateMode] = useState<'all' | 'today' | 'week' | 'month' | 'last_settlement' | 'custom'>('month');
    const [dateRange, setDateRange] = useState<Range>({
        startDate: startOfMonth(new Date()),
        endDate: new Date(),
        key: 'selection',
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
    const [detailsError, setDetailsError] = useState<string | null>(null);

    const { data: lastPaidSettlementData } = useQuery(GET_SETTLEMENTS, {
        variables: {
            type: 'BUSINESS',
            businessId: isBusinessUser ? businessId || undefined : undefined,
            status: 'PAID',
            limit: 1,
        },
        skip: !isBusinessUser || !businessId,
        fetchPolicy: 'network-only',
    });

    const lastPaidSettlementAt =
        ((lastPaidSettlementData as any)?.settlements?.[0]?.paidAt as string | undefined) ||
        ((lastPaidSettlementData as any)?.settlements?.[0]?.createdAt as string | undefined) ||
        null;

    const getDateRange = () => {
        const now = new Date();
        const today = startOfDay(now);
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
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
            case 'week': {
                const startISO = weekStart.toISOString();
                const endOfWeek = new Date(now);
                endOfWeek.setHours(23, 59, 59, 999);
                const endISO = endOfWeek.toISOString();
                return { start: startISO, end: endISO };
            }
            case 'last_settlement': {
                if (!lastPaidSettlementAt) {
                    return { start: '', end: '' };
                }
                const start = new Date(lastPaidSettlementAt);
                const end = new Date(now);
                end.setHours(23, 59, 59, 999);
                return { start: start.toISOString(), end: end.toISOString() };
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

    const {
        data: settlementsData,
        loading: settlementsLoading,
    } = useQuery(GET_SETTLEMENTS, {
        variables: {
            type: 'BUSINESS',
            businessId: isBusinessUser ? businessId || undefined : undefined,
            status: statusFilter === 'all' ? undefined : statusFilter,
            direction: directionFilter === 'all' ? undefined : directionFilter,
            startDate: dateStart || undefined,
            endDate: dateEnd || undefined,
            limit: 200,
        },
        skip: !isBusinessUser || !businessId,
        fetchPolicy: 'network-only',
    });

    const [fetchOrderDetails, { data: orderData, loading: orderLoading }] = useLazyQuery(GET_ORDER, {
        fetchPolicy: 'network-only',
    });

    const settlements: Settlement[] = ((settlementsData as any)?.settlements || []) as Settlement[];

    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filteredSettlements = useMemo(() => {
        if (!normalizedSearch) return settlements;
        return settlements.filter((settlement) => {
            const orderId = String(settlement.order?.id ?? '').toLowerCase();
            const displayId = String(settlement.order?.displayId ?? '').toLowerCase();
            const businessName = String(settlement.business?.name ?? '').toLowerCase();
            return orderId.includes(normalizedSearch) || displayId.includes(normalizedSearch) || businessName.includes(normalizedSearch);
        });
    }, [normalizedSearch, settlements]);

    const totals = useMemo(() => {
        const pending = filteredSettlements
            .filter((s) => s.status === 'PENDING')
            .reduce((sum, s) => sum + Number(s.amount || 0), 0);
        const paid = filteredSettlements
            .filter((s) => s.status === 'PAID')
            .reduce((sum, s) => sum + Number(s.amount || 0), 0);
        const total = filteredSettlements.reduce((sum, s) => sum + Number(s.amount || 0), 0);

        return { total, pending, paid };
    }, [filteredSettlements]);

    const openOrderDetails = async (settlement: Settlement) => {
        setSelectedSettlement(settlement);
        setDetailsOpen(true);
        setDetailsError(null);
        try {
            await fetchOrderDetails({ variables: { id: settlement.order.id } });
        } catch (error: any) {
            const fallbackMessage = 'Order details unavailable for this settlement.';
            setDetailsError(error?.message || fallbackMessage);
        }
    };

    const modalBusinessEntries = useMemo(() => {
        const entries = ((orderData as any)?.order?.businesses || []) as any[];
        if (!entries.length) return [];
        if (!businessId) return entries;

        const ownBusinessEntries = entries.filter((entry) => entry?.business?.id === businessId);
        return ownBusinessEntries.length > 0 ? ownBusinessEntries : entries;
    }, [businessId, orderData]);

    const activeDateLabel = useMemo(() => {
        if (dateMode === 'all') return 'All time';
        if (dateMode === 'today') return 'Today';
        if (dateMode === 'week') return 'This week';
        if (dateMode === 'month') return 'This month';
        if (dateMode === 'last_settlement') {
            return lastPaidSettlementAt
                ? `From last settlement (${format(new Date(lastPaidSettlementAt), 'MMM dd, yyyy HH:mm:ss')})`
                : 'From last settlement (no previous paid settlement)';
        }
        if (dateRange.startDate && dateRange.endDate) {
            return `${format(new Date(dateRange.startDate), 'MMM dd')} - ${format(new Date(dateRange.endDate), 'MMM dd, yyyy')}`;
        }
        return 'Custom range';
    }, [dateMode, dateRange.endDate, dateRange.startDate, lastPaidSettlementAt]);

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white">
            <div className="border-b border-zinc-800 p-6">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="text-zinc-500 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-2xl font-bold">Business Settlements</h1>
                    </div>
                </div>
            </div>

            <div className="bg-[#1a1a1a] border-b border-zinc-800 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="inline-flex items-center gap-2 text-zinc-300 text-sm font-semibold">
                                <Filter size={15} />
                                Filters
                            </div>
                            <button
                                onClick={() => {
                                    setDateMode('month');
                                    setStatusFilter('all');
                                    setDirectionFilter('all');
                                    setSearchQuery('');
                                    setShowDatePicker(false);
                                }}
                                className="inline-flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 rounded px-3 py-1.5 text-xs text-white transition-colors"
                            >
                                <RefreshCcw size={13} />
                                Clear all
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {([
                                { key: 'all', label: 'All time' },
                                { key: 'today', label: 'Today' },
                                { key: 'week', label: 'This week' },
                                { key: 'month', label: 'This month' },
                                { key: 'last_settlement', label: 'From last settlement' },
                                { key: 'custom', label: 'Custom' },
                            ] as const).map((mode) => (
                                <button
                                    key={mode.key}
                                    onClick={() => {
                                        setDateMode(mode.key);
                                        if (mode.key !== 'custom') {
                                            setShowDatePicker(false);
                                        }
                                    }}
                                    disabled={mode.key === 'last_settlement' && !lastPaidSettlementAt}
                                    className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                                        dateMode === mode.key
                                            ? 'bg-violet-600 text-white'
                                            : 'bg-[#09090b] border border-zinc-800 text-zinc-400 hover:text-white'
                                    } ${(mode.key === 'last_settlement' && !lastPaidSettlementAt) ? 'opacity-40 cursor-not-allowed' : ''}`}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>

                        <div className="rounded border border-zinc-800 bg-[#111113] px-3 py-2 text-xs text-zinc-300">
                            Active range: <span className="text-white font-semibold">{activeDateLabel}</span>
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

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by order id or display id"
                                className="bg-[#09090b] border border-zinc-800 rounded px-3 py-2 text-sm text-white"
                            />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="bg-[#09090b] border border-zinc-800 rounded px-3 py-2 text-sm text-white"
                            >
                                <option value="all">All statuses</option>
                                <option value="PENDING">Pending</option>
                                <option value="PAID">Paid</option>
                                <option value="OVERDUE">Overdue</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                            <select
                                value={directionFilter}
                                onChange={(e) => setDirectionFilter(e.target.value as any)}
                                className="bg-[#09090b] border border-zinc-800 rounded px-3 py-2 text-sm text-white"
                            >
                                <option value="all">All directions</option>
                                <option value="RECEIVABLE">Receivable</option>
                                <option value="PAYABLE">Payable</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-4">
                            <div className="text-xs text-zinc-600 uppercase font-semibold mb-1">Total Settlements</div>
                            <div className="text-3xl font-bold text-violet-400">€{totals.total.toFixed(2)}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-4">
                                <div className="text-xs text-zinc-600 uppercase font-semibold mb-1">Pending</div>
                                <div className="text-xl font-bold text-amber-400">€{totals.pending.toFixed(2)}</div>
                            </div>
                            <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-4">
                                <div className="text-xs text-zinc-600 uppercase font-semibold mb-1">Paid</div>
                                <div className="text-xl font-bold text-green-400">€{totals.paid.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {settlementsLoading ? (
                    <div className="text-center text-zinc-500 py-8">Loading...</div>
                ) : filteredSettlements.length === 0 ? (
                    <div className="text-center text-zinc-500 py-8">No settlements found.</div>
                ) : (
                    <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-[#09090b]">
                                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">Order</th>
                                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">Timestamp</th>
                                    <th className="px-3 py-2 text-right font-semibold text-zinc-500">Gross</th>
                                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">Direction</th>
                                    <th className="px-3 py-2 text-right font-semibold text-zinc-500">Commission</th>
                                    <th className="px-3 py-2 text-right font-semibold text-zinc-500">Net</th>
                                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">Status</th>
                                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">Reason</th>
                                    <th className="px-3 py-2 text-right font-semibold text-zinc-500">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSettlements.map((settlement) => {
                                    const orderGross = Number(settlement.order?.orderPrice ?? 0);
                                    const settlementAmount = Number(settlement.amount || 0);

                                    const commission =
                                        settlement.direction === 'RECEIVABLE'
                                            ? settlementAmount
                                            : Math.max(0, orderGross - settlementAmount);

                                    const netAmount =
                                        settlement.direction === 'RECEIVABLE'
                                            ? Math.max(0, orderGross - settlementAmount)
                                            : settlementAmount;

                                    return (
                                        <tr key={settlement.id} className="border-b border-zinc-800 hover:bg-[#131313] transition-colors">
                                            <td className="px-3 py-2 text-zinc-300 font-mono text-xs">
                                                #{settlement.order?.displayId || settlement.order?.id?.slice(-6)}
                                            </td>
                                            <td className="px-3 py-2 text-zinc-500">
                                                {settlement.order?.orderDate
                                                    ? format(new Date(settlement.order.orderDate), 'MMM dd, yyyy HH:mm')
                                                    : format(new Date(settlement.createdAt), 'MMM dd, yyyy HH:mm')}
                                            </td>
                                            <td className="px-3 py-2 text-right text-zinc-300">€{orderGross.toFixed(2)}</td>
                                            <td className="px-3 py-2 text-zinc-400">{settlement.direction}</td>
                                            <td className="px-3 py-2 text-right text-amber-300">€{commission.toFixed(2)}</td>
                                            <td className="px-3 py-2 text-right text-violet-400 font-semibold">€{netAmount.toFixed(2)}</td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                                        settlement.status === 'PAID'
                                                            ? 'bg-green-500/20 text-green-300'
                                                            : settlement.status === 'OVERDUE'
                                                              ? 'bg-rose-500/20 text-rose-300'
                                                              : settlement.status === 'CANCELLED'
                                                                ? 'bg-zinc-600/30 text-zinc-300'
                                                                : 'bg-amber-500/20 text-amber-300'
                                                    }`}
                                                >
                                                    {settlement.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-zinc-500">
                                                {settlement.direction === 'RECEIVABLE'
                                                    ? 'Commission due to platform from this order.'
                                                    : 'Payout due to your business for this order.'}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    onClick={() => openOrderDetails(settlement)}
                                                    className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 rounded px-2 py-1 text-[11px] text-white"
                                                >
                                                    <Eye size={12} />
                                                    View order
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal
                isOpen={detailsOpen}
                onClose={() => {
                    setDetailsOpen(false);
                    setSelectedSettlement(null);
                    setDetailsError(null);
                }}
                title={`Order Details #${selectedSettlement?.order?.displayId || selectedSettlement?.order?.id?.slice(-6) || ''}`}
            >
                {orderLoading ? (
                    <div className="py-8 text-center text-zinc-400">Loading order details...</div>
                ) : detailsError ? (
                    <div className="py-8 text-center text-rose-300">
                        <div className="inline-flex items-center gap-2 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm">
                            <AlertCircle size={16} />
                            <span>{detailsError}</span>
                        </div>
                    </div>
                ) : !(orderData as any)?.order ? (
                    <div className="py-8 text-center text-zinc-500">Order details unavailable.</div>
                ) : (
                    <div className="space-y-4 text-sm text-zinc-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
                                <div className="text-zinc-500 text-xs">Order</div>
                                <div className="font-semibold">#{(orderData as any).order.displayId || (orderData as any).order.id?.slice(-6)}</div>
                            </div>
                            <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
                                <div className="text-zinc-500 text-xs">Date</div>
                                <div className="font-semibold">{format(new Date((orderData as any).order.orderDate), 'MMM dd, yyyy HH:mm')}</div>
                            </div>
                            <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
                                <div className="text-zinc-500 text-xs">Total</div>
                                <div className="font-semibold">€{Number((orderData as any).order.totalPrice || 0).toFixed(2)}</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {modalBusinessEntries.length === 0 ? (
                                <div className="border border-zinc-800 rounded p-3 text-xs text-zinc-400">
                                    No item breakdown is available for this order. This can happen on historical orders if product ownership changed after settlement creation.
                                </div>
                            ) : (
                                modalBusinessEntries.map((entry: any) => (
                                    <div key={entry.business?.id || entry.business?.name} className="border border-zinc-800 rounded p-3">
                                        <div className="font-semibold mb-2">{entry.business?.name}</div>
                                        {(entry.items || []).length === 0 ? (
                                            <div className="text-xs text-zinc-400">No items found for this business in this order.</div>
                                        ) : (
                                            <div className="space-y-1">
                                                {(entry.items || []).map((item: any) => (
                                                    <div key={`${item.productId}-${item.name}`} className="flex items-center justify-between text-xs">
                                                        <span>{item.quantity}x {item.name}</span>
                                                        <span>€{(Number(item.unitPrice || 0) * Number(item.quantity || 0)).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}