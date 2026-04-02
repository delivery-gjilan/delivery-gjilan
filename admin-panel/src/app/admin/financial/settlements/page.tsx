'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
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
import { ArrowLeft, Building2, ChevronRight, RefreshCw, Search, Send, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SettlementType,
  SettlementStatus,
  SettlementDirection,
  type SettlementsPageQuery,
} from '@/gql/graphql';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type SettlementRecord = SettlementsPageQuery['settlements'][number];

type SettlementGroup = {
  id: string;
  name: string;
  subtitle: string;
  settlements: SettlementRecord[];
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
  pendingCount: number;
  paidCount: number;
};

import {
  GET_SETTLEMENTS_PAGE,
  MARK_SETTLEMENT_PAID,
  MARK_SETTLEMENTS_PAID_OP,
  MARK_SETTLEMENT_PARTIAL,
  BACKFILL_SETTLEMENTS,
  CREATE_SETTLEMENT_REQUEST,
  CANCEL_SETTLEMENT_REQUEST,
  GET_SETTLEMENT_REQUESTS,
  SETTLE_WITH_DRIVER,
  SETTLE_WITH_BUSINESS,
} from '@/graphql/operations/settlements/queries';

export default function SettlementsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'business' | 'driver'>('business');
  const [directionFilter, setDirectionFilter] = useState<'all' | SettlementDirection>('all');
  const [settledFilter, setSettledFilter] = useState<'all' | 'settled' | 'unsettled'>('unsettled');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementRecord | null>(null);
  const [bulkPartialAmount, setBulkPartialAmount] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  // Settle dialog state
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settlePaymentMethod, setSettlePaymentMethod] = useState('');
  const [settlePaymentRef, setSettlePaymentRef] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  // Request settlement dialog state
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [reqAmount, setReqAmount] = useState('');
  const [reqPeriodStart, setReqPeriodStart] = useState(() =>
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  );
  const [reqPeriodEnd, setReqPeriodEnd] = useState(() =>
    new Date().toISOString().split('T')[0],
  );
  const [reqNote, setReqNote] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);

  // Query for business settlements
  const {
    data: businessData,
    loading: businessLoading,
    refetch: refetchBusiness,
  } = useQuery(GET_SETTLEMENTS_PAGE, {
    variables: {
      type: SettlementType.Business,
      direction: directionFilter === 'all' ? null : directionFilter,
      isSettled: settledFilter === 'all' ? null : settledFilter === 'settled',
      limit: 200,
    },
  });

  // Query for driver settlements
  const {
    data: driverData,
    loading: driverLoading,
    refetch: refetchDriver,
  } = useQuery(GET_SETTLEMENTS_PAGE, {
    variables: {
      type: SettlementType.Driver,
      direction: directionFilter === 'all' ? null : directionFilter,
      isSettled: settledFilter === 'all' ? null : settledFilter === 'settled',
      limit: 200,
    },
  });

  const businessSettlements = businessData?.settlements || [];
  const driverSettlements = driverData?.settlements || [];

  const currentSettlements = activeTab === 'business' ? businessSettlements : driverSettlements;
  const loading = activeTab === 'business' ? businessLoading : driverLoading;

  const getEntityId = (settlement: SettlementRecord) => {
    if (activeTab === 'business') {
      return settlement.business?.id || `unknown-business-${settlement.id}`;
    }

    return settlement.driver?.id || `unknown-driver-${settlement.id}`;
  };

  const getEntityName = (settlement: SettlementRecord) => {
    if (activeTab === 'business') {
      return settlement.business?.name || 'Unknown business';
    }

    if (!settlement.driver) {
      return 'Unknown driver';
    }

    return `${settlement.driver.firstName} ${settlement.driver.lastName}`.trim() || 'Unknown driver';
  };

  const getEntitySubtitle = (settlement: SettlementRecord) => {
    if (activeTab === 'business') {
      return settlement.business?.id || 'No business id';
    }

    return settlement.driver?.phoneNumber || settlement.driver?.id || 'No driver reference';
  };

  const settlementGroupsMap = new Map<string, SettlementGroup>();

  currentSettlements.forEach((settlement: SettlementRecord) => {
    const groupId = getEntityId(settlement);
    const existingGroup = settlementGroupsMap.get(groupId);
    const amount = Number(settlement.amount || 0);

    if (existingGroup) {
      existingGroup.settlements.push(settlement);
      existingGroup.totalAmount += amount;

      if (!settlement.isSettled) {
        existingGroup.pendingAmount += amount;
        existingGroup.pendingCount += 1;
      } else {
        existingGroup.paidAmount += amount;
        existingGroup.paidCount += 1;
      }

      return;
    }

    settlementGroupsMap.set(groupId, {
      id: groupId,
      name: getEntityName(settlement),
      subtitle: getEntitySubtitle(settlement),
      settlements: [settlement],
      totalAmount: amount,
      pendingAmount: !settlement.isSettled ? amount : 0,
      paidAmount: settlement.isSettled ? amount : 0,
      pendingCount: !settlement.isSettled ? 1 : 0,
      paidCount: settlement.isSettled ? 1 : 0,
    });
  });

  const settlementGroups = Array.from(settlementGroupsMap.values()).sort(
    (left, right) => right.totalAmount - left.totalAmount
  );

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const matchesSettlementSearch = (settlement: SettlementRecord) => {
    if (!normalizedSearchQuery) {
      return true;
    }

    return [
      settlement.id,
      settlement.order?.id,
      settlement.paymentReference,
      settlement.paymentMethod,
      settlement.driver?.firstName,
      settlement.driver?.lastName,
      settlement.driver?.phoneNumber,
      settlement.business?.name,
    ]
      .filter(Boolean)
      .some((value) => value!.toString().toLowerCase().includes(normalizedSearchQuery));
  };

  const filteredGroups = settlementGroups.filter((group) => {
    if (!normalizedSearchQuery) {
      return true;
    }

    return [group.id, group.name, group.subtitle]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedSearchQuery));
  });

  const selectedGroup = selectedEntityId
    ? settlementGroups.find((group) => group.id === selectedEntityId) || null
    : null;

  const filteredSettlements = selectedGroup
    ? selectedGroup.settlements.filter(matchesSettlementSearch)
    : [];

  const isEmpty = selectedGroup
    ? filteredSettlements.length === 0
    : filteredGroups.length === 0;

  const settlementsInCurrentView = selectedGroup
    ? filteredSettlements
    : filteredGroups.flatMap((group) => group.settlements);

  const pendingSettlements = settlementsInCurrentView.filter(
    (settlement) => !settlement.isSettled,
  );

  const pendingSettlementIds = pendingSettlements.map((settlement) => settlement.id);
  const pendingTotalAmount = pendingSettlements.reduce(
    (sum, settlement) => sum + Number(settlement.amount || 0),
    0,
  );

  const aggregateScopeLabel = selectedGroup
    ? selectedGroup.name
    : activeTab === 'business'
      ? 'all visible businesses'
      : 'all visible drivers';

  // Mark as paid mutation
  const [markAsPaid] = useMutation(MARK_SETTLEMENT_PAID);
  const [markAsPartiallyPaid] = useMutation(MARK_SETTLEMENT_PARTIAL);
  const [markSettlementsAsPaid] = useMutation(MARK_SETTLEMENTS_PAID_OP);
  const [backfillSettlements, { loading: backfillLoading }] = useMutation(BACKFILL_SETTLEMENTS);
  const [cancelSettlementRequest] = useMutation(CANCEL_SETTLEMENT_REQUEST);
  const [createSettlementRequest] = useMutation(CREATE_SETTLEMENT_REQUEST);

  // New settling mutations (Moved to imported from queries if possible, otherwise use local ones for now)
  // These were missing from queries.ts so I'll keep them here or add them to queries.ts
  const [settleWithDriver] = useMutation(SETTLE_WITH_DRIVER);
  const [settleWithBusiness] = useMutation(SETTLE_WITH_BUSINESS);

  // Fetch settlement requests for selected business
  const { data: settlementRequestsData, loading: settlementRequestsLoading, refetch: refetchSettlementRequests } = useQuery(GET_SETTLEMENT_REQUESTS, {
    variables: { businessId: selectedGroup?.id, limit: 10 },
    skip: !selectedGroup || activeTab !== 'business',
    fetchPolicy: 'network-only',
  });

  const settlementRequests = (settlementRequestsData as any)?.settlementRequests ?? [];


  // Calculate totals for current view
  const totalsSource = selectedGroup ? filteredSettlements : filteredGroups;
  const totals = {
    total: totalsSource.reduce(
      (sum: number, item: SettlementRecord | SettlementGroup) =>
        sum + ('amount' in item ? Number(item.amount || 0) : item.totalAmount),
      0
    ),
    pending: totalsSource.reduce(
      (sum: number, item: SettlementRecord | SettlementGroup) =>
        sum + ('amount' in item
          ? !item.isSettled
            ? Number(item.amount || 0)
            : 0
          : item.pendingAmount),
      0
    ),
    paid: totalsSource.reduce(
      (sum: number, item: SettlementRecord | SettlementGroup) =>
        sum + ('amount' in item
          ? item.isSettled
            ? Number(item.amount || 0)
            : 0
          : item.paidAmount),
      0
    ),
  };

  const handleRefresh = async () => {
    if (activeTab === 'business') {
      await refetchBusiness();
      if (selectedEntityId) await refetchSettlementRequests();
    } else {
      await refetchDriver();
    }
  };


  const handleBulkPartialSettle = async () => {
    const amountToSettle = Number(bulkPartialAmount);

    if (!Number.isFinite(amountToSettle) || amountToSettle <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Enter a partial amount greater than 0.',
        variant: 'destructive',
      });
      return;
    }

    if (pendingSettlements.length === 0) {
      toast({
        title: 'Nothing to settle',
        description: `No pending settlements found for ${aggregateScopeLabel}.`,
      });
      return;
    }

    if (amountToSettle - pendingTotalAmount > 0.0001) {
      toast({
        title: 'Amount too high',
        description: `Partial amount cannot exceed pending total (${pendingTotalAmount.toFixed(2)}).`,
        variant: 'destructive',
      });
      return;
    }

    const orderedPending = [...pendingSettlements].sort(
      (a, b) => new Date(String(a.createdAt)).getTime() - new Date(String(b.createdAt)).getTime(),
    );

    let remaining = Math.round(amountToSettle * 100) / 100;
    let fullySettledCount = 0;
    let partiallySettledCount = 0;

    setBulkProcessing(true);
    try {
      for (const settlement of orderedPending) {
        if (remaining <= 0) {
          break;
        }

        const settlementAmount = Math.round(Number(settlement.amount || 0) * 100) / 100;
        if (settlementAmount <= 0) {
          continue;
        }

        if (remaining + 0.0001 >= settlementAmount) {
          await markAsPaid({
            variables: {
              settlementId: settlement.id,
            },
          });
          remaining = Math.round((remaining - settlementAmount) * 100) / 100;
          fullySettledCount += 1;
        } else {
          await markAsPartiallyPaid({
            variables: {
              settlementId: settlement.id,
              amount: remaining,
            },
          });
          remaining = 0;
          partiallySettledCount += 1;
        }
      }

      toast({
        title: 'Success',
        description: `Recorded partial settlement for ${aggregateScopeLabel}: ${amountToSettle.toFixed(2)} applied (${fullySettledCount} full, ${partiallySettledCount} partial).`,
      });

      setBulkPartialAmount('');
      await handleRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to apply partial settlement',
        variant: 'destructive',
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const resetGroupSelection = () => {
    setSelectedEntityId(null);
    setSearchQuery('');
  };

  const openRequestDialog = () => {
    if (!selectedGroup) return;
    const pending = selectedGroup.pendingAmount;
    setReqAmount(pending > 0 ? pending.toFixed(2) : '');
    setReqPeriodStart(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    );
    setReqPeriodEnd(new Date().toISOString().split('T')[0]);
    setReqNote('');
    setRequestDialogOpen(true);
  };

  const handleSubmitSettlementRequest = async () => {
    if (!selectedEntityId) return;
    const amount = parseFloat(reqAmount);
    if (!reqAmount || !Number.isFinite(amount) || amount <= 0) {
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
          businessId: selectedEntityId,
          amount,
          periodStart: new Date(reqPeriodStart).toISOString(),
          periodEnd: new Date(reqPeriodEnd + 'T23:59:59').toISOString(),
          note: reqNote.trim() || undefined,
        },
      });
      toast({ title: 'Request sent', description: `Settlement request of €${amount.toFixed(2)} sent to ${selectedGroup?.name}.` });
      setRequestDialogOpen(false);
      await refetchSettlementRequests();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Failed to create request', variant: 'destructive' });
    } finally {
      setReqSubmitting(false);
    }
  };

  const handleCancelSettlementRequest = async (requestId: string) => {
    try {
      await cancelSettlementRequest({ variables: { requestId } });
      toast({ title: 'Cancelled', description: 'Settlement request cancelled.' });
      await refetchSettlementRequests();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Failed to cancel', variant: 'destructive' });
    }
  };

  const openSettleDialog = () => {
    if (!selectedGroup) return;
    const pending = selectedGroup.pendingAmount;
    setSettleAmount(pending > 0 ? pending.toFixed(2) : '');
    setSettlePaymentMethod('');
    setSettlePaymentRef('');
    setSettleNote('');
    setSettleDialogOpen(true);
  };

  const handleSettle = async () => {
    if (!selectedEntityId || !selectedGroup) return;

    setSettleSubmitting(true);
    try {
      if (activeTab === 'driver') {
        const { data } = await settleWithDriver({
          variables: { driverId: selectedEntityId },
        });
        const result = data?.settleWithDriver;
        const remainderAmount = result?.remainderAmount ?? 0;
        const remainderMsg = remainderAmount > 0
          ? ` Remainder: €${remainderAmount.toFixed(2)} carried forward.`
          : '';
        toast({
          title: 'Driver settled',
          description: `${result?.settledCount ?? 0} settlements settled. Net: €${(result?.netAmount ?? 0).toFixed(2)} (${result?.direction}).${remainderMsg}`,
        });
      } else {
        const amount = parseFloat(settleAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
          toast({ title: 'Invalid amount', description: 'Enter a valid amount > 0.', variant: 'destructive' });
          setSettleSubmitting(false);
          return;
        }
        const { data } = await settleWithBusiness({
          variables: {
            businessId: selectedEntityId,
            amount,
            paymentMethod: settlePaymentMethod.trim() || undefined,
            paymentReference: settlePaymentRef.trim() || undefined,
            note: settleNote.trim() || undefined,
          },
        });
        const result = data?.settleWithBusiness;
        const remainderAmount = result?.remainderAmount ?? 0;
        const remainderMsg = remainderAmount > 0
          ? ` Remainder: €${remainderAmount.toFixed(2)} carried forward.`
          : '';
        toast({
          title: 'Business settled',
          description: `${result?.settledCount ?? 0} settlements settled. Paid: €${(result?.netAmount ?? 0).toFixed(2)}.${remainderMsg}`,
        });
      }

      setSettleDialogOpen(false);
      await handleRefresh();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Failed to settle', variant: 'destructive' });
    } finally {
      setSettleSubmitting(false);
    }
  };

  const renderContent = () => (
    <Card className="shadow-sm">
      {/* Filters and Stats Bar */}
      <div className="bg-muted/30">
        <div className="p-4">
          {selectedGroup && (
            <div className="mb-4 flex items-center justify-between rounded-lg border bg-background px-3 py-2">
              <div>
                <div className="text-sm font-semibold text-foreground">{selectedGroup.name}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedGroup.subtitle} • {selectedGroup.settlements.length} settlements
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={openSettleDialog}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  Settle
                </Button>
                {activeTab === 'business' && (
                  <Button
                    size="sm"
                    onClick={openRequestDialog}
                    className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Request Settlement
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={resetGroupSelection} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to {activeTab === 'business' ? 'businesses' : 'drivers'}
                </Button>
              </div>
            </div>
          )}

          {/* Controls Row */}
            <div className="flex items-center gap-2">

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground mr-1">Direction:</span>
              <div className="flex gap-1 rounded-md bg-muted/30 p-1 mr-4">
                <Button
                  variant={directionFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDirectionFilter('all')}
                  className="h-7 px-3"
                >
                  All
                </Button>
                <Button
                  variant={directionFilter === SettlementDirection.Receivable ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDirectionFilter(SettlementDirection.Receivable)}
                  className="h-7 px-3"
                >
                  Receivable
                </Button>
                <Button
                  variant={directionFilter === SettlementDirection.Payable ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDirectionFilter(SettlementDirection.Payable)}
                  className="h-7 px-3"
                >
                  Payable
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground mr-1">Settled:</span>
              <div className="flex gap-1 rounded-md bg-muted/30 p-1">
                <Button
                  variant={settledFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSettledFilter('all')}
                  className="h-7 px-3"
                >
                  All
                </Button>
                <Button
                  variant={settledFilter === 'unsettled' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSettledFilter('unsettled')}
                  className="h-7 px-3 text-orange-600"
                >
                  Unsettled
                </Button>
                <Button
                  variant={settledFilter === 'settled' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSettledFilter('settled')}
                  className="h-7 px-3 text-green-600"
                >
                  Settled
                </Button>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-auto h-10">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Summary Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-background rounded-lg p-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">Total Amount</div>
              <div className="text-2xl font-bold tracking-tight">€{totals.total.toFixed(2)}</div>
            </div>
            <div className="bg-background rounded-lg p-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">Pending</div>
              <div className="text-2xl font-bold tracking-tight text-orange-600">€{totals.pending.toFixed(2)}</div>
            </div>
            <div className="bg-background rounded-lg p-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">Paid</div>
              <div className="text-2xl font-bold tracking-tight text-green-600">€{totals.paid.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-zinc-800 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-zinc-800 bg-[#09090b]">
              {selectedGroup ? (
                <>
                  <TableHead className="font-semibold text-zinc-500">{activeTab === 'business' ? 'Business' : 'Driver'}</TableHead>
                  <TableHead className="font-semibold text-zinc-500">Direction</TableHead>
                  <TableHead className="font-semibold text-right text-zinc-500">Amount</TableHead>
                  <TableHead className="font-semibold text-zinc-500">Status</TableHead>
                  <TableHead className="font-semibold text-zinc-500">Order ID</TableHead>
                  <TableHead className="font-semibold text-zinc-500">Payment Ref</TableHead>
                  <TableHead className="font-semibold text-right text-zinc-500">Date</TableHead>
                  <TableHead className="font-semibold text-right text-zinc-500">Actions</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="font-semibold text-zinc-500">{activeTab === 'business' ? 'Business' : 'Driver'}</TableHead>
                  <TableHead className="font-semibold text-zinc-500">Reference</TableHead>
                  <TableHead className="font-semibold text-right text-zinc-500">Settlements</TableHead>
                  <TableHead className="font-semibold text-right text-zinc-500">Pending</TableHead>
                  <TableHead className="font-semibold text-right text-zinc-500">Paid</TableHead>
                  <TableHead className="font-semibold text-right text-zinc-500">Total</TableHead>
                  <TableHead className="font-semibold text-right text-zinc-500">Actions</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i} className="border-b border-zinc-800">
                  <TableCell colSpan={selectedGroup ? 8 : 7}>
                    <Skeleton className="h-9 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isEmpty ? (
              <TableRow>
                <TableCell colSpan={selectedGroup ? 8 : 7} className="text-center text-zinc-500 py-20">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-lg font-medium">
                      {selectedGroup ? 'No settlements found' : `No ${activeTab === 'business' ? 'businesses' : 'drivers'} found`}
                    </div>
                    <div className="text-sm text-zinc-600">Try adjusting your filters or search query</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : selectedGroup ? (
              filteredSettlements.map((settlement: SettlementRecord) => (
                <TableRow 
                  key={settlement.id}
                  className="border-b border-zinc-800 hover:bg-[#131313] transition-colors"
                >
                  <TableCell 
                    className="font-medium cursor-pointer text-zinc-300"
                    onClick={() => setSelectedSettlement(settlement)}
                  >
                    {activeTab === 'business' && settlement.business
                      ? settlement.business.name
                      : activeTab === 'driver' && settlement.driver
                      ? `${settlement.driver.firstName} ${settlement.driver.lastName}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={settlement.direction === SettlementDirection.Receivable ? 'default' : 'secondary'}
                      className={cn(
                        'font-medium',
                        settlement.direction === SettlementDirection.Receivable
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                          : 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
                      )}
                    >
                      {settlement.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-right tabular-nums text-zinc-300">
                    {settlement.currency} {Number(settlement.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={settlement.status === SettlementStatus.Paid ? 'default' : 'secondary'}
                      className={cn(
                        'font-medium',
                        settlement.status === SettlementStatus.Paid && 'bg-green-500/20 text-green-300 hover:bg-green-500/30',
                        settlement.status === SettlementStatus.Pending && 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30',
                        settlement.status === SettlementStatus.Overdue && 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30',
                        settlement.status === SettlementStatus.Disputed && 'bg-red-500/20 text-red-300 hover:bg-red-500/30',
                        settlement.status === SettlementStatus.Cancelled && 'bg-zinc-700/30 text-zinc-300 hover:bg-zinc-700/40'
                      )}
                    >
                      {settlement.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-400">
                    {settlement.order
                      ? `#${settlement.order.displayId || settlement.order.id?.slice(-6)}`
                      : <span className="text-zinc-600 italic">carry-forward</span>}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-400">
                    {settlement.paymentReference || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-right text-zinc-500 tabular-nums">
                    {new Date(settlement.createdAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 bg-zinc-800 hover:bg-zinc-700 text-white"
                      onClick={() => setSelectedSettlement(settlement)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              filteredGroups.map((group) => (
                <TableRow 
                  key={group.id}
                  className="border-b border-zinc-800 hover:bg-[#131313] transition-colors"
                >
                  <TableCell className="font-medium text-zinc-300">
                    <div>{group.name}</div>
                    <div className="text-xs text-zinc-500 mt-1">{group.id}</div>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {group.subtitle}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-zinc-300">
                    {group.settlements.length}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-amber-300 font-medium">
                    €{group.pendingAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-green-300 font-medium">
                    €{group.paidAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-violet-300">
                    €{group.totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedEntityId(group.id);
                        setSearchQuery('');
                      }}
                      className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                    >
                      View settlements
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {!loading && selectedGroup && filteredSettlements.length > 0 && (
        <div className="px-4 py-3 bg-muted/30 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedGroup ? (
              <>
                Showing <span className="font-semibold text-foreground">{filteredSettlements.length}</span> of <span className="font-semibold text-foreground">{selectedGroup.settlements.length}</span> settlements for <span className="font-semibold text-foreground">{selectedGroup.name}</span>
              </>
            ) : (
              <>
                Showing <span className="font-semibold text-foreground">{filteredGroups.length}</span> of <span className="font-semibold text-foreground">{settlementGroups.length}</span> {activeTab === 'business' ? 'businesses' : 'drivers'}
              </>
            )}
          </p>

          <div className="mt-3 flex flex-col gap-3 rounded-lg border bg-background p-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground">Settlement actions</div>
              <div className="text-xs text-muted-foreground">
                Pending for {aggregateScopeLabel}: {pendingSettlements.length} settlements · EUR {pendingTotalAmount.toFixed(2)}.
                Use <span className="font-semibold text-amber-400">Request Settlement</span> to send a request to the business — they must accept before anything is marked paid.
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="w-full sm:w-48">
                <Label htmlFor="bulk-partial-amount" className="mb-1 block text-xs text-muted-foreground">
                  Partial amount (EUR)
                </Label>
                <Input
                  id="bulk-partial-amount"
                  type="number"
                  min="0"
                  max={pendingTotalAmount}
                  step="0.01"
                  placeholder={`Max ${pendingTotalAmount.toFixed(2)}`}
                  value={bulkPartialAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBulkPartialAmount(e.target.value)}
                />
              </div>

              <Button
                variant="outline"
                onClick={handleBulkPartialSettle}
                disabled={bulkProcessing || pendingSettlements.length === 0 || !bulkPartialAmount}
                title="Admin override — bypasses the request flow. Use only for exceptional cases."
              >
                Force Partial (Admin Override)
              </Button>

              <Button
                className="bg-amber-600 hover:bg-amber-700"
                onClick={openRequestDialog}
                disabled={!selectedGroup}
              >
                <Send className="h-3.5 w-3.5 mr-2" />
                Request Settlement
              </Button>

              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={openSettleDialog}
                disabled={!selectedGroup}
              >
                Settle
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settlement Requests History */}
      {selectedGroup && activeTab === 'business' && (
        <div className="px-4 py-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-foreground">Settlement Requests</div>
            {settlementRequestsLoading && (
              <span className="text-xs text-muted-foreground">Loading…</span>
            )}
          </div>
          {!settlementRequestsLoading && settlementRequests.length === 0 ? (
            <div className="text-xs text-zinc-500 py-3">No settlement requests for this business.</div>
          ) : (
            <div className="space-y-2">
              {(settlementRequests || []).map((req: any) => {
                const statusColors: Record<string, string> = {
                  PENDING_APPROVAL: 'bg-amber-500/20 text-amber-300',
                  ACCEPTED: 'bg-green-500/20 text-green-300',
                  DISPUTED: 'bg-red-500/20 text-red-300',
                  EXPIRED: 'bg-zinc-600/30 text-zinc-300',
                  CANCELLED: 'bg-zinc-600/30 text-zinc-300',
                };
                const colorClass = statusColors[req.status] ?? 'bg-zinc-600/30 text-zinc-300';
                const requestedBy = req.requestedBy
                  ? `${req.requestedBy.firstName ?? ''} ${req.requestedBy.lastName ?? ''}`.trim()
                  : 'Admin';
                const periodLabel = req.periodStart && req.periodEnd
                  ? `${new Date(req.periodStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} – ${new Date(req.periodEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                  : null;

                return (
                  <div
                    key={req.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs"
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">€{Number(req.amount).toFixed(2)}</span>
                        <span className={`inline-block px-2 py-0.5 rounded font-bold ${colorClass}`}>
                          {req.status}
                        </span>
                      </div>
                      {periodLabel && (
                        <div className="text-zinc-400">{periodLabel}</div>
                      )}
                      {req.note && (
                        <div className="text-zinc-500 italic truncate">&quot;{req.note}&quot;</div>
                      )}
                      <div className="text-zinc-600">
                        By {requestedBy} ·{' '}
                        {new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {req.disputeReason && (
                          <span className="ml-2 text-red-400">Dispute: {req.disputeReason}</span>
                        )}
                      </div>
                    </div>
                    {req.status === 'PENDING_APPROVAL' && (
                      <button
                        onClick={() => handleCancelSettlementRequest(req.id)}
                        className="shrink-0 text-zinc-500 hover:text-red-400 transition-colors p-1"
                        title="Cancel request"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-muted/30 p-1 rounded-lg">
          <Button
            variant={activeTab === 'business' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveTab('business');
              setSelectedEntityId(null);
              setSearchQuery('');
            }}
            className="gap-2 h-9 px-4"
          >
            <Building2 className="h-4 w-4" />
            Business
          </Button>
          <Button
            variant={activeTab === 'driver' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveTab('driver');
              setSelectedEntityId(null);
              setSearchQuery('');
            }}
            className="gap-2 h-9 px-4"
          >
            <User className="h-4 w-4" />
            Driver
          </Button>
        </div>

        <div className="relative w-full max-w-md mx-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={selectedGroup
              ? `Search ${activeTab === 'business' ? 'business' : 'driver'} settlements...`
              : `Search ${activeTab === 'business' ? 'businesses' : 'drivers'}...`}
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>

        <Button
          onClick={() => backfillSettlements()}
          disabled={backfillLoading}
          variant="outline"
          size="sm"
        >
          Backfill from Delivered Orders
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {renderContent()}
      </div>

      {/* Settlement Detail Modal */}
      <Dialog open={!!selectedSettlement} onOpenChange={(open) => {
        if (!open) {
          setSelectedSettlement(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {activeTab === 'business' && selectedSettlement?.business
                ? `Business: ${selectedSettlement.business.name}`
                : activeTab === 'driver' && selectedSettlement?.driver
                ? `Driver: ${selectedSettlement.driver.firstName} ${selectedSettlement.driver.lastName}`
                : 'Settlement Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedSettlement && (
            <div className="space-y-6">
              {/* Settlement Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <Label className="text-xs text-muted-foreground">Settlement ID</Label>
                  <div className="font-mono text-sm mt-1">{selectedSettlement.id.slice(0, 12)}...</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Order ID</Label>
                  <div className="font-mono text-sm mt-1">{selectedSettlement.order ? `${selectedSettlement.order.id.slice(0, 12)}...` : <span className="text-muted-foreground italic">Carry-forward (no order)</span>}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Created At</Label>
                  <div className="text-sm mt-1">{new Date(selectedSettlement.createdAt).toLocaleString('en-GB')}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Direction</Label>
                  <Badge 
                    variant={selectedSettlement.direction === SettlementDirection.Receivable ? 'default' : 'secondary'}
                    className="mt-1"
                  >
                    {selectedSettlement.direction}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge 
                    variant={selectedSettlement.status === SettlementStatus.Paid ? 'default' : 'secondary'}
                    className={cn(
                      "mt-1",
                      selectedSettlement.status === SettlementStatus.Paid && "bg-green-600",
                      selectedSettlement.status === SettlementStatus.Pending && "bg-orange-500"
                    )}
                  >
                    {selectedSettlement.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Settled</Label>
                  <Badge 
                    variant={selectedSettlement.isSettled ? 'default' : 'secondary'}
                    className={cn(
                      "mt-1",
                      selectedSettlement.isSettled ? "bg-green-600" : "bg-orange-500"
                    )}
                  >
                    {selectedSettlement.isSettled ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>

              {/* Amount Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Settlement Amount</span>
                  <span className="text-2xl font-bold">{selectedSettlement.currency} {Number(selectedSettlement.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {activeTab === 'driver' ? 'Delivery Fee (driver context)' : 'Delivery Fee'}
                  </span>
                  <span className="font-medium">EUR {Number(selectedSettlement.order?.deliveryPrice || 0).toFixed(2)}</span>
                </div>
                {selectedSettlement.paidAt && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Paid At</span>
                    <span>{new Date(selectedSettlement.paidAt).toLocaleString('en-GB')}</span>
                  </div>
                )}
                {selectedSettlement.paymentReference && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Payment Reference</span>
                    <span className="font-mono">{selectedSettlement.paymentReference}</span>
                  </div>
                )}
                {selectedSettlement.paymentMethod && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span>{selectedSettlement.paymentMethod}</span>
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-background p-4 space-y-3">
                <div className="text-sm font-semibold">Order Details</div>

                {!selectedSettlement.order ? (
                  <div className="text-sm text-muted-foreground italic py-2">
                    This is a carry-forward settlement from a partial payment — no associated order.
                  </div>
                ) : (
                <><div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Display ID:</span>{' '}
                    <span className="font-medium">{selectedSettlement.order?.displayId || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Order Date:</span>{' '}
                    <span className="font-medium">
                      {selectedSettlement.order?.orderDate
                        ? new Date(selectedSettlement.order.orderDate).toLocaleString('en-GB')
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Base Price:</span>{' '}
                    <span className="font-medium">EUR {Number(selectedSettlement.order?.basePrice || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Markup Price:</span>{' '}
                    <span className="font-medium">EUR {Number(selectedSettlement.order?.markupPrice || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Actual Price:</span>{' '}
                    <span className="font-medium">EUR {Number(selectedSettlement.order?.actualPrice || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Price:</span>{' '}
                    <span className="font-medium">EUR {Number(selectedSettlement.order?.totalPrice || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t">
                  {(selectedSettlement.order?.businesses || []).length === 0 ? (
                    <div className="text-sm text-muted-foreground">No business/item details available for this order.</div>
                  ) : (
                    (selectedSettlement.order?.businesses || []).map((orderBusiness, index) => (
                      <div key={`${orderBusiness.business?.id || 'business'}-${index}`} className="rounded-md border p-3">
                        <div className="text-sm font-medium mb-2">
                          {orderBusiness.business?.name || 'Business'}
                          {orderBusiness.business?.businessType ? ` (${orderBusiness.business.businessType})` : ''}
                        </div>

                        {(orderBusiness.items || []).length === 0 ? (
                          <div className="text-xs text-muted-foreground">No items found.</div>
                        ) : (
                          <div className="space-y-2">
                            {(orderBusiness.items || []).map((item) => (
                              <div key={item.id} className="rounded bg-muted/40 p-2 text-xs">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-muted-foreground">Qty {item.quantity}</div>
                                  </div>
                                  <div className="font-medium">EUR {Number(item.unitPrice || 0).toFixed(2)}</div>
                                </div>

                                {item.notes ? (
                                  <div className="mt-1 text-muted-foreground">Notes: {item.notes}</div>
                                ) : null}

                                {(item.selectedOptions || []).length > 0 ? (
                                  <div className="mt-1 text-muted-foreground">
                                    Options: {(item.selectedOptions || [])
                                      .map((opt: any) => `${opt.optionName} (+${Number(opt.priceAtOrder || 0).toFixed(2)})`)
                                      .join(', ')}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                </>
                )}
              </div>

              {selectedSettlement.status === SettlementStatus.Pending && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Single-settlement settling is disabled. Use the aggregate row at the bottom to settle pending totals fully or partially.
                </div>
              )}

              {selectedSettlement.status === SettlementStatus.Paid && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-green-700 font-medium">✓ Settlement Completed</div>
                  <div className="text-sm text-green-600 mt-1">
                    Paid on {selectedSettlement.paidAt ? new Date(selectedSettlement.paidAt).toLocaleString('en-GB') : 'N/A'}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Settlement Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Settlement — {selectedGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The business will receive a push notification and must accept or dispute this request within 48 hours.
            </p>

            <div>
              <Label htmlFor="req-amount" className="text-xs text-muted-foreground mb-1 block">
                Amount (EUR) *
              </Label>
              <Input
                id="req-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={reqAmount}
                onChange={(e) => setReqAmount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="req-period-start" className="text-xs text-muted-foreground mb-1 block">
                  Period Start *
                </Label>
                <Input
                  id="req-period-start"
                  type="date"
                  value={reqPeriodStart}
                  onChange={(e) => setReqPeriodStart(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="req-period-end" className="text-xs text-muted-foreground mb-1 block">
                  Period End *
                </Label>
                <Input
                  id="req-period-end"
                  type="date"
                  value={reqPeriodEnd}
                  onChange={(e) => setReqPeriodEnd(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="req-note" className="text-xs text-muted-foreground mb-1 block">
                Note (optional)
              </Label>
              <textarea
                id="req-note"
                rows={3}
                placeholder="E.g. Settlement for March commissions…"
                value={reqNote}
                onChange={(e) => setReqNote(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setRequestDialogOpen(false)}
                disabled={reqSubmitting}
              >
                Cancel
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700"
                onClick={handleSubmitSettlementRequest}
                disabled={reqSubmitting}
              >
                {reqSubmitting ? 'Sending…' : 'Send Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settle Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Settle — {selectedGroup?.name}
              {activeTab === 'driver' ? ' (Driver, full settlement)' : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {activeTab === 'driver' ? (
              <p className="text-sm text-muted-foreground">
                All unsettled settlements for this driver will be marked as settled and a payment record will be created.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Enter the payment amount. If less than the total balance, a carry-forward settlement will be created for the remainder.
                </p>
                <div>
                  <Label htmlFor="settle-amount" className="text-xs text-muted-foreground mb-1 block">
                    Amount (EUR) *
                  </Label>
                  <Input
                    id="settle-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={settleAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettleAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="settle-method" className="text-xs text-muted-foreground mb-1 block">
                    Payment Method
                  </Label>
                  <Input
                    id="settle-method"
                    placeholder="e.g. Bank Transfer, Cash"
                    value={settlePaymentMethod}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettlePaymentMethod(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="settle-ref" className="text-xs text-muted-foreground mb-1 block">
                    Payment Reference
                  </Label>
                  <Input
                    id="settle-ref"
                    placeholder="e.g. TXN-123456"
                    value={settlePaymentRef}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettlePaymentRef(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="settle-note" className="text-xs text-muted-foreground mb-1 block">
                    Note
                  </Label>
                  <textarea
                    id="settle-note"
                    rows={2}
                    placeholder="Optional note…"
                    value={settleNote}
                    onChange={(e) => setSettleNote(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setSettleDialogOpen(false)}
                disabled={settleSubmitting}
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleSettle}
                disabled={settleSubmitting}
              >
                {settleSubmitting ? 'Settling…' : 'Confirm Settle'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
