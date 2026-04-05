'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

import {
  GET_SETTLEMENT_RULES,
  GET_SETTLEMENT_RULES_COUNT,
  CREATE_SETTLEMENT_RULE,
  UPDATE_SETTLEMENT_RULE,
  DELETE_SETTLEMENT_RULE,
  GET_BUSINESSES_SELECTION,
  GET_PROMOTIONS_SELECTION,
} from '@/graphql/operations/settlements/settlementRules';
import { SettlementRuleScope, SettlementRuleType, SettlementEntityType, SettlementRulesQuery } from '@/gql/graphql';
import { cn } from '@/lib/utils';

type BusinessOption = { id: string; name: string };
type PromotionOption = { id: string; name: string; code?: string | null };
type SettlementRule = NonNullable<SettlementRulesQuery['settlementRules']>[number];

const SCOPE_TABS = [
  { key: 'GLOBAL' as const, label: 'Global', scope: SettlementRuleScope.Global },
  { key: 'BUSINESS' as const, label: 'Business', scope: SettlementRuleScope.Business },
  { key: 'PROMOTION' as const, label: 'Promotion', scope: SettlementRuleScope.Promotion },
  { key: 'BUSINESS_PROMOTION' as const, label: 'Business + Promotion', scope: SettlementRuleScope.BusinessPromotion },
] as const;

type ScopeTab = typeof SCOPE_TABS[number]['key'];

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function formatAmount(rule: SettlementRule): string {
  if (rule.amountType === 'FIXED') return `€${Number(rule.amount).toFixed(2)}`;
  const base = rule.type === SettlementRuleType.DeliveryPrice ? 'delivery fee' : 'subtotal';
  const cap = rule.maxAmount ? ` (max €${Number(rule.maxAmount).toFixed(2)})` : '';
  return `${Number(rule.amount)}% of ${base}${cap}`;
}

