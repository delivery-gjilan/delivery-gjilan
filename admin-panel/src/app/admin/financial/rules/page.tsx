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
import { getRuleGuidance } from './ruleGuidance';

const GLOBAL_RULE_ENTITY_ID = '00000000-0000-0000-0000-000000000000';

const GET_SETTLEMENT_RULES = gql`
    query SettlementRules($filter: SettlementRuleFilterInput) {
        settlementRules(filter: $filter) {
            id
            entityType
            entityId
            ruleType
            config
            priority
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

const GET_DRIVERS = gql`
    query DriversForSettlementRules {
        drivers {
            id
            firstName
            lastName
        }
    }
`;

const GET_ACTIVE_FREE_DELIVERY_PROMOTIONS = gql`
    query ActiveFreeDeliveryPromotions {
        getAllPromotions(isActive: true) {
            id
            name
            code
            type
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

const ACTIVATE_RULE = gql`
    mutation ActivateSettlementRule($id: ID!) {
        activateSettlementRule(id: $id) {
            id
            isActive
        }
    }
`;

const DEACTIVATE_RULE = gql`
    mutation DeactivateSettlementRule($id: ID!) {
        deactivateSettlementRule(id: $id) {
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
type RuleType = 'PERCENTAGE' | 'FIXED_PER_ORDER' | 'DRIVER_VEHICLE_BONUS' | 'PRODUCT_MARKUP';
type AppliesTo = 'ORDER_SUBTOTAL' | 'DELIVERY_FEE' | 'FREE_DELIVERY';
type RuleScenario =
    | 'DRIVER_COMMISSION_DELIVERY_FEE'
    | 'DRIVER_FREE_DELIVERY_COMPENSATION'
    | 'DRIVER_VEHICLE_BONUS'
    | 'BUSINESS_PERCENTAGE'
    | 'BUSINESS_PRODUCT_MARKUP';

type BusinessOption = {
    id: string;
    name: string;
};

type PromotionOption = {
    id: string;
    name: string;
    code?: string | null;
};

type DriverOption = {
    id: string;
    fullName: string;
};

type SettlementRuleConfig = {
    appliesTo?: string;
    percentage?: number;
    amount?: number;
    condition?: string;
    description?: string;
    businessId?: string;
    promotionId?: string;
};

type SettlementRule = {
    id: string;
    entityType: EntityType;
    entityId: string;
    ruleType: RuleType;
    config?: SettlementRuleConfig | null;
    priority: number;
    isActive: boolean;
    notes?: string | null;
    updatedAt: string;
};

type SettlementRulesQueryData = {
    settlementRules: SettlementRule[];
};

type BusinessesQueryData = {
    businesses: BusinessOption[];
};

type PromotionApiRecord = {
    id: string;
    name: string;
    code?: string | null;
    type: string;
};

type PromotionsQueryData = {
    getAllPromotions: PromotionApiRecord[];
};

type DriverApiRecord = {
    id: string;
    firstName: string;
    lastName: string;
};

type DriversQueryData = {
    drivers: DriverApiRecord[];
};

type CreateSettlementRuleValues = {
    entityType: EntityType;
    entityId: string;
    ruleType: RuleType;
    config: Record<string, unknown>;
    priority: number;
    notes: string | null;
    canStackWith: string[];
};

function formatCurrency(amount: number): string {
    return `EUR ${amount.toFixed(2)}`;
}

function buildRuleSummary(
    rule: SettlementRule,
    businessNameById: Map<string, string>,
    promotionNameById: Map<string, string>,
): string {
    const config = (rule.config || {}) as SettlementRuleConfig;

    if (rule.ruleType === 'PERCENTAGE') {
        const pct = Number(config.percentage || 0);
        const appliesTo = String(config.appliesTo || 'ORDER_SUBTOTAL')
            .replaceAll('_', ' ')
            .toLowerCase();
        const promoLabel = config.promotionId
            ? `, promo: ${promotionNameById.get(String(config.promotionId)) || 'Unknown promo'}`
            : '';
        return `${pct}% on ${appliesTo}${promoLabel}`;
    }

    if (rule.ruleType === 'FIXED_PER_ORDER') {
        const amount = Number(config.amount || 0);
        const appliesTo = String(config.appliesTo || 'ORDER_SUBTOTAL')
            .replaceAll('_', ' ')
            .toLowerCase();
        const promoLabel = config.promotionId
            ? `, promo: ${promotionNameById.get(String(config.promotionId)) || 'Unknown promo'}`
            : '';
        return `${formatCurrency(amount)} per order on ${appliesTo}${promoLabel}`;
    }

    if (rule.ruleType === 'DRIVER_VEHICLE_BONUS') {
        const amount = Number(config.amount || 0);
        const condition = String(config.condition || 'HAS_OWN_VEHICLE')
            .replaceAll('_', ' ')
            .toLowerCase();
        return `${formatCurrency(amount)} bonus when ${condition}`;
    }

    if (rule.ruleType === 'PRODUCT_MARKUP') {
        return 'Product markup from business item pricing';
    }

    const businessOverride = config.businessId
        ? `, business: ${businessNameById.get(String(config.businessId)) || 'Unknown business'}`
        : '';

    return `${rule.ruleType}${businessOverride}`;
}

export default function SettlementRulesPage() {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<EntityType>('BUSINESS');
    const [selectedBusinessId, setSelectedBusinessId] = useState('all-businesses');

    const { data, loading, refetch } = useQuery<SettlementRulesQueryData>(GET_SETTLEMENT_RULES, {
        variables: {
            filter: {
                entityType: activeTab,
            },
        },
        fetchPolicy: 'cache-and-network',
    });

    const { data: businessesData } = useQuery<BusinessesQueryData>(GET_BUSINESSES, {
        fetchPolicy: 'cache-and-network',
    });

    const { data: driversData } = useQuery<DriversQueryData>(GET_DRIVERS, {
        fetchPolicy: 'cache-and-network',
    });

    const { data: promotionsData } = useQuery<PromotionsQueryData>(GET_ACTIVE_FREE_DELIVERY_PROMOTIONS, {
        fetchPolicy: 'cache-and-network',
    });

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

    const [activateRule] = useMutation(ACTIVATE_RULE, {
        onCompleted: () => {
            toast({ title: 'Rule activated' });
            refetch();
        },
    });

    const [deactivateRule] = useMutation(DEACTIVATE_RULE, {
        onCompleted: () => {
            toast({ title: 'Rule deactivated' });
            refetch();
        },
    });

    const [deleteRule] = useMutation(DELETE_RULE, {
        onCompleted: () => {
            toast({ title: 'Rule deleted' });
            refetch();
        },
    });

    const rules = useMemo(() => data?.settlementRules ?? [], [data?.settlementRules]);

    const businesses: BusinessOption[] = useMemo(() => businessesData?.businesses ?? [], [businessesData]);

    const promotions: PromotionOption[] = useMemo(
        () =>
            (promotionsData?.getAllPromotions || [])
                .filter((promo) => promo.type === 'FREE_DELIVERY')
                .map((promo) => ({ id: promo.id, name: promo.name, code: promo.code })),
        [promotionsData],
    );

    const drivers: DriverOption[] = useMemo(
        () =>
            (driversData?.drivers || []).map((driver) => ({
                id: driver.id,
                fullName: `${driver.firstName} ${driver.lastName}`.trim(),
            })),
        [driversData],
    );

    const businessNameById = useMemo(() => new Map(businesses.map((b) => [b.id, b.name])), [businesses]);
    const promotionNameById = useMemo(
        () => new Map(promotions.map((p) => [p.id, p.code ? `${p.name} (${p.code})` : p.name])),
        [promotions],
    );

    const visibleRules = useMemo(() => {
        if (activeTab !== 'BUSINESS' || selectedBusinessId === 'all-businesses') {
            return rules;
        }

        return rules.filter((rule) => {
            const config = (rule.config || {}) as SettlementRuleConfig;
            const businessMatch = rule.entityId === selectedBusinessId || rule.entityId === GLOBAL_RULE_ENTITY_ID;
            const overrideMatch = config.businessId === selectedBusinessId;
            return businessMatch || overrideMatch;
        });
    }, [rules, activeTab, selectedBusinessId]);

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Settlement Rules</h1>
                    <p className="text-sm text-muted-foreground">
                        Configure business and driver payout/collection behavior with readable rule fields.
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
                        <DialogContent className="z-[70] max-h-[92vh] max-w-3xl overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Create Settlement Rule</DialogTitle>
                                <DialogDescription>Fill out readable fields. No raw JSON required.</DialogDescription>
                            </DialogHeader>

                            <CreateRuleForm
                                businesses={businesses}
                                drivers={drivers}
                                promotions={promotions}
                                defaultTab={activeTab}
                                defaultBusinessId={selectedBusinessId}
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

                {activeTab === 'BUSINESS' && (
                    <div className="mt-4 w-full max-w-sm">
                        <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Business Scope
                        </Label>
                        <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                            <SelectTrigger className="bg-background">
                                <SelectValue placeholder="All businesses" />
                            </SelectTrigger>
                            <SelectContent className="z-[80]">
                                <SelectItem value="all-businesses">All businesses</SelectItem>
                                {businesses.map((business) => (
                                    <SelectItem key={business.id} value={business.id}>
                                        {business.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <TabsContent value="BUSINESS" className="mt-4">
                    <RulesTable
                        loading={loading}
                        rules={visibleRules}
                        businessNameById={businessNameById}
                        promotionNameById={promotionNameById}
                        onActivate={(id) => activateRule({ variables: { id } })}
                        onDeactivate={(id) => deactivateRule({ variables: { id } })}
                        onDelete={(id) => deleteRule({ variables: { id } })}
                    />
                </TabsContent>

                <TabsContent value="DRIVER" className="mt-4">
                    <RulesTable
                        loading={loading}
                        rules={visibleRules}
                        businessNameById={businessNameById}
                        promotionNameById={promotionNameById}
                        onActivate={(id) => activateRule({ variables: { id } })}
                        onDeactivate={(id) => deactivateRule({ variables: { id } })}
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
    businessNameById,
    promotionNameById,
    onActivate,
    onDeactivate,
    onDelete,
}: {
    loading: boolean;
    rules: SettlementRule[];
    businessNameById: Map<string, string>;
    promotionNameById: Map<string, string>;
    onActivate: (id: string) => void;
    onDeactivate: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    return (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Table>
                <TableHeader className="bg-muted/40">
                    <TableRow>
                        <TableHead className="w-[26%]">Target</TableHead>
                        <TableHead className="w-[18%]">Rule Type</TableHead>
                        <TableHead className="w-[36%]">Configuration</TableHead>
                        <TableHead className="w-[10%] text-center">Priority</TableHead>
                        <TableHead className="w-[10%] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        Array.from({ length: 3 }).map((_, idx) => (
                            <TableRow key={idx}>
                                <TableCell colSpan={5}>
                                    <Skeleton className="h-10 w-full" />
                                </TableCell>
                            </TableRow>
                        ))
                    ) : rules.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                No settlement rules found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        rules.map((rule) => {
                            const config = (rule.config || {}) as SettlementRuleConfig;
                            const targetLabel =
                                rule.entityId === GLOBAL_RULE_ENTITY_ID
                                    ? `Global ${rule.entityType.toLowerCase()} default`
                                    : rule.entityType === 'BUSINESS'
                                      ? businessNameById.get(rule.entityId) || 'Unknown business'
                                      : `Driver ${String(rule.entityId).slice(0, 8)}...`;

                            const overrideLabel = config.businessId
                                ? `Business override: ${businessNameById.get(String(config.businessId)) || 'Unknown business'}`
                                : null;

                            return (
                                <TableRow key={rule.id}>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="font-medium">{targetLabel}</div>
                                            {overrideLabel && (
                                                <div className="text-xs text-muted-foreground">{overrideLabel}</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{rule.ruleType}</TableCell>
                                    <TableCell>
                                        <div className="text-sm text-muted-foreground">
                                            {buildRuleSummary(rule, businessNameById, promotionNameById)}
                                        </div>
                                        {rule.notes && <div className="mt-1 text-xs">{rule.notes}</div>}
                                    </TableCell>
                                    <TableCell className="text-center">{rule.priority}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            {rule.isActive ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => onDeactivate(rule.id)}
                                                >
                                                    Deactivate
                                                </Button>
                                            ) : (
                                                <Button size="sm" onClick={() => onActivate(rule.id)}>
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
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

function CreateRuleForm({
    businesses,
    drivers,
    promotions,
    defaultTab,
    defaultBusinessId,
    onSubmit,
}: {
    businesses: BusinessOption[];
    drivers: DriverOption[];
    promotions: PromotionOption[];
    defaultTab: EntityType;
    defaultBusinessId: string;
    onSubmit: (values: CreateSettlementRuleValues) => void;
}) {
    const initialBusinessEntityId =
        defaultBusinessId !== 'all-businesses' ? defaultBusinessId : (businesses[0]?.id ?? '');
    const [entityType, setEntityType] = useState<EntityType>(defaultTab);
    const [ruleType, setRuleType] = useState<RuleType>(defaultTab === 'BUSINESS' ? 'PERCENTAGE' : 'FIXED_PER_ORDER');
    const [appliesTo, setAppliesTo] = useState<AppliesTo>(defaultTab === 'BUSINESS' ? 'ORDER_SUBTOTAL' : 'FREE_DELIVERY');
    const [scenario, setScenario] = useState<RuleScenario>(
        defaultTab === 'BUSINESS' ? 'BUSINESS_PERCENTAGE' : 'DRIVER_FREE_DELIVERY_COMPENSATION',
    );
    const [entityId, setEntityId] = useState(defaultTab === 'BUSINESS' ? initialBusinessEntityId : '');
    const [priority, setPriority] = useState('100');
    const [percentage, setPercentage] = useState('80');
    const [amount, setAmount] = useState('3');
    const [vehicleCondition, setVehicleCondition] = useState('HAS_OWN_VEHICLE');
    const [businessOverrideId, setBusinessOverrideId] = useState('none');
    const [promotionScopeId, setPromotionScopeId] = useState('none');
    const [notes, setNotes] = useState('');

    const entityLockedToBusiness = defaultTab === 'BUSINESS';
    const availableScenarios: RuleScenario[] = entityLockedToBusiness
        ? ['BUSINESS_PERCENTAGE', 'BUSINESS_PRODUCT_MARKUP']
        : [
              'DRIVER_COMMISSION_DELIVERY_FEE',
              'DRIVER_FREE_DELIVERY_COMPENSATION',
              'DRIVER_VEHICLE_BONUS',
              'BUSINESS_PERCENTAGE',
              'BUSINESS_PRODUCT_MARKUP',
          ];

    const showPromotionScope =
        entityType === 'DRIVER' && appliesTo === 'FREE_DELIVERY' && ruleType === 'FIXED_PER_ORDER';
    const isDriverPercentage = entityType === 'DRIVER' && ruleType === 'PERCENTAGE';
    const isDriverFixedPerOrder = entityType === 'DRIVER' && ruleType === 'FIXED_PER_ORDER';
    const isDriverFixedFreeDelivery = isDriverFixedPerOrder && appliesTo === 'FREE_DELIVERY';
    const isBusinessProductMarkup = entityType === 'BUSINESS' && ruleType === 'PRODUCT_MARKUP';
    const showAppliesToSelector =
        (ruleType === 'PERCENTAGE' && !isDriverPercentage) ||
        (ruleType === 'FIXED_PER_ORDER' && !isDriverFixedFreeDelivery);
    const guidance = getRuleGuidance({
        entityType,
        ruleType,
        appliesTo,
        hasBusinessOverride: businessOverrideId !== 'none',
        hasPromotionScope: showPromotionScope && promotionScopeId !== 'none',
    });

    const applyScenario = (nextScenario: RuleScenario) => {
        setScenario(nextScenario);

        if (nextScenario === 'DRIVER_COMMISSION_DELIVERY_FEE') {
            setEntityType('DRIVER');
            setRuleType('PERCENTAGE');
            setAppliesTo('DELIVERY_FEE');
            setPercentage('20');
            if (!entityId && drivers[0]?.id) {
                setEntityId(drivers[0].id);
            }
            return;
        }

        if (nextScenario === 'DRIVER_FREE_DELIVERY_COMPENSATION') {
            setEntityType('DRIVER');
            setRuleType('FIXED_PER_ORDER');
            setAppliesTo('FREE_DELIVERY');
            setAmount('3');
            if (!entityId && drivers[0]?.id) {
                setEntityId(drivers[0].id);
            }
            return;
        }

        if (nextScenario === 'DRIVER_VEHICLE_BONUS') {
            setEntityType('DRIVER');
            setRuleType('DRIVER_VEHICLE_BONUS');
            setAmount('1');
            setVehicleCondition('HAS_OWN_VEHICLE');
            if (!entityId && drivers[0]?.id) {
                setEntityId(drivers[0].id);
            }
            return;
        }

        if (nextScenario === 'BUSINESS_PRODUCT_MARKUP') {
            setEntityType('BUSINESS');
            setRuleType('PRODUCT_MARKUP');
            setAppliesTo('ORDER_SUBTOTAL');
            if (!entityId) {
                setEntityId(initialBusinessEntityId);
            }
            return;
        }

        setEntityType('BUSINESS');
        setRuleType('PERCENTAGE');
        setAppliesTo('ORDER_SUBTOTAL');
        setPercentage('15');
        if (!entityId) {
            setEntityId(initialBusinessEntityId);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!entityId.trim()) {
            alert('Please select entity target.');
            return;
        }

        const config: Record<string, unknown> = {};

        if (ruleType === 'PERCENTAGE') {
            config.percentage = Number(percentage || 0);
            config.appliesTo = isDriverPercentage ? 'DELIVERY_FEE' : appliesTo;
            config.description = `Percentage rule on ${isDriverPercentage ? 'DELIVERY_FEE' : appliesTo}`;
        }

        if (ruleType === 'FIXED_PER_ORDER') {
            config.amount = Number(amount || 0);
            config.appliesTo = appliesTo;
            config.description = `Fixed amount rule on ${appliesTo}`;
        }

        if (ruleType === 'DRIVER_VEHICLE_BONUS') {
            config.amount = Number(amount || 0);
            config.condition = vehicleCondition;
            config.description = 'Vehicle bonus';
        }

        if (ruleType === 'PRODUCT_MARKUP') {
            config.appliesTo = 'PRODUCT_MARKUP';
            config.source = 'PRODUCT_PRICING_MARKUP';
            config.description = 'Use product pricing markup in settlement receivable';
        }

        if (businessOverrideId !== 'none') {
            config.businessId = businessOverrideId;
        }

        if (showPromotionScope && promotionScopeId !== 'none') {
            config.promotionId = promotionScopeId;
        }

        onSubmit({
            entityType,
            entityId: entityId.trim(),
            ruleType,
            config,
            priority: Number(priority || 100),
            notes: notes || null,
            canStackWith: [],
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className={`grid gap-4 ${entityLockedToBusiness ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
                {!entityLockedToBusiness && (
                    <div className="space-y-2">
                        <Label>Entity Category</Label>
                        <Select
                            value={entityType}
                            onValueChange={(v) => {
                                const nextType = v as EntityType;
                                setEntityType(nextType);

                                if (nextType === 'BUSINESS') {
                                    setEntityId(initialBusinessEntityId);
                                    setAppliesTo('ORDER_SUBTOTAL');
                                    setRuleType('PERCENTAGE');
                                    return;
                                }

                                setEntityId(drivers[0]?.id || '');
                                setAppliesTo('FREE_DELIVERY');
                                setRuleType('FIXED_PER_ORDER');
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[80]">
                                <SelectItem value="BUSINESS">Business</SelectItem>
                                <SelectItem value="DRIVER">Driver</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="space-y-2">
                    <Label>Quick Start Scenario</Label>
                    <Select value={scenario} onValueChange={(v) => applyScenario(v as RuleScenario)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[80]">
                            {availableScenarios.includes('DRIVER_COMMISSION_DELIVERY_FEE') && (
                                <SelectItem value="DRIVER_COMMISSION_DELIVERY_FEE">
                                    Driver commission from delivery fee
                                </SelectItem>
                            )}
                            {availableScenarios.includes('DRIVER_FREE_DELIVERY_COMPENSATION') && (
                                <SelectItem value="DRIVER_FREE_DELIVERY_COMPENSATION">
                                    Driver compensation for free delivery
                                </SelectItem>
                            )}
                            {availableScenarios.includes('DRIVER_VEHICLE_BONUS') && (
                                <SelectItem value="DRIVER_VEHICLE_BONUS">Driver vehicle bonus per order</SelectItem>
                            )}
                            {availableScenarios.includes('BUSINESS_PERCENTAGE') && (
                                <SelectItem value="BUSINESS_PERCENTAGE">Business percentage commission</SelectItem>
                            )}
                            {availableScenarios.includes('BUSINESS_PRODUCT_MARKUP') && (
                                <SelectItem value="BUSINESS_PRODUCT_MARKUP">Business product markup</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Rule Type</Label>
                    <Select
                        value={ruleType}
                        onValueChange={(v) => {
                            const nextRuleType = v as RuleType;
                            setRuleType(nextRuleType);

                            if (entityType === 'DRIVER' && nextRuleType === 'PERCENTAGE') {
                                setAppliesTo('DELIVERY_FEE');
                            }

                            if (entityType === 'DRIVER' && nextRuleType === 'FIXED_PER_ORDER') {
                                setAppliesTo('FREE_DELIVERY');
                            }

                            if (entityType === 'BUSINESS' && nextRuleType === 'PRODUCT_MARKUP') {
                                setAppliesTo('ORDER_SUBTOTAL');
                            }
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[80]">
                            <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                            {entityType === 'DRIVER' && <SelectItem value="FIXED_PER_ORDER">Fixed Per Order</SelectItem>}
                            {entityType === 'BUSINESS' && <SelectItem value="PRODUCT_MARKUP">Product Markup</SelectItem>}
                            {entityType === 'DRIVER' && (
                                <SelectItem value="DRIVER_VEHICLE_BONUS">Driver Vehicle Bonus</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label>{entityType === 'BUSINESS' ? 'Business Target' : 'Driver Target'}</Label>
                    {entityType === 'BUSINESS' ? (
                        <Select value={entityId} onValueChange={setEntityId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select business" />
                            </SelectTrigger>
                            <SelectContent className="z-[80]">
                                {businesses.map((business) => (
                                    <SelectItem key={business.id} value={business.id}>
                                        {business.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Select value={entityId} onValueChange={setEntityId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select driver" />
                            </SelectTrigger>
                            <SelectContent className="z-[80]">
                                {drivers.map((driver) => (
                                    <SelectItem key={driver.id} value={driver.id}>
                                        {driver.fullName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>Priority</Label>
                    <Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                        Lower number means this rule is evaluated first when multiple rules match.
                    </p>
                </div>
            </div>

            {(ruleType === 'PERCENTAGE' || ruleType === 'FIXED_PER_ORDER') && (
                <div className="grid gap-4 md:grid-cols-2">
                    {isDriverPercentage ? (
                        <div className="space-y-2">
                            <Label>Applies To</Label>
                            <Input value="Delivery Fee (fixed for driver percentage)" readOnly />
                        </div>
                    ) : !showAppliesToSelector ? (
                        <div className="space-y-2">
                            <Label>Applies To</Label>
                            <Input value="Free Delivery Promo (fixed for this scenario)" readOnly />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>Applies To</Label>
                            <Select value={appliesTo} onValueChange={(v) => setAppliesTo(v as AppliesTo)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[80]">
                                    <SelectItem value="ORDER_SUBTOTAL">Order Subtotal</SelectItem>
                                    <SelectItem value="DELIVERY_FEE">Delivery Fee</SelectItem>
                                    {entityType === 'DRIVER' && (
                                        <SelectItem value="FREE_DELIVERY">Free Delivery Promo</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {ruleType === 'PERCENTAGE' ? (
                        <div className="space-y-2">
                            <Label>Percentage</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={percentage}
                                onChange={(e) => setPercentage(e.target.value)}
                            />
                            {isDriverPercentage && (
                                <p className="text-xs text-muted-foreground">
                                    This is the platform commission taken from the driver&apos;s delivery fee; the
                                    driver keeps the remaining percentage.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>
                                {isDriverFixedFreeDelivery
                                    ? 'Driver Compensation Per Free-Delivery Order (EUR)'
                                    : isDriverFixedPerOrder
                                      ? 'Driver Payout Per Order (EUR)'
                                      : 'Fixed Amount (EUR)'}
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                            {isDriverFixedPerOrder && (
                                <p className="text-xs text-muted-foreground">
                                    This amount is paid by the platform to the driver for each matching order.
                                    {isDriverFixedFreeDelivery
                                        ? ' For free-delivery promos, this is what the platform owes the driver when delivery is free to the customer.'
                                        : ''}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {isBusinessProductMarkup && (
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    Product markup comes from each product&apos;s pricing setup. This rule enables markup-based
                    settlement collection from businesses.
                </div>
            )}

            {ruleType === 'DRIVER_VEHICLE_BONUS' && (
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Condition</Label>
                        <Select value={vehicleCondition} onValueChange={setVehicleCondition}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[80]">
                                <SelectItem value="HAS_OWN_VEHICLE">Has Own Vehicle</SelectItem>
                                <SelectItem value="HAS_MOTORCYCLE">Has Motorcycle</SelectItem>
                                <SelectItem value="HAS_BICYCLE">Has Bicycle</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Bonus Amount (EUR)</Label>
                        <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label>Business Override (Optional)</Label>
                    <Select value={businessOverrideId} onValueChange={setBusinessOverrideId}>
                        <SelectTrigger>
                            <SelectValue placeholder="No business override" />
                        </SelectTrigger>
                        <SelectContent className="z-[80]">
                            <SelectItem value="none">No override</SelectItem>
                            {businesses.map((business) => (
                                <SelectItem key={business.id} value={business.id}>
                                    {business.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        Override applies this rule only to the selected business within the selected entity scope.
                    </p>
                </div>

                {showPromotionScope && (
                    <div className="space-y-2">
                        <Label>Promotion Scope (Optional)</Label>
                        <Select value={promotionScopeId} onValueChange={setPromotionScopeId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Any free-delivery promotion" />
                            </SelectTrigger>
                            <SelectContent className="z-[80]">
                                <SelectItem value="none">Any free-delivery promotion</SelectItem>
                                {promotions.map((promo) => (
                                    <SelectItem key={promo.id} value={promo.id}>
                                        {promo.code ? `${promo.name} (${promo.code})` : promo.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-semibold">{guidance.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{guidance.summary}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                    {guidance.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                    ))}
                </ul>
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
