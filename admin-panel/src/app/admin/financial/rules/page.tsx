'use client';

import { useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const GET_SETTLEMENT_RULES = gql`
    query SettlementRules($filter: SettlementRuleFilterInput) {
        settlementRules(filter: $filter) {
            id
            name
            entityType
            direction
            amountType
            amount
            appliesTo
            business { id name }
            promotion { id name }
            isActive
            notes
            updatedAt
        }
    }
`;

const GET_BUSINESSES = gql`
    query BusinessesForSettlementRules {
        businesses {
            id
            name
        }
    }
`;

const GET_PROMOTIONS = gql`
    query PromotionsForSettlementRules {
        getAllPromotions(isActive: true) {
            id
            name
            code
        }
    }
`;

const CREATE_SETTLEMENT_RULE = gql`
    mutation CreateSettlementRule($input: CreateSettlementRuleInput!) {
        createSettlementRule(input: $input) {
            id
        }
    }
`;

const UPDATE_SETTLEMENT_RULE = gql`
    mutation UpdateSettlementRule($id: ID!, $input: UpdateSettlementRuleInput!) {
        updateSettlementRule(id: $id, input: $input) {
            id
            isActive
        }
    }
`;

const DELETE_RULE = gql`
    mutation DeleteSettlementRule($id: ID!) {
        deleteSettlementRule(id: $id)
    }
`;

type EntityType = 'BUSINESS' | 'DRIVER';
type AmountType = 'FIXED' | 'PERCENT';
type Direction = 'RECEIVABLE' | 'PAYABLE';

type BusinessOption = { id: string; name: string };
type PromotionOption = { id: string; name: string; code?: string | null };

type SettlementRule = {
    id: string;
    name: string;
    entityType: EntityType;
    direction: Direction;
    amountType: AmountType;
    amount: number;
    appliesTo?: string | null;
    business?: { id: string; name: string } | null;
    promotion?: { id: string; name: string } | null;
    isActive: boolean;
    notes?: string | null;
    updatedAt: string;
};

function formatAmount(rule: SettlementRule): string {
    if (rule.amountType === 'FIXED') {
        return `â‚¬${Number(rule.amount).toFixed(2)}`;
    }
    const base = rule.appliesTo === 'DELIVERY_FEE' ? 'delivery fee' : 'subtotal';
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
    const [activeTab, setActiveTab] = useState<EntityType>('BUSINESS');

    const { data, loading, refetch } = useQuery(GET_SETTLEMENT_RULES, {
        variables: { filter: { entityType: activeTab } },
        fetchPolicy: 'cache-and-network',
    });

    const { data: businessesData } = useQuery(GET_BUSINESSES, { fetchPolicy: 'cache-and-network' });
    const { data: promotionsData } = useQuery(GET_PROMOTIONS, { fetchPolicy: 'cache-and-network' });

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

    const [deleteRule] = useMutation(DELETE_RULE, {
        onCompleted: () => {
            toast({ title: 'Rule deleted' });
            refetch();
        },
    });

    const rules: SettlementRule[] = useMemo(() => data?.settlementRules ?? [], [data?.settlementRules]);
    const businesses: BusinessOption[] = useMemo(() => businessesData?.businesses ?? [], [businessesData]);
    const promotions: PromotionOption[] = useMemo(
        () => (promotionsData?.getAllPromotions || []).map((p: any) => ({ id: p.id, name: p.name, code: p.code })),
        [promotionsData],
    );

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Settlement Rules</h1>
                    <p className="text-sm text-muted-foreground">
                        Configure how settlements are created for each order â€” who owes who and how much.
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
                        <DialogContent className="z-[70] max-h-[92vh] max-w-lg overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Create Settlement Rule</DialogTitle>
                                <DialogDescription>Define who owes who and how much per order.</DialogDescription>
                            </DialogHeader>

                            <CreateRuleForm
                                businesses={businesses}
                                promotions={promotions}
                                defaultEntityType={activeTab}
                                onSubmit={(values) => createRule({ variables: { input: values } })}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EntityType)} className="w-full">
                <TabsList className="grid w-full max-w-[340px] grid-cols-2">
                    <TabsTrigger value="BUSINESS">Business</TabsTrigger>
                    <TabsTrigger value="DRIVER">Driver</TabsTrigger>
                </TabsList>

                <TabsContent value="BUSINESS" className="mt-4">
                    <RulesTable
                        loading={loading}
                        rules={rules}
                        onToggleActive={(id, isActive) => updateRule({ variables: { id, input: { isActive } } })}
                        onDelete={(id) => deleteRule({ variables: { id } })}
                    />
                </TabsContent>

                <TabsContent value="DRIVER" className="mt-4">
                    <RulesTable
                        loading={loading}
                        rules={rules}
                        onToggleActive={(id, isActive) => updateRule({ variables: { id, input: { isActive } } })}
                        onDelete={(id) => deleteRule({ variables: { id } })}
                    />
                </TabsContent>
            </Tabs>
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
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Table>
                <TableHeader className="bg-muted/40">
                    <TableRow>
                        <TableHead className="w-[22%]">Name</TableHead>
                        <TableHead className="w-[14%]">Direction</TableHead>
                        <TableHead className="w-[20%]">Amount</TableHead>
                        <TableHead className="w-[22%]">Scope</TableHead>
                        <TableHead className="w-[10%] text-center">Status</TableHead>
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
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                No settlement rules found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        rules.map((rule) => (
                            <TableRow key={rule.id}>
                                <TableCell>
                                    <div className="font-medium">{rule.name}</div>
                                    {rule.notes && (
                                        <div className="mt-0.5 text-xs text-muted-foreground">{rule.notes}</div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                            rule.direction === 'RECEIVABLE'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}
                                    >
                                        {rule.direction}
                                    </span>
                                </TableCell>
                                <TableCell>{formatAmount(rule)}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {formatScope(rule)}
                                </TableCell>
                                <TableCell className="text-center">
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                            rule.isActive
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        {rule.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2">
                                        {rule.isActive ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onToggleActive(rule.id, false)}
                                            >
                                                Deactivate
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => onToggleActive(rule.id, true)}
                                            >
                                                Activate
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => {
                                                if (confirm('Delete this settlement rule?')) {
                                                    onDelete(rule.id);
                                                }
                                            }}
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
    defaultEntityType: EntityType;
    onSubmit: (values: {
        name: string;
        entityType: EntityType;
        direction: Direction;
        amountType: AmountType;
        amount: number;
        appliesTo?: string | null;
        businessId?: string | null;
        promotionId?: string | null;
        notes?: string | null;
    }) => void;
}) {
    const [name, setName] = useState('');
    const [entityType, setEntityType] = useState<EntityType>(defaultEntityType);
    const [direction, setDirection] = useState<Direction>('RECEIVABLE');
    const [amountType, setAmountType] = useState<AmountType>('PERCENT');
    const [amount, setAmount] = useState('');
    const [appliesTo, setAppliesTo] = useState('SUBTOTAL');
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
            direction,
            amountType,
            amount: parsedAmount,
            appliesTo: amountType === 'PERCENT' ? appliesTo : null,
            businessId: businessId !== 'none' ? businessId : null,
            promotionId: promotionId !== 'none' ? promotionId : null,
            notes: notes || null,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Name</Label>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. 10% commission on subtotal"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label>Entity Type</Label>
                    <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[80]">
                            <SelectItem value="BUSINESS">Business</SelectItem>
                            <SelectItem value="DRIVER">Driver</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Direction</Label>
                    <Select value={direction} onValueChange={(v) => setDirection(v as Direction)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[80]">
                            <SelectItem value="RECEIVABLE">Receivable (they owe us)</SelectItem>
                            <SelectItem value="PAYABLE">Payable (we owe them)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label>Amount Type</Label>
                    <Select value={amountType} onValueChange={(v) => setAmountType(v as AmountType)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[80]">
                            <SelectItem value="FIXED">Fixed (EUR per order)</SelectItem>
                            <SelectItem value="PERCENT">Percentage</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>{amountType === 'FIXED' ? 'Amount (EUR)' : 'Percentage (0-100)'}</Label>
                    <Input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={amountType === 'FIXED' ? '2.50' : '10'}
                    />
                </div>
            </div>

            {amountType === 'PERCENT' && (
                <div className="space-y-2">
                    <Label>Applies To</Label>
                    <Select value={appliesTo} onValueChange={setAppliesTo}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[80]">
                            <SelectItem value="SUBTOTAL">Subtotal (order items total)</SelectItem>
                            <SelectItem value="DELIVERY_FEE">Delivery Fee</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label>Business Scope (Optional)</Label>
                    <Select value={businessId} onValueChange={setBusinessId}>
                        <SelectTrigger>
                            <SelectValue placeholder="All businesses" />
                        </SelectTrigger>
                        <SelectContent className="z-[80]">
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
                        <SelectTrigger>
                            <SelectValue placeholder="All promotions" />
                        </SelectTrigger>
                        <SelectContent className="z-[80]">
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
                    placeholder="Reason for this rule, contract note, or operational context"
                />
            </div>

            <div className="flex justify-end">
                <Button type="submit">Save Rule</Button>
            </div>
        </form>
    );
}
