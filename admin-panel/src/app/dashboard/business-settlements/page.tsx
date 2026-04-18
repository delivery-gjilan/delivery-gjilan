'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  RefreshCw,
  Send,
  Wallet,
  Clock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SettlementType,
  SettlementDirection,
  type GetBusinessOrderFinancialsQuery,
  type GetSettlementRequestsQuery,
  type SettlementsPageQuery,
} from '@/gql/graphql';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  GET_SETTLEMENTS_PAGE,
  GET_SETTLEMENT_SUMMARY,
  GET_SETTLEMENT_BREAKDOWN,
  GET_SETTLEMENT_REQUESTS,
  CREATE_SETTLEMENT_REQUEST,
  GET_BUSINESS_ORDER_FINANCIALS,
} from '@/graphql/operations/settlements/queries';

// ── Types ──

type SettlementRecord = SettlementsPageQuery['settlements'][number];
type SettlementRequestRecord = GetSettlementRequestsQuery['settlementRequests'][number];
type OrderGroup = {
  orderId: string;
  orderDisplayId: string;
  order: SettlementRecord['order'];
  settlements: SettlementRecord[];
  totalReceivable: number;
  totalPayable: number;
  latestCreatedAt: SettlementRecord['createdAt'];
};

// ── Date helpers ──

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getPresetRange(preset: string): { start: string; end: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'today':
      return { start: fmt(today), end: fmt(today) };
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      return { start: fmt(weekAgo), end: fmt(today) };
    }
    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: fmt(monthStart), end: fmt(today) };
    }
    case 'all':
      return { start: '', end: '' };
    default:
      return { start: '', end: '' };
  }
}

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

// ── Category styling ──

const CATEGORY_META: Record<string, { chartColor: string; label: string }> = {
  PLATFORM_COMMISSION: { chartColor: '#60a5fa', label: 'Order Commission' },
  DELIVERY_COMMISSION: { chartColor: '#22d3ee', label: 'Delivery Commission' },
  PROMOTION_COST: { chartColor: '#fb7185', label: 'Promotion Adjustments' },
  AUTO_REMITTANCE: { chartColor: '#fbbf24', label: 'Markup & Surcharge' },
  STOCK_REMITTANCE: { chartColor: '#fb923c', label: 'Inventory Items' },
  CATALOG_REVENUE: { chartColor: '#34d399', label: 'Catalog Products' },
  DRIVER_TIP: { chartColor: '#a78bfa', label: 'Driver Tips' },
  DIRECT_CALL_FIXED_FEE: { chartColor: '#2dd4bf', label: 'Direct Call Fee' },
};

// ── Helpers ──

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Failed to create request';
}

function directionBadge(direction: string | null | undefined) {
  if (direction === SettlementDirection.Receivable)
    return <Badge className="bg-red-600/20 text-red-400 border-red-600/30" variant="outline">You Owe</Badge>;
  if (direction === SettlementDirection.Payable)
    return <Badge className="bg-green-600/20 text-green-400 border-green-600/30" variant="outline">You Earn</Badge>;
  return <Badge variant="outline">{direction ?? '—'}</Badge>;
}

function statusBadge(isSettled: boolean) {
  return isSettled ? (
    <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30" variant="outline">Settled</Badge>
  ) : (
    <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30" variant="outline">Pending</Badge>
  );
}

// ── Page ──

