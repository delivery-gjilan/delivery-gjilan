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
import { useToast } from '@/hooks/use-toast';

import {
    GET_SETTLEMENT_RULES,
    CREATE_SETTLEMENT_RULE,
    UPDATE_SETTLEMENT_RULE,
    DELETE_SETTLEMENT_RULE,
    GET_BUSINESSES_SELECTION,
    GET_PROMOTIONS_SELECTION,
} from '@/graphql/operations/settlements/settlementRules';
import { SettlementRuleScope, SettlementRuleType, SettlementEntityType, SettlementRulesQuery } from '@/gql/graphql';
import { Checkbox } from '@/components/ui/Checkbox';

type BusinessOption = { id: string; name: string };
type PromotionOption = { id: string; name: string; code?: string | null };

type SettlementRule = NonNullable<SettlementRulesQuery['settlementRules']>[number];

function formatAmount(rule: SettlementRule): string {
    if (rule.amountType === 'FIXED') {
        return `€${Number(rule.amount).toFixed(2)}`;
    }
    const base = rule.type === SettlementRuleType.DeliveryPrice ? 'delivery fee' : 'subtotal';
    return `${Number(rule.amount)}% of ${base}`;
}

function formatScope(rule: SettlementRule): string {
    const parts: string[] = [];
    if (rule.business) parts.push(rule.business.name);
    if (rule.promotion) parts.push(`promo: ${rule.promotion.name}`);
    return parts.length > 0 ? parts.join(', ') : 'Global';
}

