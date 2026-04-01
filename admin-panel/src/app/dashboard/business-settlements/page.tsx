'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
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
import { SettlementType, SettlementDirection, type SettlementsPageQuery } from '@/gql/graphql';
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
  CANCEL_SETTLEMENT_REQUEST,
} from '@/graphql/operations/settlements/queries';

type SettlementRecord = SettlementsPageQuery['settlements'][number];

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

  const [directionFilter, setDirectionFilter] = useState<'all' | SettlementDirection>('all');
  const [settledFilter, setSettledFilter] = useState<'all' | 'settled' | 'unsettled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Request settlement dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [reqAmount, setReqAmount] = useState('');
  const [reqPeriodStart, setReqPeriodStart] = useState(() =>
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  );
  const [reqPeriodEnd, setReqPeriodEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [reqNote, setReqNote] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);

  const { data, loading, refetch } = useQuery(GET_SETTLEMENTS_PAGE, {
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

  const { data: balanceData, loading: balanceLoading, refetch: refetchBalance } = useQuery(GET_BUSINESS_BALANCE, {
    variables: { businessId },
    skip: !businessId,
    fetchPolicy: 'cache-and-network',
  });

  const { data: requestsData, loading: requestsLoading, refetch: refetchRequests } = useQuery(GET_SETTLEMENT_REQUESTS, {
    variables: { businessId, limit: 20 },
    skip: !businessId,
    fetchPolicy: 'network-only',
  });

  const [createSettlementRequest] = useMutation(CREATE_SETTLEMENT_REQUEST);
  const [cancelSettlementRequest] = useMutation(CANCEL_SETTLEMENT_REQUEST);

  const settlements: SettlementRecord[] = data?.settlements ?? [];
  const balance = balanceData?.businessBalance;
  const settlementRequests = (requestsData as any)?.settlementRequests ?? [];

  const normalized = searchQuery.trim().toLowerCase();
  const filtered = settlements.filter((s) => {
    if (!normalized) return true;
    return [s.id, s.order?.id, s.paymentReference, s.paymentMethod]
      .filter(Boolean)
      .some((v) => v!.toString().toLowerCase().includes(normalized));
  });

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchBalance(), refetchRequests()]);
  };

  const openRequestDialog = () => {
    const pending = balance?.totalPending ?? 0;
    setReqAmount(Number(pending) > 0 ? Number(pending).toFixed(2) : '');
    setReqPeriodStart(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    );
    setReqPeriodEnd(new Date().toISOString().split('T')[0]);
    setReqNote('');
    setRequestDialogOpen(true);
  };

  const handleSubmitRequest = async () => {
    const amount = parseFloat(reqAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter a valid amount greater than 0.', variant: 'destructive' });
      return;
    }
    if (!reqPeriodStart || !reqPeriodEnd) {
      toast({ title: 'Missing dates', description: 'Period start and end are required.', variant: 'destructive' });
      return;
    }
    setReqSubmitting(true);
    try {
      await createSettlementRequest({
        variables: {
          businessId,
          amount,
          periodStart: new Date(reqPeriodStart).toISOString(),
          periodEnd: new Date(reqPeriodEnd + 'T23:59:59').toISOString(),
          note: reqNote.trim() || undefined,
        },
      });
      toast({ title: 'Request sent', description: `Settlement request of €${amount.toFixed(2)} submitted.` });
      setRequestDialogOpen(false);
      await refetchRequests();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Failed to create request', variant: 'destructive' });
    } finally {
      setReqSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelSettlementRequest({ variables: { requestId } });
      toast({ title: 'Cancelled', description: 'Settlement request cancelled.' });
      await refetchRequests();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Failed to cancel', variant: 'destructive' });
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
              settlementRequests.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-white">€{Number(req.amount).toFixed(2)}</span>
                    <span className="text-xs text-gray-400 ml-3">{req.periodStart?.slice(0, 10)} → {req.periodEnd?.slice(0, 10)}</span>
                    {req.note && <span className="text-xs text-gray-500 ml-3">"{req.note}"</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        req.status === 'PENDING' && 'bg-yellow-600 text-white',
                        req.status === 'APPROVED' && 'bg-green-600 text-white',
                        req.status === 'REJECTED' && 'bg-red-600 text-white',
                        req.status === 'CANCELLED' && 'bg-gray-600 text-white',
                      )}
                    >
                      {req.status}
                    </Badge>
                    {req.status === 'PENDING' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 h-7 px-2"
                        onClick={() => handleCancelRequest(req.id)}
                      >
                        Cancel
                      </Button>
                    )}
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
                  onClick={() => setDirectionFilter(val)}
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
                  onClick={() => setSettledFilter(val)}
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
              placeholder="Search by order ID, reference…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                <TableHead className="text-gray-400">Direction</TableHead>
                <TableHead className="text-gray-400">Amount</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Payment Method</TableHead>
                <TableHead className="text-gray-400">Paid At</TableHead>
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
              ) : filtered.length === 0 ? (
                <TableRow className="border-gray-800">
                  <TableCell colSpan={7} className="text-center text-gray-500 py-10">
                    No settlements found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id} className="border-gray-800 hover:bg-gray-800/40">
                    <TableCell className="font-mono text-xs text-gray-300">
                      {s.order?.displayId ?? s.order?.id?.slice(0, 8) ?? '—'}
                    </TableCell>
                    <TableCell>{directionBadge(s.direction)}</TableCell>
                    <TableCell className="font-semibold text-white">
                      €{Number(s.amount ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell>{statusBadge(!!s.isSettled)}</TableCell>
                    <TableCell className="text-gray-400 text-sm">{s.paymentMethod ?? '—'}</TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {s.paidAt ? new Date(s.paidAt as string).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {s.createdAt ? new Date(s.createdAt as string).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Period Start</Label>
                <Input
                  type="date"
                  value={reqPeriodStart}
                  onChange={(e) => setReqPeriodStart(e.target.value)}
                  className="mt-1 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Period End</Label>
                <Input
                  type="date"
                  value={reqPeriodEnd}
                  onChange={(e) => setReqPeriodEnd(e.target.value)}
                  className="mt-1 bg-gray-800 border-gray-700 text-white"
                />
              </div>
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
    </div>
  );
}