export default function SettlementRulesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ScopeTab>('GLOBAL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SettlementRule | null>(null);

  // Filters within each tab
  const [entityTypeFilter, setEntityTypeFilter] = useState<SettlementEntityType | 'ALL'>('ALL');
  const [ruleTypeFilter, setRuleTypeFilter] = useState<SettlementRuleType | 'ALL'>('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const scopeForTab = SCOPE_TABS.find(t => t.key === activeTab)!.scope;

  const filter = useMemo(() => ({
    entityTypes: entityTypeFilter === 'ALL'
      ? [SettlementEntityType.Business, SettlementEntityType.Driver]
      : [entityTypeFilter],
    scopes: [scopeForTab],
    type: ruleTypeFilter === 'ALL' ? undefined : ruleTypeFilter,
  }), [entityTypeFilter, ruleTypeFilter, scopeForTab]);

  const { data: rulesData, loading, refetch } = useQuery(GET_SETTLEMENT_RULES, {
    variables: { filter, limit: pageSize, offset: (page - 1) * pageSize },
    fetchPolicy: 'cache-and-network',
  });

  const { data: countData, refetch: refetchCount } = useQuery(GET_SETTLEMENT_RULES_COUNT, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });

  const { data: businessesData } = useQuery(GET_BUSINESSES_SELECTION, { fetchPolicy: 'cache-and-network' });
  const { data: promotionsData } = useQuery(GET_PROMOTIONS_SELECTION, { fetchPolicy: 'cache-and-network' });

  const [createRule] = useMutation(CREATE_SETTLEMENT_RULE, {
    onCompleted: () => { toast({ title: 'Rule created' }); setIsDialogOpen(false); refetch(); refetchCount(); },
    onError: (e) => { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); },
  });
  const [updateRule] = useMutation(UPDATE_SETTLEMENT_RULE, {
    onCompleted: () => { toast({ title: 'Rule updated' }); setEditingRule(null); refetch(); },
    onError: (e) => { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); },
  });
  const [deleteRule] = useMutation(DELETE_SETTLEMENT_RULE, {
    onCompleted: () => { toast({ title: 'Rule deleted' }); refetch(); refetchCount(); },
  });

  const rules: SettlementRule[] = useMemo(() => (rulesData?.settlementRules ?? []) as SettlementRule[], [rulesData]);
  const totalCount = (countData as any)?.settlementRulesCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const businesses = useMemo(() => (businessesData?.businesses ?? []) as BusinessOption[], [businessesData]);
  const promotions = useMemo(
    () => (promotionsData?.getAllPromotions || []).map((p: any) => ({ id: p.id, name: p.name, code: p.code })),
    [promotionsData],
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as ScopeTab);
    setPage(1);
  };

  const handleRefresh = () => {
    refetch();
    refetchCount();
  };

  return (
    <div className="flex flex-col gap-4 p-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settlement Rules</h1>
          <p className="text-sm text-muted-foreground">
            Configure how settlements are created per order — who owes who and how much.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Dialog open={isDialogOpen || !!editingRule} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingRule(null);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingRule(null)}>Create Rule</Button>
            </DialogTrigger>
            <DialogContent className="z-[70] max-h-[92vh] max-w-lg overflow-y-auto bg-zinc-950 border-zinc-800">
              <DialogHeader>
                <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Rule'}</DialogTitle>
                <DialogDescription>
                  {editingRule ? 'Modify the settlement rule.' : 'Define who owes who and how much per order.'}
                </DialogDescription>
              </DialogHeader>
              <RuleForm
                businesses={businesses}
                promotions={promotions}
                scopeTab={activeTab}
                defaultEntityType={entityTypeFilter === 'ALL' ? SettlementEntityType.Business : entityTypeFilter}
                initialValues={editingRule || undefined}
                onSubmit={async (values) => {
                  if (editingRule) {
                    await updateRule({ variables: { id: editingRule.id, input: values } });
                  } else {
                    await createRule({ variables: { input: values } });
                  }
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Scope Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          {SCOPE_TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Entity Type</Label>
            <Select value={entityTypeFilter} onValueChange={(v) => { setEntityTypeFilter(v as any); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value={SettlementEntityType.Business}>Business</SelectItem>
                <SelectItem value={SettlementEntityType.Driver}>Driver</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rule Type</Label>
            <Select value={ruleTypeFilter} onValueChange={(v) => { setRuleTypeFilter(v as any); setPage(1); }}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value={SettlementRuleType.OrderPrice}>Order Price</SelectItem>
                <SelectItem value={SettlementRuleType.DeliveryPrice}>Delivery Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" className="mt-5 text-xs" onClick={() => {
            setEntityTypeFilter('ALL');
            setRuleTypeFilter('ALL');
            setPage(1);
          }}>
            Reset
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-900/50">
                <TableHead className="w-[22%]">Name</TableHead>
                <TableHead className="w-[10%]">Entity</TableHead>
                <TableHead className="w-[12%] text-center">Type</TableHead>
                <TableHead className="w-[10%]">Direction</TableHead>
                <TableHead className="w-[18%]">Amount</TableHead>
                <TableHead className="w-[16%]">Scope</TableHead>
                <TableHead className="w-[12%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                    No settlement rules found for this scope.
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id} className="border-zinc-800/50">
                    <TableCell>
                      <div className="font-medium">{rule.name}</div>
                      {rule.notes && <div className="mt-0.5 text-xs text-muted-foreground">{rule.notes}</div>}
                      {!rule.isActive && (
                        <Badge variant="secondary" className="mt-1 text-xs bg-zinc-700/30 text-zinc-400">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        'text-xs',
                        rule.entityType === 'BUSINESS' ? 'border-blue-500/30 text-blue-400' : 'border-emerald-500/30 text-emerald-400'
                      )}>
                        {rule.entityType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs text-zinc-400 capitalize">
                        {rule.type.replace('_', ' ').toLowerCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(
                        'text-xs',
                        rule.direction === 'RECEIVABLE'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      )}>
                        {rule.direction}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{formatAmount(rule)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {rule.business && <div>{rule.business.name}</div>}
                      {rule.promotion && <div>Promo: {rule.promotion.name}</div>}
                      {!rule.business && !rule.promotion && 'Global'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingRule(rule)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={cn('h-7 text-xs', rule.isActive ? 'text-orange-400 border-orange-400/30' : 'text-green-400 border-green-400/30')}
                          onClick={() => updateRule({ variables: { id: rule.id, input: { isActive: !rule.isActive } } })}
                        >
                          {rule.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => { if (window.confirm('Delete this rule?')) deleteRule({ variables: { id: rule.id } }); }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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
              {totalCount > 0 ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}` : '0 results'}
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
    </div>
  );
}

function RuleForm({
  businesses,
  promotions,
  scopeTab,
  defaultEntityType,
  initialValues,
  onSubmit,
}: {
  businesses: BusinessOption[];
  promotions: PromotionOption[];
  scopeTab: ScopeTab;
  defaultEntityType: SettlementEntityType;
  initialValues?: SettlementRule;
  onSubmit: (values: any) => void;
}) {
  const [name, setName] = useState(initialValues?.name || '');
  const [entityType, setEntityType] = useState<SettlementEntityType>(initialValues?.entityType || defaultEntityType);
  const [ruleType, setRuleType] = useState<SettlementRuleType>(initialValues?.type || SettlementRuleType.OrderPrice);
  const [direction, setDirection] = useState(initialValues?.direction || 'RECEIVABLE');
  const [amountType, setAmountType] = useState(initialValues?.amountType || 'PERCENT');
  const [amount, setAmount] = useState(initialValues?.amount?.toString() || '');
  const [maxAmount, setMaxAmount] = useState(initialValues?.maxAmount?.toString() || '');
  const [notes, setNotes] = useState(initialValues?.notes || '');

  // Scope fields - locked based on tab
  const showBusiness = scopeTab === 'BUSINESS' || scopeTab === 'BUSINESS_PROMOTION';
  const showPromotion = scopeTab === 'PROMOTION' || scopeTab === 'BUSINESS_PROMOTION';
  const [businessId, setBusinessId] = useState(initialValues?.business?.id || (showBusiness ? '' : 'none'));
  const [promotionId, setPromotionId] = useState(initialValues?.promotion?.id || (showPromotion ? '' : 'none'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { alert('Name is required.'); return; }
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) { alert('Amount must be non-negative.'); return; }
    if (showBusiness && (!businessId || businessId === 'none')) { alert('Business is required for this scope.'); return; }
    if (showPromotion && (!promotionId || promotionId === 'none')) { alert('Promotion is required for this scope.'); return; }

    onSubmit({
      name: name.trim(),
      entityType,
      type: ruleType,
      direction,
      amountType,
      amount: parsedAmount,
      maxAmount: amountType === 'PERCENT' && maxAmount.trim() ? Number(maxAmount) : null,
      businessId: showBusiness && businessId !== 'none' ? businessId : null,
      promotionId: showPromotion && promotionId !== 'none' ? promotionId : null,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 10% commission on subtotal" className="bg-zinc-900 border-zinc-800" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Entity Type</Label>
          <Select value={entityType} onValueChange={(v) => setEntityType(v as SettlementEntityType)}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[80] bg-zinc-950 border-zinc-800">
              <SelectItem value={SettlementEntityType.Business}>Business</SelectItem>
              <SelectItem value={SettlementEntityType.Driver}>Driver</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Direction</Label>
          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[80] bg-zinc-950 border-zinc-800">
              <SelectItem value="RECEIVABLE">Receivable (they owe us)</SelectItem>
              <SelectItem value="PAYABLE">Payable (we owe them)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Rule Type</Label>
          <Select value={ruleType} onValueChange={(v) => setRuleType(v as SettlementRuleType)}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[80] bg-zinc-950 border-zinc-800">
              <SelectItem value={SettlementRuleType.OrderPrice}>Order Price</SelectItem>
              <SelectItem value={SettlementRuleType.DeliveryPrice}>Delivery Price</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Amount Type</Label>
          <Select value={amountType} onValueChange={(v) => { setAmountType(v); if (v !== 'PERCENT') setMaxAmount(''); }}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[80] bg-zinc-950 border-zinc-800">
              <SelectItem value="FIXED">Fixed (EUR per order)</SelectItem>
              <SelectItem value="PERCENT">Percentage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{amountType === 'FIXED' ? 'Amount (EUR)' : 'Percentage (%)'}</Label>
        <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder={amountType === 'FIXED' ? '2.50' : '10'} className="bg-zinc-900 border-zinc-800" />
      </div>

      {amountType === 'PERCENT' && (
        <div className="space-y-2">
          <Label>Max Amount Cap (EUR, optional)</Label>
          <Input type="number" step="0.01" min="0" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)}
            placeholder="e.g. 5.00 — leave empty for no cap" className="bg-zinc-900 border-zinc-800" />
        </div>
      )}

      {showBusiness && (
        <div className="space-y-2">
          <Label>Business *</Label>
          <Select value={businessId} onValueChange={setBusinessId}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800"><SelectValue placeholder="Select business" /></SelectTrigger>
            <SelectContent className="z-[80] bg-zinc-950 border-zinc-800">
              {businesses.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showPromotion && (
        <div className="space-y-2">
          <Label>Promotion *</Label>
          <Select value={promotionId} onValueChange={setPromotionId}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800"><SelectValue placeholder="Select promotion" /></SelectTrigger>
            <SelectContent className="z-[80] bg-zinc-950 border-zinc-800">
              {promotions.map((p) => (<SelectItem key={p.id} value={p.id}>{p.code ? `${p.name} (${p.code})` : p.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Notes (Optional)</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Reason for this rule..." className="bg-zinc-900 border-zinc-800" />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" className="w-full sm:w-auto">Save Rule</Button>
      </div>
    </form>
  );
}
