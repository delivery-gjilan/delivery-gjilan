'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_SETTLEMENTS } from '@/graphql/operations/settlements/queries';
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
import { ArrowLeft, Building2, ChevronRight, RefreshCw, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SettlementType,
  SettlementStatus,
  SettlementDirection,
  type GetSettlementsQuery,
} from '@/gql/graphql';
import { gql } from '@apollo/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type SettlementRecord = GetSettlementsQuery['settlements'][number];

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

const MARK_SETTLEMENT_AS_PAID = gql`
  mutation MarkSettlementAsPaidPage($settlementId: ID!) {
    markSettlementAsPaid(settlementId: $settlementId) {
      id
      status
      amount
      paidAt
    }
  }
`;

const MARK_SETTLEMENT_AS_PARTIALLY_PAID = gql`
  mutation MarkSettlementAsPartiallyPaidPage($settlementId: ID!, $amount: Float!) {
    markSettlementAsPartiallyPaid(settlementId: $settlementId, amount: $amount) {
      id
      status
      amount
      paidAt
    }
  }
`;

const BACKFILL_SETTLEMENTS = gql`
  mutation BackfillSettlements {
    backfillSettlementsForDeliveredOrders
  }
`;

export default function SettlementsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'business' | 'driver'>('business');
  const [statusFilter, setStatusFilter] = useState<'all' | SettlementStatus>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | SettlementDirection>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);
  const [partialAmount, setPartialAmount] = useState('');

  // Query for business settlements
  const {
    data: businessData,
    loading: businessLoading,
    refetch: refetchBusiness,
  } = useQuery(GET_SETTLEMENTS, {
    variables: {
      type: SettlementType.Business,
      status: statusFilter === 'all' ? null : statusFilter,
      direction: directionFilter === 'all' ? null : directionFilter,
      limit: 200,
    },
  });

  // Query for driver settlements
  const {
    data: driverData,
    loading: driverLoading,
    refetch: refetchDriver,
  } = useQuery(GET_SETTLEMENTS, {
    variables: {
      type: SettlementType.Driver,
      status: statusFilter === 'all' ? null : statusFilter,
      direction: directionFilter === 'all' ? null : directionFilter,
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

      if (settlement.status === SettlementStatus.Pending) {
        existingGroup.pendingAmount += amount;
        existingGroup.pendingCount += 1;
      }

      if (settlement.status === SettlementStatus.Paid) {
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
      pendingAmount: settlement.status === SettlementStatus.Pending ? amount : 0,
      paidAmount: settlement.status === SettlementStatus.Paid ? amount : 0,
      pendingCount: settlement.status === SettlementStatus.Pending ? 1 : 0,
      paidCount: settlement.status === SettlementStatus.Paid ? 1 : 0,
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

  // Mark as paid mutation
  const [markAsPaid] = useMutation(MARK_SETTLEMENT_AS_PAID, {
    onCompleted: () => {
      toast({
        title: 'Success',
        description: 'Settlement marked as paid',
      });
      setSelectedSettlement(null);
      handleRefresh();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark settlement as paid',
        variant: 'destructive',
      });
    },
  });

  // Mark as partially paid mutation
  const [markAsPartiallyPaid] = useMutation(MARK_SETTLEMENT_AS_PARTIALLY_PAID, {
    onCompleted: () => {
      toast({
        title: 'Success',
        description: 'Partial payment recorded',
      });
      setSelectedSettlement(null);
      setPartialAmount('');
      handleRefresh();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record partial payment',
        variant: 'destructive',
      });
    },
  });

  // Backfill settlements mutation
  const [backfillSettlements, { loading: backfillLoading }] = useMutation(BACKFILL_SETTLEMENTS, {
    onCompleted: (data) => {
      toast({
        title: 'Success',
        description: `Backfilled ${data.backfillSettlementsForDeliveredOrders} settlements from delivered orders`,
      });
      handleRefresh();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to backfill settlements',
        variant: 'destructive',
      });
    },
  });

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
          ? item.status === SettlementStatus.Pending
            ? Number(item.amount || 0)
            : 0
          : item.pendingAmount),
      0
    ),
    paid: totalsSource.reduce(
      (sum: number, item: SettlementRecord | SettlementGroup) =>
        sum + ('amount' in item
          ? item.status === SettlementStatus.Paid
            ? Number(item.amount || 0)
            : 0
          : item.paidAmount),
      0
    ),
  };

  const handleRefresh = () => {
    if (activeTab === 'business') {
      refetchBusiness();
    } else {
      refetchDriver();
    }
  };

  const resetGroupSelection = () => {
    setSelectedEntityId(null);
    setSearchQuery('');
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
              <Button variant="ghost" size="sm" onClick={resetGroupSelection} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to {activeTab === 'business' ? 'businesses' : 'drivers'}
              </Button>
            </div>
          )}

          {/* Controls Row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={selectedGroup
                  ? `Search ${activeTab === 'business' ? 'business' : 'driver'} settlements...`
                  : `Search ${activeTab === 'business' ? 'business' : 'driver'} groups...`}
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-background"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground mr-1">Status:</span>
              <div className="flex gap-1 rounded-md bg-muted/30 p-1">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="h-7 px-3"
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === SettlementStatus.Pending ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(SettlementStatus.Pending)}
                  className="h-7 px-3"
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === SettlementStatus.Paid ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(SettlementStatus.Paid)}
                  className="h-7 px-3"
                >
                  Paid
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground mr-1">Direction:</span>
              <div className="flex gap-1 rounded-md bg-muted/30 p-1">
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
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {selectedGroup ? (
                <>
                  <TableHead className="font-semibold">{activeTab === 'business' ? 'Business' : 'Driver'}</TableHead>
                  <TableHead className="font-semibold">Direction</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Order ID</TableHead>
                  <TableHead className="font-semibold">Payment Ref</TableHead>
                  <TableHead className="font-semibold text-right">Date</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="font-semibold">{activeTab === 'business' ? 'Business' : 'Driver'}</TableHead>
                  <TableHead className="font-semibold">Reference</TableHead>
                  <TableHead className="font-semibold text-right">Settlements</TableHead>
                  <TableHead className="font-semibold text-right">Pending</TableHead>
                  <TableHead className="font-semibold text-right">Paid</TableHead>
                  <TableHead className="font-semibold text-right">Total</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={selectedGroup ? 8 : 7}>
                    <Skeleton className="h-9 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : selectedGroup ? filteredSettlements.length === 0 : filteredGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectedGroup ? 8 : 7} className="text-center text-muted-foreground py-20">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-lg font-medium">
                      {selectedGroup ? 'No settlements found' : `No ${activeTab === 'business' ? 'businesses' : 'drivers'} found`}
                    </div>
                    <div className="text-sm">Try adjusting your filters or search query</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : selectedGroup ? (
              filteredSettlements.map((settlement: SettlementRecord) => (
                <TableRow 
                  key={settlement.id}
                  className="hover:bg-muted/40"
                >
                  <TableCell 
                    className="font-medium cursor-pointer"
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
                      className="font-medium"
                    >
                      {settlement.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-right tabular-nums">
                    {settlement.currency} {Number(settlement.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={settlement.status === SettlementStatus.Paid ? 'default' : 'secondary'}
                      className={cn(
                        'font-medium',
                        settlement.status === SettlementStatus.Paid && 'bg-green-600',
                        settlement.status === SettlementStatus.Pending && 'bg-orange-500'
                      )}
                    >
                      {settlement.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {settlement.order?.id?.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-sm">
                    {settlement.paymentReference || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-right text-muted-foreground tabular-nums">
                    {new Date(settlement.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={settlement.status === SettlementStatus.Pending ? 'default' : 'ghost'}
                      onClick={() => setSelectedSettlement(settlement)}
                    >
                      {settlement.status === SettlementStatus.Pending ? 'Settle' : 'View'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              filteredGroups.map((group) => (
                <TableRow 
                  key={group.id}
                  className="hover:bg-muted/40"
                >
                  <TableCell className="font-medium">
                    <div>{group.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{group.id}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {group.subtitle}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {group.settlements.length}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-orange-600 font-medium">
                    €{group.pendingAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-green-600 font-medium">
                    €{group.paidAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
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
                      className="gap-2"
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
      
      {!loading && (selectedGroup ? filteredSettlements.length > 0 : filteredGroups.length > 0) && (
        <div className="px-4 py-3 bg-muted/30">
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
      <Dialog open={!!selectedSettlement} onOpenChange={(open) => !open && setSelectedSettlement(null)}>
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
                  <div className="font-mono text-sm mt-1">{selectedSettlement.order?.id.slice(0, 12)}...</div>
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
              </div>

              {/* Amount Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Settlement Amount</span>
                  <span className="text-2xl font-bold">{selectedSettlement.currency} {parseFloat(selectedSettlement.amount).toFixed(2)}</span>
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

              {/* Settlement Actions */}
              {selectedSettlement.status === SettlementStatus.Pending && (
                <div className="space-y-4 pt-4 border-t">
                  {/* Full Settlement */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Mark as Fully Paid</Label>
                    <Button
                      onClick={() => markAsPaid({ variables: { settlementId: selectedSettlement.id } })}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Mark as Fully Paid ({selectedSettlement.currency} {parseFloat(selectedSettlement.amount).toFixed(2)})
                    </Button>
                  </div>

                  {/* Partial Settlement */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Record Partial Payment</Label>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="partial-amount" className="text-sm mb-2 block">Amount to Pay</Label>
                        <Input
                          id="partial-amount"
                          type="number"
                          min="0"
                          max={parseFloat(selectedSettlement.amount)}
                          step="0.01"
                          placeholder={`Max: ${selectedSettlement.currency} ${parseFloat(selectedSettlement.amount).toFixed(2)}`}
                          value={partialAmount}
                          onChange={(e) => setPartialAmount(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={() => {
                          if (partialAmount && parseFloat(partialAmount) > 0) {
                            markAsPartiallyPaid({
                              variables: {
                                settlementId: selectedSettlement.id,
                                amount: parseFloat(partialAmount),
                              },
                            });
                          }
                        }}
                        variant="outline"
                        className="w-full"
                        disabled={!partialAmount || parseFloat(partialAmount) <= 0||  parseFloat(partialAmount) > parseFloat(selectedSettlement.amount)}
                      >
                        Record Partial Payment
                      </Button>
                    </div>
                  </div>
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
    </div>
  );
}
