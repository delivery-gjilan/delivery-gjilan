'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, RefreshCw, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SettlementType,
  SettlementDirection,
  type SettlementsPageQuery,
} from '@/gql/graphql';
import {
  GET_SETTLEMENTS_PAGE,
  GET_SETTLEMENT_SUMMARY,
  CREATE_SETTLEMENT_REQUEST,
  GET_UNSETTLED_BALANCE,
  GET_DRIVERS_WITH_BALANCE,
} from '@/graphql/operations/settlements/queries';
import {
  GET_BUSINESSES_SELECTION,
  GET_PROMOTIONS_SELECTION,
} from '@/graphql/operations/settlements/settlementRules';

type SettlementRecord = SettlementsPageQuery['settlements'][number];

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function SettlementsPage() {
  const { toast } = useToast();

  // Filters
  const [typeFilter, setTypeFilter] = useState<SettlementType | 'ALL'>('ALL');
  const [directionFilter, setDirectionFilter] = useState<SettlementDirection | 'ALL'>('ALL');
  const [settledFilter, setSettledFilter] = useState<'all' | 'settled' | 'unsettled'>('unsettled');
  const [businessFilter, setBusinessFilter] = useState<string>('all');
  const [driverSearch, setDriverSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [promotionFilter, setPromotionFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Settle dialog state
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [settleEntityType, setSettleEntityType] = useState<'BUSINESS' | 'DRIVER' | ''>('');
  const [settleEntityId, setSettleEntityId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  // Data
  const { data: businessesData } = useQuery(GET_BUSINESSES_SELECTION);
  const { data: promotionsData } = useQuery(GET_PROMOTIONS_SELECTION);
  const { data: driversData } = useQuery(GET_DRIVERS_WITH_BALANCE);
  const businesses = useMemo(() => (businessesData?.businesses ?? []) as { id: string; name: string }[], [businessesData]);
  const promotions = useMemo(() =>
    (promotionsData?.getAllPromotions || []).map((p: any) => ({ id: p.id, name: p.name, code: p.code })),
    [promotionsData],
  );
  const drivers = useMemo(() =>
    (driversData?.drivers ?? []).map((d: any) => ({ id: d.id, name: `${d.firstName} ${d.lastName}`.trim(), phone: d.phoneNumber })),
    [driversData],
  );

  // Lazy query for unsettled balance
  const [fetchBalance, { data: balanceData, loading: balanceLoading }] = useLazyQuery(GET_UNSETTLED_BALANCE, {
    fetchPolicy: 'network-only',
  });

  const unsettledBalance = balanceData?.unsettledBalance ?? null;

  // When entity is selected, fetch balance
  useEffect(() => {
    if (settleEntityType && settleEntityId) {
      fetchBalance({ variables: { entityType: settleEntityType as SettlementType, entityId: settleEntityId } });
    }
  }, [settleEntityType, settleEntityId, fetchBalance]);

  // When balance loads, set default amount
  useEffect(() => {
    if (unsettledBalance !== null && settleEntityId) {
      setSettleAmount(Math.abs(unsettledBalance).toFixed(2));
    }
  }, [unsettledBalance, settleEntityId]);

  // Build query variables
  const queryVars = useMemo(() => ({
    type: typeFilter === 'ALL' ? undefined : typeFilter,
    direction: directionFilter === 'ALL' ? undefined : directionFilter,
    isSettled: settledFilter === 'all' ? undefined : settledFilter === 'settled',
    businessId: businessFilter !== 'all' ? businessFilter : undefined,
    promotionId: promotionFilter !== 'all' ? promotionFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate ? endDate + 'T23:59:59.999Z' : undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  }), [typeFilter, directionFilter, settledFilter, businessFilter, promotionFilter, startDate, endDate, page, pageSize]);

  const summaryVars = useMemo(() => ({
    type: typeFilter === 'ALL' ? undefined : typeFilter,
    direction: directionFilter === 'ALL' ? undefined : directionFilter,
    isSettled: settledFilter === 'all' ? undefined : settledFilter === 'settled',
    businessId: businessFilter !== 'all' ? businessFilter : undefined,
    promotionId: promotionFilter !== 'all' ? promotionFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate ? endDate + 'T23:59:59.999Z' : undefined,
  }), [typeFilter, directionFilter, settledFilter, businessFilter, promotionFilter, startDate, endDate]);

  const {
    data: settlementsData,
    loading: settlementsLoading,
    refetch: refetchSettlements,
  } = useQuery(GET_SETTLEMENTS_PAGE, { variables: queryVars, fetchPolicy: 'cache-and-network' });

  const {
    data: summaryData,
    refetch: refetchSummary,
  } = useQuery(GET_SETTLEMENT_SUMMARY, { variables: summaryVars, fetchPolicy: 'cache-and-network' });

  const settlementsList = settlementsData?.settlements ?? [];
  const summary = summaryData?.settlementSummary;

  // Mutations
  const [createSettlementRequest] = useMutation(CREATE_SETTLEMENT_REQUEST);

  // Client-side search filtering for driver name / order ID
  const filteredSettlements = useMemo(() => {
    let result = settlementsList as SettlementRecord[];
    if (driverSearch.trim()) {
      const q = driverSearch.trim().toLowerCase();
      result = result.filter((s) => {
        const name = s.driver ? `${s.driver.firstName} ${s.driver.lastName}`.toLowerCase() : '';
        const phone = s.driver?.phoneNumber?.toLowerCase() ?? '';
        return name.includes(q) || phone.includes(q);
      });
    }
    if (orderSearch.trim()) {
      const q = orderSearch.trim().toLowerCase();
      result = result.filter((s) => {
        const orderId = s.order?.id?.toLowerCase() ?? '';
        const displayId = s.order?.displayId?.toString() ?? '';
        return orderId.includes(q) || displayId.includes(q);
      });
    }
    return result;
  }, [settlementsList, driverSearch, orderSearch]);

  const totalCount = summary?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Net balance: receivable - payable (from current filters)
  const netBalance = (summary?.totalReceivable ?? 0) - (summary?.totalPayable ?? 0);

  const handleRefresh = async () => {
    await Promise.all([refetchSettlements(), refetchSummary()]);
  };

  const resetFilters = () => {
    setTypeFilter('ALL');
    setDirectionFilter('ALL');
    setSettledFilter('unsettled');
    setBusinessFilter('all');
    setDriverSearch('');
    setOrderSearch('');
    setPromotionFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Open settle dialog
  const openSettleDialog = () => {
    setSettleEntityType('');
    setSettleEntityId('');
    setSettleAmount('');
    setSettleNote('');
    setSettleDialogOpen(true);
  };

  // Compute remainder info for the dialog
  const totalBalance = unsettledBalance !== null ? Math.abs(unsettledBalance) : 0;
  const enteredAmount = parseFloat(settleAmount) || 0;
  const remainder = totalBalance - enteredAmount;
  const balanceDirection = unsettledBalance !== null
    ? (unsettledBalance >= 0 ? 'ENTITY_TO_PLATFORM' : 'PLATFORM_TO_ENTITY')
    : null;

  // Settle handler — creates a settlement REQUEST (not a direct payment)
  const handleSettle = async () => {
    if (!settleEntityType || !settleEntityId) return;
    const amount = parseFloat(settleAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }
    if (amount > totalBalance) {
      toast({ title: 'Amount exceeds balance', variant: 'destructive' });
      return;
    }
    setSettleSubmitting(true);
    try {
      const now = new Date().toISOString();
      const { data } = await createSettlementRequest({
        variables: {
          businessId: settleEntityType === 'BUSINESS' ? settleEntityId : undefined,
          driverId: settleEntityType === 'DRIVER' ? settleEntityId : undefined,
          amount,
          periodStart: now,
          periodEnd: now,
          note: settleNote.trim() || undefined,
        },
      });
      const result = data?.createSettlementRequest;
      toast({
        title: 'Settlement request created',
        description: `Request for EUR ${amount.toFixed(2)} sent to ${settleEntityType === 'DRIVER' ? 'driver' : 'business'}. Awaiting their approval.`,
      });
      setSettleDialogOpen(false);
      await handleRefresh();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Failed to create request', variant: 'destructive' });
    } finally {
      setSettleSubmitting(false);
    }
  };

  const getEntityInfo = (s: SettlementRecord) => {
    if (s.type === 'BUSINESS' && s.business) {
      return { type: 'business' as const, id: s.business.id, name: s.business.name };
    }
    if (s.type === 'DRIVER' && s.driver) {
      return { type: 'driver' as const, id: s.driver.id, name: `${s.driver.firstName} ${s.driver.lastName}`.trim() };
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4 p-6 pb-10">
      {/* Filters */}
      <Card className="p-4 relative z-10">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as any); setPage(1); }}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value={SettlementType.Business}>Business</SelectItem>
                <SelectItem value={SettlementType.Driver}>Driver</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Direction</Label>
            <Select value={directionFilter} onValueChange={(v) => { setDirectionFilter(v as any); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value={SettlementDirection.Receivable}>Receivable</SelectItem>
                <SelectItem value={SettlementDirection.Payable}>Payable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={settledFilter} onValueChange={(v) => { setSettledFilter(v as any); setPage(1); }}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unsettled">Unsettled</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Business</Label>
            <Select value={businessFilter} onValueChange={(v) => { setBusinessFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Businesses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Businesses</SelectItem>
                {businesses.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Promotion</Label>
            <Select value={promotionFilter} onValueChange={(v) => { setPromotionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Promotions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Promotions</SelectItem>
                {promotions.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.code ? `${p.name} (${p.code})` : p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Driver</Label>
            <Input
              placeholder="Search driver..."
              value={driverSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDriverSearch(e.target.value)}
              className="w-[150px] h-9"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Order</Label>
            <Input
              placeholder="Order ID..."
              value={orderSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderSearch(e.target.value)}
              className="w-[130px] h-9"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setStartDate(e.target.value); setPage(1); }}
              className="w-[150px] h-9"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEndDate(e.target.value); setPage(1); }}
              className="w-[150px] h-9"
            />
          </div>

          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 text-xs">
            Reset
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="text-xs font-medium text-muted-foreground">Total</div>
          <div className="text-xl font-bold tabular-nums">EUR {(summary?.totalAmount ?? 0).toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">{summary?.count ?? 0} settlements</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs font-medium text-muted-foreground">Pending</div>
          <div className="text-xl font-bold tabular-nums text-orange-500">EUR {(summary?.totalPending ?? 0).toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">{summary?.pendingCount ?? 0} pending</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs font-medium text-muted-foreground">Paid</div>
          <div className="text-xl font-bold tabular-nums text-green-500">EUR {(summary?.totalPaid ?? 0).toFixed(2)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs font-medium text-muted-foreground">Receivable</div>
          <div className="text-xl font-bold tabular-nums text-amber-400">EUR {(summary?.totalReceivable ?? 0).toFixed(2)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs font-medium text-muted-foreground">Payable</div>
          <div className="text-xl font-bold tabular-nums text-violet-400">EUR {(summary?.totalPayable ?? 0).toFixed(2)}</div>
        </Card>
        <Card className={cn('p-3 border', netBalance >= 0 ? 'border-green-500/30' : 'border-red-500/30')}>
          <div className="text-xs font-medium text-muted-foreground">Net Balance</div>
          <div className={cn('text-xl font-bold tabular-nums', netBalance >= 0 ? 'text-green-400' : 'text-red-400')}>
            {netBalance >= 0 ? '+' : '-'}EUR {Math.abs(netBalance).toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            {netBalance >= 0 ? 'You will earn this much' : 'You will owe this much'}
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300">Settlements</h3>
          <Button size="sm" onClick={openSettleDialog} className="bg-green-600 hover:bg-green-700">
            <Banknote className="h-4 w-4 mr-1.5" />
            Request Settlement Payment
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-zinc-800 bg-[#09090b]">
                <TableHead className="text-zinc-500">Entity</TableHead>
                <TableHead className="text-zinc-500">Type</TableHead>
                <TableHead className="text-zinc-500">Direction</TableHead>
                <TableHead className="text-zinc-500 text-right">Amount</TableHead>
                <TableHead className="text-zinc-500">Status</TableHead>
                <TableHead className="text-zinc-500">Order</TableHead>
                <TableHead className="text-zinc-500">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlementsLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-zinc-800">
                    <TableCell colSpan={7}><Skeleton className="h-9 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredSettlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-zinc-500 py-16">
                    No settlements found. Try adjusting filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSettlements.map((s) => {
                  const entity = getEntityInfo(s);
                  return (
                    <TableRow key={s.id} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                      <TableCell className="text-zinc-300 font-medium">
                        {entity?.name ?? '-'}
                        <div className="text-xs text-zinc-600">
                          {s.type === 'DRIVER' && s.driver?.phoneNumber}
                          {s.type === 'BUSINESS' && s.business?.id?.slice(0, 8)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          'text-xs',
                          s.type === 'BUSINESS' ? 'border-blue-500/30 text-blue-400' : 'border-emerald-500/30 text-emerald-400'
                        )}>
                          {s.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn(
                          'text-xs',
                          s.direction === 'RECEIVABLE'
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-violet-500/15 text-violet-300'
                        )}>
                          {s.direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-zinc-200">
                        EUR {Number(s.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn(
                          'text-xs',
                          s.isSettled
                            ? 'bg-green-500/15 text-green-300'
                            : 'bg-orange-500/15 text-orange-300'
                        )}>
                          {s.isSettled ? 'Settled' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-zinc-400">
                        {s.order
                          ? `#${s.order.displayId || s.order.id?.slice(-6)}`
                          : <span className="text-zinc-600 italic">carry-forward</span>}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500 tabular-nums">
                        {new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-2">
              {totalCount > 0 ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalCount)} of ${totalCount}` : '0 results'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-zinc-400 px-2">Page {page} of {totalPages}</span>
            <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Settle Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Settlement Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Step 1: Entity type */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Settle with</Label>
              <Select
                value={settleEntityType || ''}
                onValueChange={(v) => {
                  setSettleEntityType(v as 'BUSINESS' | 'DRIVER');
                  setSettleEntityId('');
                  setSettleAmount('');
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUSINESS">Business</SelectItem>
                  <SelectItem value="DRIVER">Driver</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Entity selection */}
            {settleEntityType === 'BUSINESS' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Select Business</Label>
                <Select value={settleEntityId || ''} onValueChange={(v) => { setSettleEntityId(v); setSettleAmount(''); }}>
                  <SelectTrigger><SelectValue placeholder="Choose a business..." /></SelectTrigger>
                  <SelectContent>
                    {businesses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {settleEntityType === 'DRIVER' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Select Driver</Label>
                <Select value={settleEntityId || ''} onValueChange={(v) => { setSettleEntityId(v); setSettleAmount(''); }}>
                  <SelectTrigger><SelectValue placeholder="Choose a driver..." /></SelectTrigger>
                  <SelectContent>
                    {drivers.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}{d.phone ? ` (${d.phone})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 3: Balance + amount */}
            {settleEntityId && (
              <>
                {balanceLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : unsettledBalance !== null ? (
                  <Card className={cn(
                    'p-3 border',
                    Math.abs(unsettledBalance) === 0 ? 'border-zinc-700' : unsettledBalance >= 0 ? 'border-amber-500/30' : 'border-violet-500/30',
                  )}>
                    <div className="text-xs text-muted-foreground">Unsettled balance</div>
                    <div className={cn(
                      'text-lg font-bold tabular-nums',
                      Math.abs(unsettledBalance) === 0 ? 'text-zinc-400' : unsettledBalance >= 0 ? 'text-amber-400' : 'text-violet-400',
                    )}>
                      EUR {Math.abs(unsettledBalance).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.abs(unsettledBalance) === 0
                        ? 'No unsettled balance'
                        : unsettledBalance >= 0
                          ? 'They owe the platform'
                          : 'The platform owes them'}
                    </div>
                  </Card>
                ) : null}

                {totalBalance > 0 && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Payment Amount (EUR)</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={totalBalance.toFixed(2)}
                        value={settleAmount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettleAmount(e.target.value)}
                      />
                    </div>

                    {/* Remainder indicator */}
                    {enteredAmount > 0 && enteredAmount < totalBalance && (
                      <div className="rounded-md border border-orange-500/30 bg-orange-500/5 px-3 py-2 text-sm">
                        <span className="text-orange-400 font-medium">Partial payment.</span>{' '}
                        <span className="text-muted-foreground">
                          {balanceDirection === 'ENTITY_TO_PLATFORM'
                            ? `They will still owe EUR ${remainder.toFixed(2)}`
                            : `You will still owe them EUR ${remainder.toFixed(2)}`}
                        </span>
                      </div>
                    )}

                    {enteredAmount > 0 && enteredAmount >= totalBalance && (
                      <div className="rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm">
                        <span className="text-green-400 font-medium">Full settlement.</span>{' '}
                        <span className="text-muted-foreground">All unsettled balances will be cleared.</span>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Note (optional)</Label>
                      <textarea
                        rows={2}
                        placeholder="Optional note..."
                        value={settleNote}
                        onChange={(e) => setSettleNote(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" onClick={() => setSettleDialogOpen(false)} disabled={settleSubmitting}>Cancel</Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleSettle}
                        disabled={settleSubmitting || enteredAmount <= 0 || enteredAmount > totalBalance}
                      >
                        {settleSubmitting ? 'Sending...' : `Request EUR ${enteredAmount > 0 ? enteredAmount.toFixed(2) : '0.00'}`}
                      </Button>
                    </div>
                  </>
                )}

                {!balanceLoading && totalBalance === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No unsettled balance for this entity.
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

