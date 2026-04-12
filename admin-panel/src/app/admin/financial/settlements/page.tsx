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
import { ChevronLeft, ChevronRight, RefreshCw, Banknote, X, Search, Building2, Truck, ArrowUpDown } from 'lucide-react';
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
} from '@/graphql/operations/settlements/settlementRules';

type SettlementRecord = SettlementsPageQuery['settlements'][number];

// Entity scope: 'all' | 'business:<id>' | 'driver:<id>' | 'all-businesses' | 'all-drivers'
type EntityScope = string;

function parseScope(scope: EntityScope) {
  if (scope.startsWith('business:')) return { type: SettlementType.Business as const, id: scope.slice(9) };
  if (scope.startsWith('driver:')) return { type: SettlementType.Driver as const, id: scope.slice(7) };
  if (scope === 'all-businesses') return { type: SettlementType.Business as const, id: undefined };
  if (scope === 'all-drivers') return { type: SettlementType.Driver as const, id: undefined };
  return { type: undefined, id: undefined };
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function SettlementsPage() {
  const { toast } = useToast();

  // Filters
  const [entityScope, setEntityScope] = useState<EntityScope>('all');
  const [directionFilter, setDirectionFilter] = useState<SettlementDirection | 'ALL'>('ALL');
  const [settledFilter, setSettledFilter] = useState<'all' | 'settled' | 'unsettled'>('unsettled');
  const [orderSearch, setOrderSearch] = useState('');
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
  const { data: driversData } = useQuery(GET_DRIVERS_WITH_BALANCE);
  const businesses = useMemo(() => (businessesData?.businesses ?? []) as { id: string; name: string }[], [businessesData]);
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

  // Derive filter values from entity scope
  const scopeParsed = useMemo(() => parseScope(entityScope), [entityScope]);

  // Build query variables — driverId is now server-side
  const queryVars = useMemo(() => ({
    type: scopeParsed.type,
    direction: directionFilter === 'ALL' ? undefined : directionFilter,
    isSettled: settledFilter === 'all' ? undefined : settledFilter === 'settled',
    businessId: scopeParsed.type === SettlementType.Business ? scopeParsed.id : undefined,
    driverId: scopeParsed.type === SettlementType.Driver ? scopeParsed.id : undefined,
    startDate: startDate || undefined,
    endDate: endDate ? endDate + 'T23:59:59.999Z' : undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  }), [scopeParsed, directionFilter, settledFilter, startDate, endDate, page, pageSize]);

  const summaryVars = useMemo(() => ({
    type: scopeParsed.type,
    direction: directionFilter === 'ALL' ? undefined : directionFilter,
    isSettled: settledFilter === 'all' ? undefined : settledFilter === 'settled',
    businessId: scopeParsed.type === SettlementType.Business ? scopeParsed.id : undefined,
    driverId: scopeParsed.type === SettlementType.Driver ? scopeParsed.id : undefined,
    startDate: startDate || undefined,
    endDate: endDate ? endDate + 'T23:59:59.999Z' : undefined,
  }), [scopeParsed, directionFilter, settledFilter, startDate, endDate]);

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

  // Client-side order search only (driver is now server-side)
  const filteredSettlements = useMemo(() => {
    let result = settlementsList as SettlementRecord[];
    if (orderSearch.trim()) {
      const q = orderSearch.trim().toLowerCase();
      result = result.filter((s) => {
        const orderId = s.order?.id?.toLowerCase() ?? '';
        const displayId = s.order?.displayId?.toString() ?? '';
        return orderId.includes(q) || displayId.includes(q);
      });
    }
    return result;
  }, [settlementsList, orderSearch]);

  const totalCount = summary?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Net balance: receivable - payable (from current filters)
  const netBalance = (summary?.totalReceivable ?? 0) - (summary?.totalPayable ?? 0);

  // Derive scope label for display
  const scopeLabel = useMemo(() => {
    if (entityScope === 'all') return null;
    if (entityScope === 'all-businesses') return 'All Businesses';
    if (entityScope === 'all-drivers') return 'All Drivers';
    if (entityScope.startsWith('business:')) {
      const biz = businesses.find(b => b.id === scopeParsed.id);
      return biz?.name ?? 'Business';
    }
    if (entityScope.startsWith('driver:')) {
      const drv = drivers.find((d: any) => d.id === scopeParsed.id);
      return drv?.name ?? 'Driver';
    }
    return null;
  }, [entityScope, scopeParsed, businesses, drivers]);

  const hasActiveFilters = entityScope !== 'all' || directionFilter !== 'ALL' || settledFilter !== 'unsettled' || startDate || endDate;

  const handleRefresh = async () => {
    await Promise.all([refetchSettlements(), refetchSummary()]);
  };

  const resetFilters = () => {
    setEntityScope('all');
    setDirectionFilter('ALL');
    setSettledFilter('unsettled');
    setOrderSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Open settle dialog — pre-fill from current scope if viewing a specific entity
  const openSettleDialog = () => {
    if (scopeParsed.type && scopeParsed.id) {
      setSettleEntityType(scopeParsed.type as 'BUSINESS' | 'DRIVER');
      setSettleEntityId(scopeParsed.id);
    } else {
      setSettleEntityType('');
      setSettleEntityId('');
    }
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
      await createSettlementRequest({
        variables: {
          businessId: settleEntityType === 'BUSINESS' ? settleEntityId : undefined,
          driverId: settleEntityType === 'DRIVER' ? settleEntityId : undefined,
          amount,
          note: settleNote.trim() || undefined,
        },
      });
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

  // Check if scope is a specific entity (not "all" or "all-businesses"/"all-drivers")
  const isSpecificEntity = scopeParsed.type && scopeParsed.id;

  return (
    <div className="flex flex-col gap-4 p-6 pb-10">
      {/* Header row: Entity scope + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-zinc-100">Settlements</h2>
          {scopeLabel && (
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-800 pl-3 pr-1.5 py-1 text-sm text-zinc-300">
              {scopeParsed.type === SettlementType.Business
                ? <Building2 className="h-3.5 w-3.5 text-blue-400" />
                : <Truck className="h-3.5 w-3.5 text-emerald-400" />}
              {scopeLabel}
              <button
                onClick={() => { setEntityScope('all'); setPage(1); }}
                className="ml-1 rounded-full p-0.5 hover:bg-zinc-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={openSettleDialog} className="bg-green-600 hover:bg-green-700 h-8">
            <Banknote className="h-4 w-4 mr-1.5" />
            Request Payment
          </Button>
        </div>
      </div>

      {/* Filters — compact single row */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Scope</Label>
          <Select value={entityScope} onValueChange={(v) => { setEntityScope(v); setPage(1); }}>
            <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="all-businesses">All Businesses</SelectItem>
              <SelectItem value="all-drivers">All Drivers</SelectItem>
              {businesses.length > 0 && (
                <div className="px-2 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Businesses</div>
              )}
              {businesses.map((b) => (
                <SelectItem key={b.id} value={`business:${b.id}`}>{b.name}</SelectItem>
              ))}
              {drivers.length > 0 && (
                <div className="px-2 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Drivers</div>
              )}
              {drivers.map((d: any) => (
                <SelectItem key={d.id} value={`driver:${d.id}`}>
                  {d.name}{d.phone ? ` · ${d.phone}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Direction</Label>
          <Select value={directionFilter} onValueChange={(v) => { setDirectionFilter(v as any); setPage(1); }}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
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
            <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unsettled">Unsettled</SelectItem>
              <SelectItem value="settled">Settled</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setStartDate(e.target.value); setPage(1); }}
            className="w-[130px] h-8 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEndDate(e.target.value); setPage(1); }}
            className="w-[130px] h-8 text-xs"
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs text-zinc-500">
            <X className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Summary Cards — 3 cards: Receivable, Payable, Net */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 border-amber-500/10">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-amber-400/80">They owe us</div>
            <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-400">
              {summary?.pendingCount ?? 0} pending
            </Badge>
          </div>
          <div className="text-2xl font-bold tabular-nums text-amber-400 mt-1">
            EUR {(summary?.totalReceivable ?? 0).toFixed(2)}
          </div>
        </Card>
        <Card className="p-3 border-violet-500/10">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-violet-400/80">We owe them</div>
            <ArrowUpDown className="h-3 w-3 text-zinc-600" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-violet-400 mt-1">
            EUR {(summary?.totalPayable ?? 0).toFixed(2)}
          </div>
        </Card>
        <Card className={cn(
          'p-3 border',
          netBalance >= 0 ? 'border-green-500/20 bg-green-500/[0.03]' : 'border-red-500/20 bg-red-500/[0.03]',
        )}>
          <div className="text-xs font-medium text-muted-foreground">Net balance</div>
          <div className={cn(
            'text-2xl font-bold tabular-nums mt-1',
            netBalance >= 0 ? 'text-green-400' : 'text-red-400',
          )}>
            {netBalance >= 0 ? '+' : '−'}EUR {Math.abs(netBalance).toFixed(2)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {netBalance >= 0 ? 'Platform earns' : 'Platform owes'}
            {' · '}{summary?.count ?? 0} settlements
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              placeholder="Search order #..."
              value={orderSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderSearch(e.target.value)}
              className="w-[180px] h-7 pl-8 text-xs bg-transparent border-zinc-800"
            />
          </div>
          <div className="text-xs text-zinc-500 tabular-nums">
            {totalCount > 0 ? `${totalCount} result${totalCount !== 1 ? 's' : ''}` : 'No results'}
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-zinc-800 bg-[#09090b]">
                <TableHead className="text-zinc-500 text-xs">Entity</TableHead>
                <TableHead className="text-zinc-500 text-xs">Direction</TableHead>
                <TableHead className="text-zinc-500 text-xs text-right">Amount</TableHead>
                <TableHead className="text-zinc-500 text-xs">Status</TableHead>
                <TableHead className="text-zinc-500 text-xs">Order</TableHead>
                <TableHead className="text-zinc-500 text-xs">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlementsLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-zinc-800">
                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredSettlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-zinc-500 py-16">
                    No settlements found. Try adjusting filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSettlements.map((s) => {
                  const entity = getEntityInfo(s);
                  return (
                    <TableRow
                      key={s.id}
                      className="border-b border-zinc-800 hover:bg-zinc-900/50 cursor-pointer"
                      onClick={() => {
                        if (entity) {
                          const key = entity.type === 'business' ? `business:${entity.id}` : `driver:${entity.id}`;
                          setEntityScope(key);
                          setPage(1);
                        }
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold',
                            s.type === 'BUSINESS'
                              ? 'bg-blue-500/15 text-blue-400'
                              : 'bg-emerald-500/15 text-emerald-400',
                          )}>
                            {s.type === 'BUSINESS' ? 'B' : 'D'}
                          </div>
                          <div>
                            <div className="text-sm text-zinc-200 font-medium">{entity?.name ?? '—'}</div>
                            {s.type === 'DRIVER' && s.driver?.phoneNumber && (
                              <div className="text-[11px] text-zinc-600">{s.driver.phoneNumber}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'text-xs font-medium',
                          s.direction === 'RECEIVABLE' ? 'text-amber-400' : 'text-violet-400',
                        )}>
                          {s.direction === 'RECEIVABLE' ? 'Receivable' : 'Payable'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-zinc-200 text-sm">
                        EUR {Number(s.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          'inline-flex items-center gap-1 text-xs',
                          s.isSettled ? 'text-green-400' : 'text-orange-400',
                        )}>
                          <div className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            s.isSettled ? 'bg-green-400' : 'bg-orange-400',
                          )} />
                          {s.isSettled ? 'Settled' : 'Pending'}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-zinc-400">
                        {s.order
                          ? `#${s.order.displayId || s.order.id?.slice(-6)}`
                          : <span className="text-zinc-600 italic">carry-fwd</span>}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500 tabular-nums">
                        {new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[60px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>per page</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-7 w-7 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-zinc-400 px-2 tabular-nums">{page} / {totalPages}</span>
            <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="h-7 w-7 p-0">
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

