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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, User, RefreshCw, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettlementType, SettlementStatus, SettlementDirection } from '@/gql/graphql';
import { gql } from '@apollo/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const MARK_SETTLEMENT_AS_PAID = gql`
  mutation MarkSettlementAsPaid($settlementId: ID!) {
    markSettlementAsPaid(settlementId: $settlementId) {
      id
      status
      amount
      paidAt
    }
  }
`;

const MARK_SETTLEMENT_AS_PARTIALLY_PAID = gql`
  mutation MarkSettlementAsPartiallyPaid($settlementId: ID!, $amount: Float!) {
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
  const [entityFilter, setEntityFilter] = useState<string>(''); // business or driver ID
  const [entitySearch, setEntitySearch] = useState('');
  const [isEntityDropdownOpen, setIsEntityDropdownOpen] = useState(false);
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

  // Get unique entities for filtering
  const entities = activeTab === 'business'
    ? Array.from(
        new Map(
          businessSettlements
            .filter((s: any) => s.business)
            .map((s: any) => [s.business.id, s.business])
        ).values()
      )
    : Array.from(
        new Map(
          driverSettlements
            .filter((s: any) => s.driver)
            .map((s: any) => [s.driver.id, s.driver])
        ).values()
      );

  const filteredEntities = entities.filter((entity: any) => {
    const searchText = entitySearch.toLowerCase();
    if (activeTab === 'business') {
      return entity.name?.toLowerCase().includes(searchText);
    } else {
      return (
        entity.firstName?.toLowerCase().includes(searchText) ||
        entity.lastName?.toLowerCase().includes(searchText)
      );
    }
  });

  // Filter settlements by search query and entity filter
  const filteredSettlements = currentSettlements.filter((settlement: any) => {
    // Filter by entity
    if (entityFilter) {
      if (activeTab === 'business' && settlement.business?.id !== entityFilter) {
        return false;
      }
      if (activeTab === 'driver' && settlement.driver?.id !== entityFilter) {
        return false;
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        settlement.id.toLowerCase().includes(query) ||
        settlement.order?.id.toLowerCase().includes(query) ||
        settlement.paymentReference?.toLowerCase().includes(query) ||
        settlement.driver?.firstName?.toLowerCase().includes(query) ||
        settlement.driver?.lastName?.toLowerCase().includes(query) ||
        settlement.business?.name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Calculate totals for current view
  const totals = {
    total: filteredSettlements.reduce((sum: number, s: any) => sum + parseFloat(s.amount || 0), 0),
    pending: filteredSettlements
      .filter((s: any) => s.status === SettlementStatus.Pending)
      .reduce((sum: number, s: any) => sum + parseFloat(s.amount || 0), 0),
    paid: filteredSettlements
      .filter((s: any) => s.status === SettlementStatus.Paid)
      .reduce((sum: number, s: any) => sum + parseFloat(s.amount || 0), 0),
  };

  const handleRefresh = () => {
    if (activeTab === 'business') {
      refetchBusiness();
    } else {
      refetchDriver();
    }
  };

  const renderContent = () => (
    <Card className="shadow-sm">
      {/* Filters and Stats Bar */}
      <div className="bg-muted/30">
        <div className="p-4">
          {/* Controls Row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Search ${activeTab === 'business' ? 'business' : 'driver'} settlements...`}
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-background"
              />
            </div>

            {/* Entity Filter Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEntityDropdownOpen(!isEntityDropdownOpen)}
                className="h-10"
              >
                {activeTab === 'business' ? <Building2 className="h-4 w-4 mr-2" /> : <User className="h-4 w-4 mr-2" />}
                {entityFilter
                  ? activeTab === 'business'
                    ? entities.find((e: any) => e.id === entityFilter)?.name || 'Select'
                    : `${entities.find((e: any) => e.id === entityFilter)?.firstName} ${entities.find((e: any) => e.id === entityFilter)?.lastName}`
                  : 'All ' + (activeTab === 'business' ? 'Businesses' : 'Drivers')}
                {entityFilter && <X className="h-3 w-3 ml-2" />}
              </Button>

              {isEntityDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-background border rounded-md shadow-lg z-50">
                  <div className="p-2 border-b">
                    <Input
                      placeholder={`Search ${activeTab === 'business' ? 'businesses' : 'drivers'}...`}
                      value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)}
                      className="h-9 bg-muted/50"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <Button
                      variant={entityFilter === '' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setEntityFilter('');
                        setIsEntityDropdownOpen(false);
                      }}
                      className="w-full justify-start h-9 rounded-none"
                    >
                      All {activeTab === 'business' ? 'Businesses' : 'Drivers'}
                    </Button>
                    {filteredEntities.map((entity: any) => (
                      <Button
                        key={entity.id}
                        variant={entityFilter === entity.id ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setEntityFilter(entity.id);
                          setIsEntityDropdownOpen(false);
                        }}
                        className="w-full justify-start h-9 rounded-none text-left"
                      >
                        {activeTab === 'business' ? entity.name : `${entity.firstName} ${entity.lastName}`}
                      </Button>
                    ))}
                    {filteredEntities.length === 0 && (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        No {activeTab === 'business' ? 'businesses' : 'drivers'} found
                      </div>
                    )}
                  </div>
                </div>
              )}
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
              <TableHead className="font-semibold">{activeTab === 'business' ? 'Business' : 'Driver'}</TableHead>
              <TableHead className="font-semibold">Direction</TableHead>
              <TableHead className="font-semibold text-right">Amount</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Order ID</TableHead>
              <TableHead className="font-semibold">Payment Ref</TableHead>
              <TableHead className="font-semibold text-right">Date</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-9 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredSettlements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-20">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-lg font-medium">No settlements found</div>
                    <div className="text-sm">Try adjusting your filters or search query</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredSettlements.map((settlement: any) => (
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
                    {settlement.currency} {parseFloat(settlement.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={settlement.status === SettlementStatus.Paid ? 'default' : 'secondary'}
                      className={cn(
                        "font-medium",
                        settlement.status === SettlementStatus.Paid && "bg-green-600",
                        settlement.status === SettlementStatus.Pending && "bg-orange-500"
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
            )}
          </TableBody>
        </Table>
      </div>
      
      {!loading && filteredSettlements.length > 0 && (
        <div className="px-4 py-3 bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredSettlements.length}</span> of <span className="font-semibold text-foreground">{currentSettlements.length}</span> settlements
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
              setEntityFilter('');
              setEntitySearch('');
              setIsEntityDropdownOpen(false);
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
              setEntityFilter('');
              setEntitySearch('');
              setIsEntityDropdownOpen(false);
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