export default function SettlementRulesPage() {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeEntityType, setActiveEntityType] = useState<SettlementEntityType | 'ALL'>(
        SettlementEntityType.Business,
    );

    // Filters
    const [selectedScopes, setSelectedScopes] = useState<SettlementRuleScope[]>([]);
    const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
    const [selectedPromotionIds, setSelectedPromotionIds] = useState<string[]>([]);
    const [activeRuleType, setActiveRuleType] = useState<SettlementRuleType | null>(null);

    const {
        data: rulesData,
        loading,
        refetch,
    } = useQuery(GET_SETTLEMENT_RULES, {
        variables: {
            filter: {
                entityTypes:
                    activeEntityType === 'ALL'
                        ? [SettlementEntityType.Business, SettlementEntityType.Driver]
                        : [activeEntityType],
                scopes: selectedScopes.length > 0 ? selectedScopes : undefined,
                businessIds: selectedBusinessIds.length > 0 ? selectedBusinessIds : undefined,
                promotionIds: selectedPromotionIds.length > 0 ? selectedPromotionIds : undefined,
                type: activeRuleType || undefined,
            },
        },
        fetchPolicy: 'cache-and-network',
    });

    const { data: businessesData } = useQuery(GET_BUSINESSES_SELECTION, { fetchPolicy: 'cache-and-network' });
    const { data: promotionsData } = useQuery(GET_PROMOTIONS_SELECTION, { fetchPolicy: 'cache-and-network' });

    const [createRule] = useMutation(CREATE_SETTLEMENT_RULE, {
        onCompleted: () => {
            toast({ title: 'Settlement rule created' });
            setIsDialogOpen(false);
            refetch();
        },
        onError: (error) => {
            toast({ title: 'Failed to create rule', description: error.message, variant: 'destructive' });
        },
    });

    const [updateRule] = useMutation(UPDATE_SETTLEMENT_RULE, {
        onCompleted: () => {
            toast({ title: 'Rule updated' });
            refetch();
        },
    });

    const [deleteRule] = useMutation(DELETE_SETTLEMENT_RULE, {
        onCompleted: () => {
            toast({ title: 'Rule deleted' });
            refetch();
        },
    });

    const rules: SettlementRule[] = useMemo(
        () => (rulesData?.settlementRules ?? []) as SettlementRule[],
        [rulesData?.settlementRules],
    );
    const businesses = useMemo(
        () => (businessesData?.businesses ?? []) as { id: string; name: string }[],
        [businessesData],
    );
    const promotions = useMemo(
        () => (promotionsData?.getAllPromotions || []).map((p: any) => ({ id: p.id, name: p.name, code: p.code })),
        [promotionsData],
    );

    const toggleScope = (scope: SettlementRuleScope) => {
        setSelectedScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Settlement Rules</h1>
                    <p className="text-sm text-muted-foreground">
                        Configure how settlements are created for each order — who owes who and how much.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        Refresh
                    </Button>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>Create Rule</Button>
                        </DialogTrigger>
                        <DialogContent className="z-[70] max-h-[92vh] max-w-lg overflow-y-auto bg-zinc-950 border-zinc-800">
                            <DialogHeader>
                                <DialogTitle>Create Settlement Rule</DialogTitle>
                                <DialogDescription>Define who owes who and how much per order.</DialogDescription>
                            </DialogHeader>

                            <CreateRuleForm
                                businesses={businesses}
                                promotions={promotions}
                                defaultEntityType={
                                    activeEntityType === 'ALL' ? SettlementEntityType.Business : activeEntityType
                                }
                                onSubmit={(values) => createRule({ variables: { input: values } })}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[240px_1fr]">
                <aside className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Entity Type</Label>
                        <Tabs
                            value={activeEntityType}
                            onValueChange={(v) => setActiveEntityType(v as SettlementEntityType | 'ALL')}
                            className="w-full"
                        >
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="ALL">All Entities</TabsTrigger>
                                <TabsTrigger value={SettlementEntityType.Business}>Business</TabsTrigger>
                                <TabsTrigger value={SettlementEntityType.Driver}>Driver</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Scopes</Label>
                        <div className="space-y-2">
                            {(Object.values(SettlementRuleScope) as SettlementRuleScope[]).map((scope) => (
                                <div key={scope} className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={selectedScopes.includes(scope)}
                                        onChange={() => toggleScope(scope)}
                                    />
                                    <span
                                        onClick={() => toggleScope(scope)}
                                        className="text-sm font-medium leading-none cursor-pointer"
                                    >
                                        {scope.replace('_', ' ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rule Type</Label>
                        <Select
                            value={activeRuleType || 'ALL'}
                            onValueChange={(v) => setActiveRuleType(v === 'ALL' ? null : (v as SettlementRuleType))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Types</SelectItem>
                                <SelectItem value={SettlementRuleType.OrderPrice}>Order Price</SelectItem>
                                <SelectItem value={SettlementRuleType.DeliveryPrice}>Delivery Price</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                            Filter Businesses
                        </Label>
                        <Select
                            value={selectedBusinessIds[0] || 'all'}
                            onValueChange={(v) => setSelectedBusinessIds(v === 'all' ? [] : [v])}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Businesses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Businesses</SelectItem>
                                {businesses.map((b) => (
                                    <SelectItem key={b.id} value={b.id}>
                                        {b.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                            Filter Promotions
                        </Label>
                        <Select
                            value={selectedPromotionIds[0] || 'all'}
                            onValueChange={(v) => setSelectedPromotionIds(v === 'all' ? [] : [v])}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Promotions" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Promotions</SelectItem>
                                {promotions.map((p: PromotionOption) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.code ? `${p.name} (${p.code})` : p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => {
                            setSelectedScopes([]);
                            setSelectedBusinessIds([]);
                            setSelectedPromotionIds([]);
                            setActiveRuleType(null);
                        }}
                    >
                        Reset Filters
                    </Button>
                </aside>

                <main>
                    <RulesTable
                        loading={loading}
                        rules={rules}
                        onToggleActive={(id, isActive) => updateRule({ variables: { id, input: { isActive } } })}
                        onDelete={(id) => {
                            if (confirm('Delete this settlement rule?')) {
                                deleteRule({ variables: { id } });
                            }
                        }}
                    />
                </main>
            </div>
        </div>
    );
}

function RulesTable({
    loading,
    rules,
    onToggleActive,
    onDelete,
}: {
    loading: boolean;
    rules: SettlementRule[];
    onToggleActive: (id: string, isActive: boolean) => void;
    onDelete: (id: string) => void;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-sm">
            <Table>
                <TableHeader className="bg-zinc-900">
                    <TableRow>
                        <TableHead className="w-[22%]">Name</TableHead>
                        <TableHead className="w-[14%] text-center">Type</TableHead>
                        <TableHead className="w-[14%]">Direction</TableHead>
                        <TableHead className="w-[18%]">Amount</TableHead>
                        <TableHead className="w-[20%]">Scope</TableHead>
                        <TableHead className="w-[12%] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        Array.from({ length: 3 }).map((_, idx) => (
                            <TableRow key={idx}>
                                <TableCell colSpan={6}>
                                    <Skeleton className="h-10 w-full" />
                                </TableCell>
                            </TableRow>
                        ))
                    ) : rules.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                No settlement rules found with current filters.
                            </TableCell>
                        </TableRow>
                    ) : (
                        rules.map((rule) => (
                            <TableRow key={rule.id} className="border-zinc-800/50">
                                <TableCell>
                                    <div className="font-medium">{rule.name}</div>
                                    {rule.notes && (
                                        <div className="mt-0.5 text-xs text-muted-foreground">{rule.notes}</div>
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="text-xs text-zinc-400 capitalize">
                                        {rule.type.replace('_', ' ').toLowerCase()}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                            rule.direction === 'RECEIVABLE'
                                                ? 'bg-green-500/10 text-green-400'
                                                : 'bg-red-500/10 text-red-400'
                                        }`}
                                    >
                                        {rule.direction}
                                    </span>
                                </TableCell>
                                <TableCell className="font-mono text-xs">{formatAmount(rule)}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{formatScope(rule)}</TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            size="sm"
                                            variant={rule.isActive ? 'outline' : 'default'}
                                            className="h-8 text-xs"
                                            onClick={() => onToggleActive(rule.id, !rule.isActive)}
                                        >
                                            {rule.isActive ? 'Deactivate' : 'Activate'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="h-8 text-xs"
                                            onClick={() => onDelete(rule.id)}
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
    );
}

function CreateRuleForm({
    businesses,
    promotions,
    defaultEntityType,
    onSubmit,
}: {
    businesses: BusinessOption[];
    promotions: PromotionOption[];
    defaultEntityType: SettlementEntityType;
    onSubmit: (values: any) => void;
}) {
    const [name, setName] = useState('');
    const [entityType, setEntityType] = useState<SettlementEntityType>(defaultEntityType);
    const [ruleType, setRuleType] = useState<SettlementRuleType>(SettlementRuleType.OrderPrice);
    const [direction, setDirection] = useState('RECEIVABLE');
    const [amountType, setAmountType] = useState('PERCENT');
    const [amount, setAmount] = useState('');
    const [businessId, setBusinessId] = useState('none');
    const [promotionId, setPromotionId] = useState('none');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            alert('Name is required.');
            return;
        }

        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            alert('Amount must be a non-negative number.');
            return;
        }

        onSubmit({
            name: name.trim(),
            entityType,
            type: ruleType,
            direction,
            amountType,
            amount: parsedAmount,
            businessId: businessId !== 'none' ? businessId : null,
            promotionId: promotionId !== 'none' ? promotionId : null,
            notes: notes || null,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label>Name</Label>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. 10% commission on subtotal"
                    className="bg-zinc-900 border-zinc-800"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label>Entity Type</Label>
                    <Select value={entityType} onValueChange={(v) => setEntityType(v as SettlementEntityType)}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[80] bg-zinc-950 border-zinc-800">
                            <SelectItem value={SettlementEntityType.Business}>Business</SelectItem>
                            <SelectItem value={SettlementEntityType.Driver}>Driver</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Direction</Label>
                    <Select value={direction} onValueChange={setDirection}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800">
                            <SelectValue />
                        </SelectTrigger>
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
                        <SelectTrigger className="bg-zinc-900 border-zinc-800">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[80] bg-zinc-950 border-zinc-800">
                            <SelectItem value={SettlementRuleType.OrderPrice}>Order Price</SelectItem>
                            <SelectItem value={SettlementRuleType.DeliveryPrice}>Delivery Price</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Amount Type</Label>
                    <Select value={amountType} onValueChange={setAmountType}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[80] bg-zinc-950 border-zinc-800">
                            <SelectItem value="FIXED">Fixed (EUR per order)</SelectItem>
                            <SelectItem value="PERCENT">Percentage</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>{amountType === 'FIXED' ? 'Amount (EUR)' : 'Percentage (%)'}</Label>
                <Input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={amountType === 'FIXED' ? '2.50' : '10'}
                    className="bg-zinc-900 border-zinc-800"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label>Business Scope (Optional)</Label>
                    <Select value={businessId} onValueChange={setBusinessId}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800">
                            <SelectValue placeholder="All businesses" />
                        </SelectTrigger>
                        <SelectContent className="z-[80] bg-zinc-950 border-zinc-800">
                            <SelectItem value="none">All businesses (global)</SelectItem>
                            {businesses.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                    {b.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Promotion Scope (Optional)</Label>
                    <Select value={promotionId} onValueChange={setPromotionId}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800">
                            <SelectValue placeholder="All promotions" />
                        </SelectTrigger>
                        <SelectContent className="z-[80] bg-zinc-950 border-zinc-800">
                            <SelectItem value="none">All promotions (global)</SelectItem>
                            {promotions.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.code ? `${p.name} (${p.code})` : p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reason for this rule..."
                    className="bg-zinc-900 border-zinc-800"
                />
            </div>

            <div className="flex justify-end pt-2">
                <Button type="submit" className="w-full sm:w-auto">
                    Save Rule
                </Button>
            </div>
        </form>
    );
}
