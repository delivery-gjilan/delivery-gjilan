'use client';

import { useState, useMemo } from 'react';
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
import { RefreshCw, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SettlementType,
  SettlementDirection,
  type GetBusinessBalanceQuery,
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
  GET_BUSINESS_BALANCE,
  GET_SETTLEMENT_REQUESTS,
  CREATE_SETTLEMENT_REQUEST,
  GET_BUSINESS_ORDER_FINANCIALS,
} from '@/graphql/operations/settlements/queries';

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Failed to create request';
}

function directionBadge(direction: string | null | undefined) {
  if (direction === SettlementDirection.Receivable)
    return <Badge className="bg-green-600 text-white">Receivable</Badge>;
  if (direction === SettlementDirection.Payable)
    return <Badge className="bg-amber-600 text-white">Payable</Badge>;
  return <Badge variant="outline">{direction ?? '—'}</Badge>;
}

function statusBadge(isSettled: boolean) {
  return isSettled ? (
    <Badge className="bg-blue-600 text-white">Settled</Badge>
  ) : (
    <Badge variant="outline" className="text-yellow-400 border-yellow-400">Pending</Badge>
  );
}

export default function BusinessSettlementsPage() {
  const { admin } = useAuth();
  const { toast } = useToast();
  const businessId = admin?.businessId ?? '';

  const PAGE_SIZE = 25;
  const [page, setPage] = useState(0);
  const [directionFilter, setDirectionFilter] = useState<'all' | SettlementDirection>('all');
  const [settledFilter, setSettledFilter] = useState<'all' | 'settled' | 'unsettled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const { data, loading, refetch } = useQuery<SettlementsPageQuery>(GET_SETTLEMENTS_PAGE, {
    variables: {
      type: SettlementType.Business,
      businessId,
      direction: directionFilter === 'all' ? null : directionFilter,
      isSettled: settledFilter === 'all' ? null : settledFilter === 'settled',
      limit: 200,
    },
    skip: !businessId,
    fetchPolicy: 'cache-and-network',
  });

  const { data: balanceData, loading: balanceLoading, refetch: refetchBalance } = useQuery<GetBusinessBalanceQuery>(GET_BUSINESS_BALANCE, {
    variables: { businessId },
    skip: !businessId,
    fetchPolicy: 'cache-and-network',
  });

  const { data: requestsData, loading: requestsLoading, refetch: refetchRequests } = useQuery<GetSettlementRequestsQuery>(GET_SETTLEMENT_REQUESTS, {
    variables: { businessId, limit: 20 },
    skip: !businessId,
    fetchPolicy: 'network-only',
  });

  const [createSettlementRequest] = useMutation(CREATE_SETTLEMENT_REQUEST);

  const settlements: SettlementRecord[] = data?.settlements ?? [];
  const balance = balanceData?.businessBalance;
  const settlementRequests: SettlementRequestRecord[] = requestsData?.settlementRequests ?? [];

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

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchBalance(), refetchRequests()]);
    setPage(0);
  };

  // Reset page when filters change
  const handleDirectionFilter = (val: typeof directionFilter) => { setDirectionFilter(val); setPage(0); };
  const handleSettledFilter = (val: typeof settledFilter) => { setSettledFilter(val); setPage(0); };
  const handleSearch = (val: string) => { setSearchQuery(val); setPage(0); };

  const openRequestDialog = () => {
    const pending = balance?.totalPending ?? 0;
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
        variables: {
          businessId,
          amount,
          note: reqNote.trim() || undefined,
        },
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
      <div className="text-white p-8 text-center text-gray-400">
        No business is assigned to your account. Ask a super admin to assign your business first.
      </div>
    );
  }

  return (
    <div className="text-white space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Settlements</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={openRequestDialog} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
            <Send className="h-3.5 w-3.5" />
            Request Settlement
          </Button>
        </div>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-3 gap-4">
        {balanceLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl bg-gray-800" />
          ))
        ) : (
          <>
            <Card className="bg-gray-900 border-gray-800 p-4">
              <p className="text-xs text-gray-400 mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-white">€{Number(balance?.totalAmount ?? 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500">{balance?.count ?? 0} settlements</p>
            </Card>
            <Card className="bg-gray-900 border-gray-800 p-4">
              <p className="text-xs text-gray-400 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">€{Number(balance?.totalPending ?? 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500">{balance?.pendingCount ?? 0} unsettled</p>
            </Card>
            <Card className="bg-gray-900 border-gray-800 p-4">
              <p className="text-xs text-gray-400 mb-1">Paid Out</p>
              <p className="text-2xl font-bold text-green-400">€{Number(balance?.totalPaid ?? 0).toFixed(2)}</p>
            </Card>
          </>
        )}
      </div>

      {/* Settlement Requests */}
      {(settlementRequests.length > 0 || requestsLoading) && (
        <Card className="bg-gray-900 border-gray-800">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Settlement Requests</h2>
          </div>
          <div className="p-4 space-y-2">
            {requestsLoading ? (
              <Skeleton className="h-10 w-full bg-gray-800" />
            ) : (
              settlementRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-white">€{Number(req.amount).toFixed(2)}</span>
                    <span className="text-xs text-gray-400 ml-3">{new Date(req.createdAt).toLocaleDateString()}</span>
                    {req.note && <span className="text-xs text-gray-500 ml-3">"{req.note}"</span>}
                    {req.reason && <span className="text-xs text-red-400 ml-3">Reason: {req.reason}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        req.status === 'PENDING' && 'bg-yellow-600 text-white',
                        req.status === 'ACCEPTED' && 'bg-green-600 text-white',
                        req.status === 'REJECTED' && 'bg-red-600 text-white',
                      )}
                    >
                      {req.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <div className="p-4 flex flex-wrap gap-4 items-center">
          {/* Direction */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Direction:</span>
            <div className="flex gap-1 rounded-md bg-gray-800 p-1">
              {(['all', SettlementDirection.Receivable, SettlementDirection.Payable] as const).map((val) => (
                <Button
                  key={val}
                  variant={directionFilter === val ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleDirectionFilter(val)}
                  className="h-7 px-3 capitalize"
                >
                  {val === 'all' ? 'All' : val}
                </Button>
              ))}
            </div>
          </div>
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Status:</span>
            <div className="flex gap-1 rounded-md bg-gray-800 p-1">
              {(['all', 'unsettled', 'settled'] as const).map((val) => (
                <Button
                  key={val}
                  variant={settledFilter === val ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleSettledFilter(val)}
                  className="h-7 px-3 capitalize"
                >
                  {val}
                </Button>
              ))}
            </div>
          </div>
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Input
              placeholder="Search by order ID or business…"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white pl-3"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead className="text-gray-400">Order</TableHead>
                <TableHead className="text-gray-400">Lines</TableHead>
                <TableHead className="text-gray-400">Receivable</TableHead>
                <TableHead className="text-gray-400">Payable</TableHead>
                <TableHead className="text-gray-400">Net</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-gray-800">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full bg-gray-800" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : orderGroups.length === 0 ? (
                <TableRow className="border-gray-800">
                  <TableCell colSpan={7} className="text-center text-gray-500 py-10">
                    No settlements found.
                  </TableCell>
                </TableRow>
              ) : (
                pagedGroups.map((og) => {
                  const netAmount = og.totalPayable - og.totalReceivable;
                  const allSettled = og.settlements.every((s: SettlementRecord) => !!s.isSettled);
                  return (
                    <TableRow
                      key={og.orderId}
                      className="border-gray-800 hover:bg-gray-800/40 cursor-pointer"
                      onClick={() => {
                        setSelectedOrderGroup(og);
                        if (og.order?.id) {
                          fetchFinancials({ variables: { orderId: og.order.id, businessId } });
                        }
                      }}
                    >
                      <TableCell className="font-mono text-xs text-gray-300">
                        {og.orderDisplayId}
                      </TableCell>
                      <TableCell className="text-sm text-gray-400">{og.settlements.length}</TableCell>
                      <TableCell className="text-sm font-medium text-red-400">
                        {og.totalReceivable > 0 ? `€${og.totalReceivable.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-green-400">
                        {og.totalPayable > 0 ? `€${og.totalPayable.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className={cn('text-sm font-semibold', netAmount >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {netAmount >= 0 ? '+' : ''}€{netAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>{statusBadge(allSettled)}</TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {og.latestCreatedAt ? new Date(og.latestCreatedAt).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination footer */}
        {orderGroups.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-xs text-zinc-500">
              Page {page + 1} of {totalPages} &middot; {orderGroups.length} order groups
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Request Settlement Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Request Settlement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-gray-300">Amount (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={reqAmount}
                onChange={(e) => setReqAmount(e.target.value)}
                className="mt-1 bg-gray-800 border-gray-700 text-white"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-gray-300">Note (optional)</Label>
              <Input
                value={reqNote}
                onChange={(e) => setReqNote(e.target.value)}
                className="mt-1 bg-gray-800 border-gray-700 text-white"
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

      {/* Order Financial Breakdown Dialog */}
      <Dialog open={selectedOrderGroup !== null} onOpenChange={(open) => { if (!open) setSelectedOrderGroup(null); }}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
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
                <div className="rounded-lg bg-gray-800 border border-gray-700 p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Order</span>
                    <span className="font-mono text-gray-200">{og.orderDisplayId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Date</span>
                    <span className="text-gray-200">{og.latestCreatedAt ? new Date(og.latestCreatedAt).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Net</span>
                    <span className={cn('font-semibold', netAmount >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {netAmount >= 0 ? '+' : ''}€{netAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Status</span>
                    {statusBadge(allSettled)}
                  </div>
                </div>

                {/* Settlement lines */}
                <div className="rounded-lg bg-gray-800 border border-gray-700 p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Settlement Lines</p>
                  {og.settlements.map((s: SettlementRecord) => (
                    <div key={s.id} className="flex justify-between text-sm items-center">
                      <div className="flex items-center gap-2">
                        {directionBadge(s.direction)}
                        {statusBadge(!!s.isSettled)}
                      </div>
                      <span className={cn('font-medium', s.direction === SettlementDirection.Payable ? 'text-green-400' : 'text-red-400')}>
                        {s.direction === SettlementDirection.Payable ? '+' : '-'}€{Number(s.amount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="h-px bg-gray-700 my-1" />
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-white">Net</span>
                    <span className={netAmount >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {netAmount >= 0 ? '+' : ''}€{netAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Financial breakdown from API */}
                {financialsLoading ? (
                  <div className="flex justify-center py-6">
                    <Skeleton className="h-24 w-full bg-gray-800 rounded-lg" />
                  </div>
                ) : fin ? (
                  <div className="rounded-lg bg-gray-800 border border-gray-700 p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Breakdown</p>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Payment Method</span>
                      <Badge className={cn(
                        fin.paymentCollection === 'CASH_TO_DRIVER' ? 'bg-amber-600/20 text-amber-400 border-amber-600/30' : 'bg-blue-600/20 text-blue-400 border-blue-600/30',
                      )} variant="outline">
                        {fin.paymentCollection === 'CASH_TO_DRIVER' ? 'Cash' : 'Prepaid'}
                      </Badge>
                    </div>

                    <div className="h-px bg-gray-700 my-1" />

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Business Price</span>
                      <span className="text-gray-200">€{fin.businessPrice.toFixed(2)}</span>
                    </div>

                    {fin.markupAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Platform Markup</span>
                        <span className="text-gray-400">+€{fin.markupAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Customer Paid</span>
                      <span className="text-gray-200">€{fin.customerPaid.toFixed(2)}</span>
                    </div>

                    <div className="h-px bg-gray-700 my-1" />

                    {fin.amountOwedToBusiness > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Owed to Business</span>
                        <span className="text-green-400 font-medium">+€{fin.amountOwedToBusiness.toFixed(2)}</span>
                      </div>
                    )}

                    {fin.amountOwedByBusiness > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Owed by Business</span>
                        <span className="text-red-400 font-medium">-€{fin.amountOwedByBusiness.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="h-px bg-gray-700 my-1" />

                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-white">Business Net Earnings</span>
                      <span className={fin.businessNetEarnings >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {fin.businessNetEarnings >= 0 ? '+' : ''}€{fin.businessNetEarnings.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : og.order?.id ? (
                  <p className="text-sm text-gray-500 text-center py-4">No financial data available for this order.</p>
                ) : null}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
