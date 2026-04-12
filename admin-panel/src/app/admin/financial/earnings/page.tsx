'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { RefreshCw, X, TrendingUp, Wallet, DollarSign, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettlementType, SettlementDirection } from '@/gql/graphql';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import {
  GET_SETTLEMENT_SUMMARY,
  GET_SETTLEMENT_BREAKDOWN,
  GET_EARNINGS_TREND,
  GET_DRIVERS_WITH_BALANCE,
} from '@/graphql/operations/settlements/queries';
import {
  GET_BUSINESSES_SELECTION,
} from '@/graphql/operations/settlements/settlementRules';

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
    case 'year': {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return { start: fmt(yearStart), end: fmt(today) };
    }
    case 'all':
      return { start: '2024-01-01', end: fmt(today) };
    default:
      return { start: '', end: '' };
  }
}

// ── Category metadata ──

const CATEGORY_META: Record<string, { color: string; chartColor: string; label: string }> = {
  PLATFORM_COMMISSION: { color: 'text-blue-400', chartColor: '#60a5fa', label: 'Order Commission' },
  DELIVERY_COMMISSION: { color: 'text-cyan-400', chartColor: '#22d3ee', label: 'Delivery Commission' },
  AUTO_REMITTANCE: { color: 'text-amber-400', chartColor: '#fbbf24', label: 'Markup & Surcharge' },
  STOCK_REMITTANCE: { color: 'text-orange-400', chartColor: '#fb923c', label: 'Inventory Items' },
  CATALOG_REVENUE: { color: 'text-emerald-400', chartColor: '#34d399', label: 'Catalog Products' },
  DRIVER_TIP: { color: 'text-violet-400', chartColor: '#a78bfa', label: 'Driver Tips' },
  PROMOTION_COST: { color: 'text-rose-400', chartColor: '#fb7185', label: 'Promotion Adjustments' },
};

function getCategoryColor(category: string) {
  return CATEGORY_META[category]?.color ?? 'text-zinc-400';
}

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

// ── Page ──