export default function BusinessSettlementsPage() {
  const { admin } = useAuth();
  const { toast } = useToast();
  const businessId = admin?.businessId ?? '';

  // Period
  const [datePreset, setDatePreset] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Filters
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(0);
  const [directionFilter, setDirectionFilter] = useState<'all' | SettlementDirection>('all');
  const [settledFilter, setSettledFilter] = useState<'all' | 'settled' | 'unsettled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Request settlement dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [reqAmount, setReqAmount] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);

  // Order detail dialog
  const [selectedOrderGroup, setSelectedOrderGroup] = useState<OrderGroup | null>(null);
  const [fetchFinancials, { data: financialsData, loading: financialsLoading }] = useLazyQuery<GetBusinessOrderFinancialsQuery>(
    GET_BUSINESS_ORDER_FINANCIALS,
    { fetchPolicy: 'network-only' },
  );

  // Compute effective date range
  const dateRange = useMemo(() => {
    if (datePreset === 'custom') return { start: customStart, end: customEnd };
    return getPresetRange(datePreset);
  }, [datePreset, customStart, customEnd]);

  const dateVars = useMemo(() => ({
    startDate: dateRange.start || undefined,
    endDate: dateRange.end ? dateRange.end + 'T23:59:59.999Z' : undefined,
  }), [dateRange]);

  // ── Queries ──

  const {
    data: summaryData,
    loading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery(GET_SETTLEMENT_SUMMARY, {
    variables: {
      type: SettlementType.Business,
      businessId,
      ...dateVars,
    },
    skip: !businessId,
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: breakdownData,
    loading: breakdownLoading,
    refetch: refetchBreakdown,
  } = useQuery(GET_SETTLEMENT_BREAKDOWN, {
    variables: {
      type: SettlementType.Business,
      businessId,
      ...dateVars,
    },
    skip: !businessId,
    fetchPolicy: 'cache-and-network',
  });

  const { data, loading, refetch } = useQuery(GET_SETTLEMENTS_PAGE, {
    variables: {
      type: SettlementType.Business,
      businessId,
      direction: directionFilter === 'all' ? undefined : directionFilter,
      isSettled: settledFilter === 'all' ? undefined : settledFilter === 'settled',
      category: categoryFilter ?? undefined,
      ...dateVars,
      limit: 200,
    },
    skip: !businessId,
    fetchPolicy: 'cache-and-network',
  });

  const { data: requestsData, loading: requestsLoading, refetch: refetchRequests } = useQuery(GET_SETTLEMENT_REQUESTS, {
    variables: { businessId, limit: 20 },
    skip: !businessId,
    fetchPolicy: 'network-only',
  });

  const [createSettlementRequest] = useMutation(CREATE_SETTLEMENT_REQUEST);

  // ── Derived data ──

  const summary = summaryData?.settlementSummary;
  const breakdown = breakdownData?.settlementBreakdown ?? [];
  const settlements: SettlementRecord[] = data?.settlements ?? [];
  const settlementRequests: SettlementRequestRecord[] = requestsData?.settlementRequests ?? [];

  // Search filter
  const normalized = searchQuery.trim().toLowerCase();
  const filtered = settlements.filter((s) => {
    if (!normalized) return true;
    return [s.id, s.order?.id, s.order?.displayId, s.business?.name]
      .filter(Boolean)
      .some((v) => v!.toString().toLowerCase().includes(normalized));
  });

  // Group filtered settlements by order
  const orderGroups = useMemo(() => {
    const grouped: Record<string, OrderGroup> = {};
    filtered.forEach((s) => {
      const orderId = s.order?.id ?? s.id;
      if (!grouped[orderId]) {
        grouped[orderId] = {
          orderId,
          orderDisplayId: s.order?.displayId ?? s.order?.id?.slice(0, 8) ?? '—',
          order: s.order,
          settlements: [],
          totalReceivable: 0,
          totalPayable: 0,
          latestCreatedAt: s.createdAt,
        };
      }
      grouped[orderId].settlements.push(s);
      const amount = Number(s.amount ?? 0);
      if (s.direction === SettlementDirection.Receivable) {
        grouped[orderId].totalReceivable += amount;
      } else {
        grouped[orderId].totalPayable += amount;
      }
      if (new Date(s.createdAt).getTime() > new Date(grouped[orderId].latestCreatedAt).getTime()) {
        grouped[orderId].latestCreatedAt = s.createdAt;
      }
    });
    return Object.values(grouped).sort(
      (a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime(),
    );
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(orderGroups.length / PAGE_SIZE));
  const pagedGroups = orderGroups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Breakdown totals
  const totalReceivable = breakdown
    .filter((b) => b.direction === SettlementDirection.Receivable)
    .reduce((s, i) => s + i.totalAmount, 0);
  const totalPayable = breakdown
    .filter((b) => b.direction === SettlementDirection.Payable)
    .reduce((s, i) => s + i.totalAmount, 0);
  const netEarnings = totalPayable - totalReceivable;

  // ── Handlers ──

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch(), refetchSummary(), refetchBreakdown(), refetchRequests()]);
    setPage(0);
  }, [refetch, refetchSummary, refetchBreakdown, refetchRequests]);

  const handleDirectionFilter = (val: typeof directionFilter) => { setDirectionFilter(val); setPage(0); };
  const handleSettledFilter = (val: typeof settledFilter) => { setSettledFilter(val); setPage(0); };
  const handleSearch = (val: string) => { setSearchQuery(val); setPage(0); };

  const handleCategoryClick = (category: string) => {
    setCategoryFilter(categoryFilter === category ? null : category);
    setPage(0);
  };

  const openRequestDialog = () => {
    const pending = summary?.totalPending ?? 0;
    setReqAmount(Number(pending) > 0 ? Number(pending).toFixed(2) : '');
    setReqNote('');
    setRequestDialogOpen(true);
  };

  const handleSubmitRequest = async () => {
    const amount = parseFloat(reqAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter a valid amount greater than 0.', variant: 'destructive' });
      return;
    }
    setReqSubmitting(true);
    try {
      await createSettlementRequest({
        variables: { businessId, amount, note: reqNote.trim() || undefined },
      });
      toast({ title: 'Request sent', description: `Settlement request of €${amount.toFixed(2)} submitted.` });
      setRequestDialogOpen(false);
      await refetchRequests();
    } catch (error) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setReqSubmitting(false);
    }
  };

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <Wallet className="h-10 w-10 text-zinc-600 mx-auto" />
          <p className="text-sm text-zinc-400">No business is assigned to your account.</p>
          <p className="text-xs text-zinc-600">Ask a super admin to assign your business first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6 pb-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Settlements</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Financial overview and settlement history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={openRequestDialog}
            className="h-8 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Send className="h-3.5 w-3.5" />
            Request Settlement
          </Button>
        </div>
      </div>

      {/* ── Period selector ── */}
      <div className="flex items-end gap-3">
        <div className="flex gap-1 rounded-lg bg-zinc-900 border border-zinc-800 p-1">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => { setDatePreset(p.value); setPage(0); }}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md transition-colors',
                datePreset === p.value
                  ? 'bg-zinc-700 text-zinc-100 font-medium'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {datePreset === 'custom' && (
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-zinc-500">From</Label>
              <Input
                type="date"
                value={customStart}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomStart(e.target.value)}
                className="w-[130px] h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-zinc-500">To</Label>
              <Input
                type="date"
                value={customEnd}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomEnd(e.target.value)}
                className="w-[130px] h-8 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard
          icon={<Wallet className="h-4 w-4 text-zinc-400" />}
          label="Total"
          value={Number(summary?.totalAmount ?? 0)}
          sub={`${summary?.count ?? 0} settlements`}
          color="text-zinc-100"
          loading={summaryLoading && !summary}
        />
        <SummaryCard
          icon={<Clock className="h-4 w-4 text-yellow-400" />}
          label="Pending"
          value={Number(summary?.totalPending ?? 0)}
          sub={`${summary?.pendingCount ?? 0} unsettled`}
          color="text-yellow-400"
          loading={summaryLoading && !summary}
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4 text-green-400" />}
          label="Paid Out"
          value={Number(summary?.totalPaid ?? 0)}
          sub="Completed"
          color="text-green-400"
          loading={summaryLoading && !summary}
        />
        <SummaryCard
          icon={netEarnings >= 0
            ? <TrendingUp className="h-4 w-4 text-green-400" />
            : <TrendingDown className="h-4 w-4 text-red-400" />}
          label="Net Earnings"
          value={netEarnings}
          sub={netEarnings >= 0 ? 'Platform owes you' : 'You owe platform'}
          color={netEarnings >= 0 ? 'text-green-400' : 'text-red-400'}
          signed
          loading={breakdownLoading && breakdown.length === 0}
        />
      </div>

      {/* ── Settlement Requests ── */}
      {(settlementRequests.length > 0 || requestsLoading) && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/50">
            <span className="text-sm font-medium text-zinc-200">Settlement Requests</span>
          </div>
          <div className="p-3 space-y-1.5">
            {requestsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              settlementRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-zinc-100">
                      €{Number(req.amount).toFixed(2)}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                    {req.note && (
                      <span className="text-xs text-zinc-500 italic truncate max-w-[200px]">
                        &ldquo;{req.note}&rdquo;
                      </span>
                    )}
                    {req.reason && (
                      <span className="text-xs text-red-400">Reason: {req.reason}</span>
                    )}
                  </div>
                  <Badge
                    className={cn(
                      'text-[11px]',
                      req.status === 'PENDING' && 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
                      req.status === 'ACCEPTED' && 'bg-green-600/20 text-green-400 border-green-600/30',
                      req.status === 'REJECTED' && 'bg-red-600/20 text-red-400 border-red-600/30',
                    )}
                    variant="outline"
                  >
                    {req.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* ── Breakdown by Category ── */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-zinc-200">Breakdown by Category</span>
            <span className="text-[11px] text-zinc-500 ml-2">Click to filter orders below</span>
          </div>
          {categoryFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setCategoryFilter(null); setPage(0); }}
              className="h-6 text-[11px] text-zinc-500 hover:text-zinc-300 gap-1 px-2"
            >
              <X className="h-3 w-3" />
              Clear filter
            </Button>
          )}
        </div>
        <div className="divide-y divide-zinc-800/50">
          {breakdownLoading && breakdown.length === 0 ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : breakdown.length === 0 ? (
            <div className="p-10 text-center text-zinc-500 text-sm">
              No settlements in this period
            </div>
          ) : (
            breakdown.map((item) => {
              const meta = CATEGORY_META[item.category];
              const color = meta?.chartColor ?? '#71717a';
              const isActive = categoryFilter === item.category;
              const total = breakdown.reduce((s, i) => s + i.totalAmount, 0);
              const pct = total > 0 ? (item.totalAmount / total) * 100 : 0;
              return (
                <button
                  key={`${item.category}-${item.direction}`}
                  onClick={() => handleCategoryClick(item.category)}
                  className={cn(
                    'w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors',
                    isActive ? 'bg-zinc-800/60' : 'hover:bg-zinc-900/30',
                  )}
                >
                  <div
                    className={cn('w-2.5 h-2.5 rounded-full shrink-0 transition-shadow', isActive && 'ring-2 ring-offset-1 ring-offset-zinc-900')}
                    style={{ backgroundColor: color, ...(isActive ? { boxShadow: `0 0 0 2px ${color}40` } : {}) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-200 font-medium truncate">
                          {meta?.label ?? item.label}
                        </span>
                        <Badge
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            item.direction === SettlementDirection.Receivable
                              ? 'bg-red-600/15 text-red-400 border-red-600/25'
                              : 'bg-green-600/15 text-green-400 border-green-600/25',
                          )}
                          variant="outline"
                        >
                          {item.direction === SettlementDirection.Receivable ? 'You owe' : 'You earn'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tabular-nums text-zinc-100 shrink-0">
                          €{item.totalAmount.toFixed(2)}
                        </span>
                        <ChevronRight className={cn('h-3.5 w-3.5 text-zinc-600 transition-transform', isActive && 'rotate-90 text-zinc-400')} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[11px] text-zinc-500 tabular-nums w-9 text-right shrink-0">
                        {pct.toFixed(0)}%
                      </span>
                      <span className="text-[11px] text-zinc-600 tabular-nums shrink-0">
                        {item.count} stl.
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Card>

      {/* ── Settlement Orders ── */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">Settlement Orders</span>
            {categoryFilter && (
              <Badge className="text-[10px] bg-zinc-700 text-zinc-300 border-zinc-600" variant="outline">
                {CATEGORY_META[categoryFilter]?.label ?? categoryFilter}
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-zinc-500 tabular-nums">
            {orderGroups.length} order{orderGroups.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-zinc-800/50 flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 rounded-md bg-zinc-900 border border-zinc-800 p-0.5">
            {(['all', SettlementDirection.Receivable, SettlementDirection.Payable] as const).map((val) => (
              <button
                key={val}
                onClick={() => handleDirectionFilter(val)}
                className={cn(
                  'px-2.5 py-1 text-[11px] rounded transition-colors',
                  directionFilter === val
                    ? 'bg-zinc-700 text-zinc-100 font-medium'
                    : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                {val === 'all' ? 'All' : val === SettlementDirection.Receivable ? 'You Owe' : 'You Earn'}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-md bg-zinc-900 border border-zinc-800 p-0.5">
            {(['all', 'unsettled', 'settled'] as const).map((val) => (
              <button
                key={val}
                onClick={() => handleSettledFilter(val)}
                className={cn(
                  'px-2.5 py-1 text-[11px] rounded transition-colors capitalize',
                  settledFilter === val
                    ? 'bg-zinc-700 text-zinc-100 font-medium'
                    : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                {val}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[160px]">
            <Input
              placeholder="Search by order ID…"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-7 text-xs bg-zinc-900 border-zinc-800"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-500 text-xs">Order</TableHead>
                <TableHead className="text-zinc-500 text-xs">Lines</TableHead>
                <TableHead className="text-zinc-500 text-xs">You Owe</TableHead>
                <TableHead className="text-zinc-500 text-xs">You Earn</TableHead>
                <TableHead className="text-zinc-500 text-xs">Net</TableHead>
                <TableHead className="text-zinc-500 text-xs">Status</TableHead>
                <TableHead className="text-zinc-500 text-xs">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-zinc-800">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : orderGroups.length === 0 ? (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={7} className="text-center text-zinc-500 py-10 text-sm">
                    No settlements found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                pagedGroups.map((og) => {
                  const netAmount = og.totalPayable - og.totalReceivable;
                  const allSettled = og.settlements.every((s: SettlementRecord) => !!s.isSettled);
                  return (
                    <TableRow
                      key={og.orderId}
                      className="border-zinc-800 hover:bg-zinc-900/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedOrderGroup(og);
                        if (og.order?.id) {
                          fetchFinancials({ variables: { orderId: og.order.id, businessId } });
                        }
                      }}
                    >
                      <TableCell className="font-mono text-xs text-zinc-300">
                        {og.orderDisplayId}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500 tabular-nums">{og.settlements.length}</TableCell>
                      <TableCell className="text-xs font-medium tabular-nums text-red-400">
                        {og.totalReceivable > 0 ? `€${og.totalReceivable.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-medium tabular-nums text-green-400">
                        {og.totalPayable > 0 ? `€${og.totalPayable.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className={cn('text-xs font-semibold tabular-nums', netAmount >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {netAmount >= 0 ? '+' : ''}€{netAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>{statusBadge(allSettled)}</TableCell>
                      <TableCell className="text-zinc-500 text-xs tabular-nums">
                        {og.latestCreatedAt ? new Date(og.latestCreatedAt).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {orderGroups.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
            <span className="text-[11px] text-zinc-600 tabular-nums">
              Page {page + 1} of {totalPages} &middot; {orderGroups.length} orders
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Request Settlement Dialog ── */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle>Request Settlement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-zinc-300">Amount (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={reqAmount}
                onChange={(e) => setReqAmount(e.target.value)}
                className="mt-1 bg-zinc-800 border-zinc-700 text-white"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Note (optional)</Label>
              <Input
                value={reqNote}
                onChange={(e) => setReqNote(e.target.value)}
                className="mt-1 bg-zinc-800 border-zinc-700 text-white"
                placeholder="Any notes for the admin…"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitRequest}
                disabled={reqSubmitting}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {reqSubmitting ? 'Sending…' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Order Financial Breakdown Dialog ── */}
      <Dialog open={selectedOrderGroup !== null} onOpenChange={(open) => { if (!open) setSelectedOrderGroup(null); }}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Order Financial Breakdown</DialogTitle>
          </DialogHeader>
          {selectedOrderGroup && (() => {
            const og = selectedOrderGroup;
            const fin = financialsData?.businessOrderFinancials;
            const netAmount = og.totalPayable - og.totalReceivable;
            const allSettled = og.settlements.every((s: SettlementRecord) => !!s.isSettled);
            return (
              <div className="space-y-4 mt-2">
                {/* Order info */}
                <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Order</span>
                    <span className="font-mono text-zinc-200">{og.orderDisplayId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Date</span>
                    <span className="text-zinc-200">{og.latestCreatedAt ? new Date(og.latestCreatedAt).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Net</span>
                    <span className={cn('font-semibold', netAmount >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {netAmount >= 0 ? '+' : ''}€{netAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Status</span>
                    {statusBadge(allSettled)}
                  </div>
                </div>

                {/* Settlement lines */}
                <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-3 space-y-2">
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Settlement Lines</p>
                  {og.settlements.map((s: SettlementRecord) => (
                    <div key={s.id} className="flex justify-between text-sm items-center">
                      <div className="flex items-center gap-2">
                        {directionBadge(s.direction)}
                        {statusBadge(!!s.isSettled)}
                      </div>
                      <span className={cn('font-medium tabular-nums', s.direction === SettlementDirection.Payable ? 'text-green-400' : 'text-red-400')}>
                        {s.direction === SettlementDirection.Payable ? '+' : '-'}€{Number(s.amount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="h-px bg-zinc-700 my-1" />
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-white">Net</span>
                    <span className={cn('tabular-nums', netAmount >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {netAmount >= 0 ? '+' : ''}€{netAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Financial breakdown from API */}
                {financialsLoading ? (
                  <Skeleton className="h-24 w-full rounded-lg" />
                ) : fin ? (
                  <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Price Breakdown</p>

                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Payment Method</span>
                      <Badge
                        className={cn(
                          fin.paymentCollection === 'CASH_TO_DRIVER'
                            ? 'bg-amber-600/20 text-amber-400 border-amber-600/30'
                            : 'bg-blue-600/20 text-blue-400 border-blue-600/30',
                        )}
                        variant="outline"
                      >
                        {fin.paymentCollection === 'CASH_TO_DRIVER' ? 'Cash' : 'Prepaid'}
                      </Badge>
                    </div>

                    <div className="h-px bg-zinc-700 my-1" />

                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Business Price</span>
                      <span className="text-zinc-200 tabular-nums">€{fin.businessPrice.toFixed(2)}</span>
                    </div>

                    {fin.markupAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Platform Markup</span>
                        <span className="text-zinc-500 tabular-nums">+€{fin.markupAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Customer Paid</span>
                      <span className="text-zinc-200 tabular-nums">€{fin.customerPaid.toFixed(2)}</span>
                    </div>

                    <div className="h-px bg-zinc-700 my-1" />

                    {fin.amountOwedToBusiness > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Owed to Business</span>
                        <span className="text-green-400 font-medium tabular-nums">+€{fin.amountOwedToBusiness.toFixed(2)}</span>
                      </div>
                    )}

                    {fin.amountOwedByBusiness > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Owed by Business</span>
                        <span className="text-red-400 font-medium tabular-nums">-€{fin.amountOwedByBusiness.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="h-px bg-zinc-700 my-1" />

                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-white">Business Net Earnings</span>
                      <span className={cn('tabular-nums', fin.businessNetEarnings >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {fin.businessNetEarnings >= 0 ? '+' : ''}€{fin.businessNetEarnings.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : og.order?.id ? (
                  <p className="text-sm text-zinc-500 text-center py-4">No financial data available.</p>
                ) : null}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Summary Card ──

function SummaryCard({
  icon,
  label,
  value,
  sub,
  color,
  signed,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  color: string;
  signed?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return <Card className="p-4"><Skeleton className="h-16 w-full" /></Card>;
  }
  const display = signed
    ? `${value >= 0 ? '+' : '−'}€${Math.abs(value).toFixed(2)}`
    : `€${value.toFixed(2)}`;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn('text-2xl font-bold tabular-nums mt-2', color)}>{display}</div>
      <div className="text-[11px] text-zinc-600 mt-1">{sub}</div>
    </Card>
  );
}