export default function PlatformEarningsPage() {
  // Date preset
  const [datePreset, setDatePreset] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Entity filters
  const [typeFilter, setTypeFilter] = useState<SettlementType | 'ALL'>('ALL');
  const [businessId, setBusinessId] = useState<string>('ALL');
  const [driverId, setDriverId] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Data for entity selects
  const { data: businessesData } = useQuery(GET_BUSINESSES_SELECTION);
  const { data: driversData } = useQuery(GET_DRIVERS_WITH_BALANCE);
  const businesses = useMemo(() => (businessesData?.businesses ?? []) as { id: string; name: string }[], [businessesData]);
  const drivers = useMemo(
    () => (driversData?.drivers ?? []).map((d: any) => ({ id: d.id, name: `${d.firstName} ${d.lastName}`.trim() })),
    [driversData],
  );

  // Compute effective date range
  const dateRange = useMemo(() => {
    if (datePreset === 'custom') return { start: customStart, end: customEnd };
    return getPresetRange(datePreset);
  }, [datePreset, customStart, customEnd]);

  // Shared filter variables (no category filter — that's client-side)
  const filterVars = useMemo(() => ({
    type: typeFilter === 'ALL' ? undefined : typeFilter,
    businessId: businessId !== 'ALL' ? businessId : undefined,
    driverId: driverId !== 'ALL' ? driverId : undefined,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end ? dateRange.end + 'T23:59:59.999Z' : undefined,
  }), [typeFilter, businessId, driverId, dateRange]);

  // Queries
  const {
    data: summaryData,
    loading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery(GET_SETTLEMENT_SUMMARY, {
    variables: {
      ...filterVars,
      direction: SettlementDirection.Receivable,
    },
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: totalSummaryData,
  } = useQuery(GET_SETTLEMENT_SUMMARY, {
    variables: filterVars,
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: breakdownData,
    loading: breakdownLoading,
    refetch: refetchBreakdown,
  } = useQuery(GET_SETTLEMENT_BREAKDOWN, {
    variables: filterVars,
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: trendData,
    loading: trendLoading,
    refetch: refetchTrend,
  } = useQuery(GET_EARNINGS_TREND, {
    variables: {
      type: typeFilter === 'ALL' ? undefined : typeFilter,
      businessId: businessId !== 'ALL' ? businessId : undefined,
      driverId: driverId !== 'ALL' ? driverId : undefined,
      startDate: dateRange.start || '2024-01-01',
      endDate: (dateRange.end || fmt(new Date())) + 'T23:59:59.999Z',
    },
    fetchPolicy: 'cache-and-network',
  });

  const summary = summaryData?.settlementSummary;
  const totalSummary = totalSummaryData?.settlementSummary;
  const breakdown = breakdownData?.settlementBreakdown ?? [];
  const trendPoints = trendData?.earningsTrend ?? [];

  // Only receivable breakdown items
  const receivableItems = useMemo(
    () => breakdown.filter((b) => b.direction === SettlementDirection.Receivable),
    [breakdown],
  );

  // Apply category filter client-side
  const filteredItems = useMemo(() => {
    if (categoryFilter === 'ALL') return receivableItems;
    return receivableItems.filter((b) => b.category === categoryFilter);
  }, [receivableItems, categoryFilter]);

  // Totals
  const totalEarnings = filteredItems.reduce((s, i) => s + i.totalAmount, 0);
  const totalSettlements = filteredItems.reduce((s, i) => s + i.count, 0);
  const netBalance = (totalSummary?.totalReceivable ?? 0) - (totalSummary?.totalPayable ?? 0);

  // Available categories for filter (only ones that exist in data)
  const availableCategories = useMemo(() => {
    const cats = new Set(receivableItems.map((i) => i.category));
    return Object.entries(CATEGORY_META).filter(([key]) => cats.has(key));
  }, [receivableItems]);

  // Chart data — format dates for display
  const chartData = useMemo(() => {
    return trendPoints.map((p) => ({
      date: p.date,
      label: new Date(p.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      earnings: Number(p.receivable.toFixed(2)),
      net: Number(p.net.toFixed(2)),
      orders: p.count,
    }));
  }, [trendPoints]);

  const hasActiveFilters = typeFilter !== 'ALL' || businessId !== 'ALL' || driverId !== 'ALL' || categoryFilter !== 'ALL';

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchSummary(), refetchBreakdown(), refetchTrend()]);
  }, [refetchSummary, refetchBreakdown, refetchTrend]);

  const resetFilters = () => {
    setTypeFilter('ALL');
    setBusinessId('ALL');
    setDriverId('ALL');
    setCategoryFilter('ALL');
  };

  return (
    <div className="flex flex-col gap-5 p-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Platform Earnings</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            All revenue sources from settlements
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-8">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters — two rows */}
      <div className="flex flex-col gap-2">
        {/* Row 1: date presets + custom range */}
        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDatePreset(p.value)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md transition-colors',
                  datePreset === p.value
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {datePreset === 'custom' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomStart(e.target.value)}
                  className="w-[130px] h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomEnd(e.target.value)}
                  className="w-[130px] h-8 text-xs"
                />
              </div>
            </>
          )}
        </div>

        {/* Row 2: entity + category filters */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as any); setBusinessId('ALL'); setDriverId('ALL'); }}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value={SettlementType.Business}>Business</SelectItem>
                <SelectItem value={SettlementType.Driver}>Driver</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(typeFilter === 'ALL' || typeFilter === SettlementType.Business) && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Business</Label>
              <Select value={businessId} onValueChange={(v) => setBusinessId(v)}>
                <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Businesses</SelectItem>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(typeFilter === 'ALL' || typeFilter === SettlementType.Driver) && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Driver</Label>
              <Select value={driverId} onValueChange={(v) => setDriverId(v)}>
                <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Drivers</SelectItem>
                  {drivers.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
              <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {availableCategories.map(([key, meta]) => (
                  <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs text-zinc-500">
              <X className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4 text-green-400" />}
          label="Total Earnings"
          value={totalEarnings}
          sub={`${totalSettlements} settlements`}
          color="text-green-400"
          loading={summaryLoading && !summary}
        />
        <SummaryCard
          icon={<Wallet className="h-4 w-4 text-amber-400" />}
          label="Net Balance"
          value={netBalance}
          sub={netBalance >= 0 ? 'Platform positive' : 'Platform deficit'}
          color={netBalance >= 0 ? 'text-green-400' : 'text-red-400'}
          signed
          loading={summaryLoading && !summary}
        />
        <SummaryCard
          icon={<DollarSign className="h-4 w-4 text-zinc-400" />}
          label="Avg per Settlement"
          value={totalSettlements > 0 ? totalEarnings / totalSettlements : 0}
          sub={`across ${filteredItems.length} categories`}
          color="text-zinc-200"
          loading={summaryLoading && !summary}
        />
        <SummaryCard
          icon={<Hash className="h-4 w-4 text-zinc-400" />}
          label="Total Settlements"
          value={null}
          rawDisplay={String(totalSettlements)}
          sub={`${summary?.pendingCount ?? 0} unsettled`}
          color="text-zinc-200"
          loading={summaryLoading && !summary}
        />
      </div>

      {/* Trend Chart */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <span className="text-sm font-medium text-zinc-200">Earnings Trend</span>
          <span className="text-[11px] text-zinc-500 ml-2">Daily receivable earnings over time</span>
        </div>
        <div className="px-2 py-4" style={{ height: 280 }}>
          {trendLoading && chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-48 w-full mx-4" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
              No data for the selected period
            </div>
          ) : chartData.length <= 7 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v: number) => `€${v}`} width={55} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="earnings" fill="#34d399" radius={[4, 4, 0, 0]} name="Earnings" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="earnGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v: number) => `€${v}`} width={55} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  stroke="#34d399"
                  strokeWidth={2}
                  fill="url(#earnGradient)"
                  name="Earnings"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Breakdown */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-zinc-200">Earnings Breakdown</span>
            <span className="text-[11px] text-zinc-500 ml-2">Revenue by category</span>
          </div>
          {filteredItems.length > 0 && (
            <span className="text-xs font-bold tabular-nums text-green-400">
              EUR {totalEarnings.toFixed(2)}
            </span>
          )}
        </div>
        <div className="divide-y divide-zinc-800/50">
          {breakdownLoading && filteredItems.length === 0 ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-10 text-center text-zinc-500 text-sm">
              No earnings found for the selected filters
            </div>
          ) : (
            filteredItems.map((item) => {
              const pct = totalEarnings > 0 ? (item.totalAmount / totalEarnings) * 100 : 0;
              return <BreakdownRow key={`${item.category}-${item.label}`} item={item} percentage={pct} />;
            })
          )}
        </div>
      </Card>
    </div>
  );
}

// ── Components ──

function SummaryCard({
  icon,
  label,
  value,
  rawDisplay,
  sub,
  color,
  signed,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  rawDisplay?: string;
  sub: string;
  color: string;
  signed?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return <Card className="p-4"><Skeleton className="h-16 w-full" /></Card>;
  }
  const display = rawDisplay
    ?? (signed
      ? `${value! >= 0 ? '+' : '−'}EUR ${Math.abs(value!).toFixed(2)}`
      : `EUR ${(value ?? 0).toFixed(2)}`);
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className={cn('text-2xl font-bold tabular-nums mt-2', color)}>{display}</div>
      <div className="text-[11px] text-zinc-500 mt-1">{sub}</div>
    </Card>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <div className="font-medium text-zinc-200 mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">{p.name}</span>
          <span className="font-bold tabular-nums text-green-400">EUR {Number(p.value).toFixed(2)}</span>
        </div>
      ))}
      {payload[0]?.payload?.orders != null && (
        <div className="flex items-center justify-between gap-4 text-zinc-500 mt-0.5">
          <span>Settlements</span>
          <span className="tabular-nums">{payload[0].payload.orders}</span>
        </div>
      )}
    </div>
  );
}

interface BreakdownItem {
  category: string;
  label: string;
  totalAmount: number;
  count: number;
  direction: string;
}

function BreakdownRow({ item, percentage }: { item: BreakdownItem; percentage: number }) {
  const meta = CATEGORY_META[item.category];
  const color = meta?.chartColor ?? '#71717a';
  return (
    <div className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-900/30 transition-colors">
      <div className={cn('w-2.5 h-2.5 rounded-full shrink-0')} style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-200 font-medium truncate">{item.label}</span>
          <span className="text-sm font-bold tabular-nums text-zinc-100 ml-4 shrink-0">
            EUR {item.totalAmount.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-[11px] text-zinc-500 tabular-nums w-10 text-right shrink-0">
            {percentage.toFixed(1)}%
          </span>
          <span className="text-[11px] text-zinc-600 tabular-nums shrink-0">
            {item.count} stl.
          </span>
        </div>
      </div>
    </div>
  );
}
