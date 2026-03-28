'use client';

import { useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Button } from '@/components/ui/Button';

const GET_SCENARIOS = gql`
    query SettlementScenarioDefinitions {
        settlementScenarioDefinitions {
            id
            name
            description
        }
    }
`;

const RUN_HARNESS = gql`
    mutation RunSettlementScenarioHarness($scenarioIds: [String!]) {
        runSettlementScenarioHarness(scenarioIds: $scenarioIds) {
            passed
            total
            passedCount
            failedCount
            results {
                scenarioId
                name
                passed
                expectedCount
                actualCount
                mismatches
                expectedSettlements
                actualSettlements
            }
        }
    }
`;

type Scenario = {
    id: string;
    name: string;
    description: string;
};

type HarnessResult = {
    passed: boolean;
    total: number;
    passedCount: number;
    failedCount: number;
    results: Array<{
        scenarioId: string;
        name: string;
        passed: boolean;
        expectedCount: number;
        actualCount: number;
        mismatches: string[];
        expectedSettlements: unknown;
        actualSettlements: unknown;
    }>;
};

type SettlementEntry = {
    type: 'DRIVER' | 'BUSINESS';
    direction: 'RECEIVABLE' | 'PAYABLE';
    amount: number;
    driverId: string | null;
    businessId: string | null;
    ruleId: string | null;
};

type ScenarioOrderMeta = {
    subtotal: number;
    deliveryFee: number;
    paymentCollection: 'CASH_TO_DRIVER' | 'PREPAID_TO_PLATFORM';
};

type BuilderPayerModel = 'PLATFORM' | 'BUSINESS_FULL' | 'BUSINESS_SPLIT';

type BuilderConfig = {
    paymentCollection: 'CASH_TO_DRIVER' | 'PREPAID_TO_PLATFORM';
    subtotal: number;
    deliveryFee: number;
    markupReceivable: number;
    businessCommissionPercent: number;
    driverDeliveryPayoutPercent: number;
    driverDeliveryReceivablePercent: number;
    freeDeliveryPayer: BuilderPayerModel;
    driverFreeDeliveryCompensation: number;
    businessReimbursementAmount: number;
};

type BuilderRuleHint = {
    name: string;
    entityType: 'DRIVER' | 'BUSINESS';
    direction: 'RECEIVABLE' | 'PAYABLE';
    amountType: 'FIXED' | 'PERCENT';
    amount: number;
    appliesTo: 'SUBTOTAL' | 'DELIVERY_FEE' | null;
    scope: string;
};

const DEFAULT_BUILDER_CONFIG: BuilderConfig = {
    paymentCollection: 'CASH_TO_DRIVER',
    subtotal: 30,
    deliveryFee: 5,
    markupReceivable: 10,
    businessCommissionPercent: 10,
    driverDeliveryPayoutPercent: 80,
    driverDeliveryReceivablePercent: 20,
    freeDeliveryPayer: 'BUSINESS_FULL',
    driverFreeDeliveryCompensation: 1,
    businessReimbursementAmount: 1,
};

const scenarioOrderMeta: Record<string, ScenarioOrderMeta> = {
    'cash-markup-basic': { subtotal: 30, deliveryFee: 5, paymentCollection: 'CASH_TO_DRIVER' },
    'prepaid-markup-no-remittance': { subtotal: 30, deliveryFee: 5, paymentCollection: 'PREPAID_TO_PLATFORM' },
    'cash-free-delivery-promo': { subtotal: 30, deliveryFee: 0, paymentCollection: 'CASH_TO_DRIVER' },
    'cash-price-promo-scoped-rule': { subtotal: 30, deliveryFee: 5, paymentCollection: 'CASH_TO_DRIVER' },
    'no-driver-assigned': { subtotal: 30, deliveryFee: 5, paymentCollection: 'CASH_TO_DRIVER' },
    'multi-business-global-rule': { subtotal: 35, deliveryFee: 5, paymentCollection: 'CASH_TO_DRIVER' },
    'business-promo-free-delivery-mixed-flows': { subtotal: 30, deliveryFee: 5, paymentCollection: 'CASH_TO_DRIVER' },
    'business-promo-free-delivery-business-covers-driver': { subtotal: 30, deliveryFee: 5, paymentCollection: 'CASH_TO_DRIVER' },
    'business-promo-free-delivery-split-funding': { subtotal: 30, deliveryFee: 5, paymentCollection: 'CASH_TO_DRIVER' },
    'business-promo-free-delivery-prepaid-via-platform': { subtotal: 30, deliveryFee: 5, paymentCollection: 'PREPAID_TO_PLATFORM' },
};

const moneyFormatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
});

const knownRuleReasons: Record<string, string> = {
    '00000000-0000-0000-0000-000000000601': 'Global business commission: business owes platform 10% of subtotal.',
    '00000000-0000-0000-0000-000000000602': 'Global driver payout: platform owes driver 80% of delivery fee.',
    '00000000-0000-0000-0000-000000000603': 'Free-delivery promo compensation: platform owes driver a fixed EUR 2.00.',
    '00000000-0000-0000-0000-000000000604': 'Price-promo rule: business owes platform a fixed EUR 1.50 when that promo is used.',
    '00000000-0000-0000-0000-000000000605': 'Business free-delivery promo compensation: platform owes driver a fixed EUR 1.00.',
    '00000000-0000-0000-0000-000000000606': 'Delivery-fee commission receivable: driver owes platform 20% of delivery fee.',
    '00000000-0000-0000-0000-000000000607': 'Business full-sponsor promo compensation: platform owes driver a fixed EUR 1.00.',
    '00000000-0000-0000-0000-000000000608': 'Business full-sponsor reimbursement: business reimburses platform EUR 1.00 for driver compensation.',
    '00000000-0000-0000-0000-000000000609': 'Business split-sponsor promo compensation: platform owes driver a fixed EUR 2.00.',
    '00000000-0000-0000-0000-000000000610': 'Business split-sponsor reimbursement: business reimburses platform EUR 1.00 (partial cover).',
    '00000000-0000-0000-0000-000000000611': 'Business prepaid-sponsor promo compensation: platform owes driver a fixed EUR 1.00.',
    '00000000-0000-0000-0000-000000000612': 'Business prepaid-sponsor reimbursement: business reimburses platform EUR 1.00.',
    'builder:business-commission': 'Configured business commission: business owes platform a subtotal percentage.',
    'builder:driver-delivery-payout': 'Configured delivery payout: platform owes driver a delivery-fee percentage.',
    'builder:driver-delivery-receivable': 'Configured delivery receivable: driver owes platform a delivery-fee percentage.',
    'builder:free-delivery-driver-comp': 'Configured free-delivery compensation: platform pays driver a fixed amount.',
    'builder:free-delivery-business-reimburse': 'Configured free-delivery reimbursement: business reimburses platform for sponsored compensation.',
};

function roundMoney(value: number) {
    return Math.round(value * 100) / 100;
}

function buildScenarioBlueprint(config: BuilderConfig): {
    rows: SettlementEntry[];
    ruleHints: BuilderRuleHint[];
    suggestedScenarioId: string | null;
    notes: string[];
} {
    const rows: SettlementEntry[] = [];
    const ruleHints: BuilderRuleHint[] = [];
    const notes: string[] = [];

    if (config.businessCommissionPercent > 0 && config.subtotal > 0) {
        rows.push({
            type: 'BUSINESS',
            direction: 'RECEIVABLE',
            amount: roundMoney((config.subtotal * config.businessCommissionPercent) / 100),
            driverId: null,
            businessId: 'builder-business',
            ruleId: 'builder:business-commission',
        });
        ruleHints.push({
            name: 'Business commission on subtotal',
            entityType: 'BUSINESS',
            direction: 'RECEIVABLE',
            amountType: 'PERCENT',
            amount: config.businessCommissionPercent,
            appliesTo: 'SUBTOTAL',
            scope: 'Global or business-specific',
        });
    }

    if (config.driverDeliveryPayoutPercent > 0 && config.deliveryFee > 0) {
        rows.push({
            type: 'DRIVER',
            direction: 'PAYABLE',
            amount: roundMoney((config.deliveryFee * config.driverDeliveryPayoutPercent) / 100),
            driverId: 'builder-driver',
            businessId: null,
            ruleId: 'builder:driver-delivery-payout',
        });
        ruleHints.push({
            name: 'Driver payout from delivery fee',
            entityType: 'DRIVER',
            direction: 'PAYABLE',
            amountType: 'PERCENT',
            amount: config.driverDeliveryPayoutPercent,
            appliesTo: 'DELIVERY_FEE',
            scope: 'Global or business-specific',
        });
    }

    if (config.driverDeliveryReceivablePercent > 0 && config.deliveryFee > 0) {
        rows.push({
            type: 'DRIVER',
            direction: 'RECEIVABLE',
            amount: roundMoney((config.deliveryFee * config.driverDeliveryReceivablePercent) / 100),
            driverId: 'builder-driver',
            businessId: null,
            ruleId: 'builder:driver-delivery-receivable',
        });
        ruleHints.push({
            name: 'Driver delivery-fee commission to platform',
            entityType: 'DRIVER',
            direction: 'RECEIVABLE',
            amountType: 'PERCENT',
            amount: config.driverDeliveryReceivablePercent,
            appliesTo: 'DELIVERY_FEE',
            scope: 'Global or business-specific',
        });
    }

    if (config.driverFreeDeliveryCompensation > 0) {
        rows.push({
            type: 'DRIVER',
            direction: 'PAYABLE',
            amount: roundMoney(config.driverFreeDeliveryCompensation),
            driverId: 'builder-driver',
            businessId: null,
            ruleId: 'builder:free-delivery-driver-comp',
        });
        ruleHints.push({
            name: 'Free-delivery driver compensation',
            entityType: 'DRIVER',
            direction: 'PAYABLE',
            amountType: 'FIXED',
            amount: roundMoney(config.driverFreeDeliveryCompensation),
            appliesTo: null,
            scope: 'Promo-scoped (FREE_DELIVERY promo)',
        });
    }

    if (config.freeDeliveryPayer !== 'PLATFORM' && config.businessReimbursementAmount > 0) {
        rows.push({
            type: 'BUSINESS',
            direction: 'RECEIVABLE',
            amount: roundMoney(config.businessReimbursementAmount),
            driverId: null,
            businessId: 'builder-business',
            ruleId: 'builder:free-delivery-business-reimburse',
        });
        ruleHints.push({
            name: 'Business reimbursement for sponsored free delivery',
            entityType: 'BUSINESS',
            direction: 'RECEIVABLE',
            amountType: 'FIXED',
            amount: roundMoney(config.businessReimbursementAmount),
            appliesTo: null,
            scope: 'Promo-scoped + business-scoped',
        });
    }

    if (config.paymentCollection === 'CASH_TO_DRIVER' && config.markupReceivable > 0) {
        rows.push({
            type: 'DRIVER',
            direction: 'RECEIVABLE',
            amount: roundMoney(config.markupReceivable),
            driverId: 'builder-driver',
            businessId: null,
            ruleId: null,
        });
        notes.push('Markup receivable appears automatically when payment collection is CASH_TO_DRIVER and markup exists.');
    }

    if (config.paymentCollection === 'PREPAID_TO_PLATFORM' && config.markupReceivable > 0) {
        notes.push('Automatic markup receivable is not created for PREPAID_TO_PLATFORM orders.');
    }

    let suggestedScenarioId: string | null = null;
    if (config.paymentCollection === 'PREPAID_TO_PLATFORM' && config.freeDeliveryPayer !== 'PLATFORM') {
        suggestedScenarioId = 'business-promo-free-delivery-prepaid-via-platform';
    } else if (config.freeDeliveryPayer === 'BUSINESS_SPLIT') {
        suggestedScenarioId = 'business-promo-free-delivery-split-funding';
    } else if (config.freeDeliveryPayer === 'BUSINESS_FULL' && config.driverDeliveryReceivablePercent > 0) {
        suggestedScenarioId = 'business-promo-free-delivery-mixed-flows';
    } else if (config.freeDeliveryPayer === 'BUSINESS_FULL') {
        suggestedScenarioId = 'business-promo-free-delivery-business-covers-driver';
    }

    return {
        rows,
        ruleHints,
        suggestedScenarioId,
        notes,
    };
}

function formatMoney(amount: number) {
    return moneyFormatter.format(amount);
}

function toShortId(value?: string | null): string {
    if (!value) return '-';
    return `${value.slice(0, 8)}...`;
}

function parseSettlements(value: unknown): SettlementEntry[] {
    if (!Array.isArray(value)) return [];

    return value
        .map((raw) => {
            if (!raw || typeof raw !== 'object') return null;
            const row = raw as Record<string, unknown>;
            const type = row.type;
            const direction = row.direction;
            const amount = Number(row.amount ?? 0);

            if ((type !== 'DRIVER' && type !== 'BUSINESS') || (direction !== 'RECEIVABLE' && direction !== 'PAYABLE')) {
                return null;
            }

            return {
                type,
                direction,
                amount: Number.isFinite(amount) ? amount : 0,
                driverId: typeof row.driverId === 'string' ? row.driverId : null,
                businessId: typeof row.businessId === 'string' ? row.businessId : null,
                ruleId: typeof row.ruleId === 'string' ? row.ruleId : null,
            } satisfies SettlementEntry;
        })
        .filter((v): v is SettlementEntry => v !== null);
}

function groupTotal(rows: SettlementEntry[]) {
    return rows.reduce((sum, row) => sum + row.amount, 0);
}

function netEntityPosition(rows: SettlementEntry[], type: SettlementEntry['type']) {
    const receivable = rows
        .filter((row) => row.type === type && row.direction === 'RECEIVABLE')
        .reduce((sum, row) => sum + row.amount, 0);
    const payable = rows
        .filter((row) => row.type === type && row.direction === 'PAYABLE')
        .reduce((sum, row) => sum + row.amount, 0);

    return payable - receivable;
}

function settlementReason(row: SettlementEntry): string {
    if (row.ruleId === null && row.type === 'DRIVER' && row.direction === 'RECEIVABLE') {
        return 'Automatic markup remittance: driver collected marked-up cash and owes markup difference to platform.';
    }

    if (row.ruleId && knownRuleReasons[row.ruleId]) {
        return knownRuleReasons[row.ruleId];
    }

    if (row.type === 'DRIVER' && row.direction === 'PAYABLE') {
        return 'Rule-based payout: platform owes driver according to active settlement rules.';
    }

    if (row.type === 'DRIVER' && row.direction === 'RECEIVABLE') {
        return 'Rule-based receivable: driver owes platform according to active settlement rules.';
    }

    if (row.type === 'BUSINESS' && row.direction === 'PAYABLE') {
        return 'Rule-based payout: platform owes business according to active settlement rules.';
    }

    return 'Rule-based receivable: business owes platform according to active settlement rules.';
}

function FlowColumn({ title, subtitle, rows, accentClass }: { title: string; subtitle: string; rows: SettlementEntry[]; accentClass: string }) {
    const total = groupTotal(rows);

    return (
        <div className="rounded-2xl bg-slate-900/80 p-3 shadow-md shadow-black/30">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold text-slate-100">{title}</div>
                    <div className="text-xs text-slate-400">{subtitle}</div>
                </div>
                <div className={`rounded-md px-2 py-1 text-xs font-semibold ${accentClass}`}>
                    {formatMoney(total)}
                </div>
            </div>

            <div className="mt-3 space-y-2">
                {rows.length === 0 ? (
                    <div className="rounded-xl bg-slate-800/80 px-2 py-1.5 text-xs text-slate-400">No settlements</div>
                ) : (
                    rows.map((row, idx) => (
                        <div
                            key={`${row.type}-${row.direction}-${row.ruleId}-${idx}`}
                            className="rounded-xl bg-slate-800/90 px-2 py-2 shadow-sm shadow-black/30"
                        >
                            <div className="flex items-center justify-between gap-3 text-xs text-slate-100">
                                <div className="font-semibold">{formatMoney(row.amount)}</div>
                                <div className="text-slate-400">Rule: {toShortId(row.ruleId)}</div>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-400">
                                Driver: {toShortId(row.driverId)} | Business: {toShortId(row.businessId)}
                            </div>
                            <div className="mt-1.5 rounded-lg bg-slate-700/60 px-2 py-1 text-[11px] text-slate-300">
                                Reason: {settlementReason(row)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default function SettlementTestingPage() {
    const [latestResult, setLatestResult] = useState<HarnessResult | null>(null);
    const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
    const [selectedResultScenarioId, setSelectedResultScenarioId] = useState<string | null>(null);
    const [builderConfig, setBuilderConfig] = useState<BuilderConfig>(DEFAULT_BUILDER_CONFIG);

    const { data, loading: loadingScenarios, refetch } = useQuery(GET_SCENARIOS, {
        fetchPolicy: 'cache-and-network',
    });

    const [runHarness, { loading: runningHarness }] = useMutation(RUN_HARNESS, {
        onCompleted: (result) => {
            const harnessResult: HarnessResult | null = result?.runSettlementScenarioHarness || null;
            setLatestResult(harnessResult);

            if (harnessResult?.results?.length) {
                const preferredId = runningScenarioId && runningScenarioId !== 'all'
                    ? runningScenarioId
                    : harnessResult.results[0]?.scenarioId;
                setSelectedResultScenarioId(preferredId ?? null);
            } else {
                setSelectedResultScenarioId(null);
            }

            setRunningScenarioId(null);
        },
        onError: () => {
            setRunningScenarioId(null);
        },
    });

    const scenarios: Scenario[] = useMemo(
        () => data?.settlementScenarioDefinitions ?? [],
        [data?.settlementScenarioDefinitions],
    );

    const builderPreview = useMemo(() => buildScenarioBlueprint(builderConfig), [builderConfig]);

    const runAll = () => {
        setRunningScenarioId('all');
        setSelectedResultScenarioId(null);
        runHarness({ variables: { scenarioIds: null } });
    };

    const runOne = (scenarioId: string) => {
        setRunningScenarioId(scenarioId);
        setSelectedResultScenarioId(scenarioId);
        runHarness({ variables: { scenarioIds: [scenarioId] } });
    };

    const runSuggestedScenario = () => {
        if (!builderPreview.suggestedScenarioId) return;
        const exists = scenarios.some((s) => s.id === builderPreview.suggestedScenarioId);
        if (!exists) return;
        runOne(builderPreview.suggestedScenarioId);
    };

    return (
        <div className="space-y-6 pb-10 text-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Settlement Scenario Testing</h1>
                    <p className="text-sm text-slate-300">
                        Run deterministic settlement+promotion scenarios and compare expected vs actual results.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        Refresh Scenarios
                    </Button>
                    <Button onClick={runAll} disabled={runningHarness}>
                        {runningScenarioId === 'all' ? 'Running All...' : 'Run All Scenarios'}
                    </Button>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 shadow-lg shadow-black/30">
                <table className="w-full text-sm">
                    <thead className="bg-slate-800/90 text-left text-slate-200">
                        <tr>
                            <th className="px-4 py-3 font-medium">Scenario</th>
                            <th className="px-4 py-3 font-medium">Description</th>
                            <th className="px-4 py-3 font-medium text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingScenarios ? (
                            <tr>
                                <td className="px-4 py-4 text-slate-400" colSpan={3}>
                                    Loading scenarios...
                                </td>
                            </tr>
                        ) : scenarios.length === 0 ? (
                            <tr>
                                <td className="px-4 py-4 text-slate-400" colSpan={3}>
                                    No scenarios available.
                                </td>
                            </tr>
                        ) : (
                            scenarios.map((scenario) => (
                                <tr key={scenario.id} className="odd:bg-slate-900/60 even:bg-slate-800/60">
                                    <td className="px-4 py-3 font-medium">{scenario.name}</td>
                                    <td className="px-4 py-3 text-slate-300">{scenario.description}</td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            size="sm"
                                            onClick={() => runOne(scenario.id)}
                                            disabled={runningHarness}
                                        >
                                            {runningScenarioId === scenario.id ? 'Running...' : 'Run'}
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="space-y-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 p-4 shadow-lg shadow-black/35">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-indigo-300">Scenario Builder</div>
                        <h2 className="text-lg font-semibold text-slate-100">Compose Flows + Rule Setup Guide</h2>
                        <p className="text-xs text-slate-400">Set your target behavior, preview expected settlements, then run the closest harness scenario.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setBuilderConfig(DEFAULT_BUILDER_CONFIG)}
                        >
                            Reset Builder
                        </Button>
                        <Button
                            size="sm"
                            onClick={runSuggestedScenario}
                            disabled={!builderPreview.suggestedScenarioId || runningHarness || !scenarios.some((s) => s.id === builderPreview.suggestedScenarioId)}
                        >
                            {builderPreview.suggestedScenarioId ? 'Run Closest Scenario' : 'No Direct Scenario Match'}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                    <label className="rounded-xl bg-slate-900/80 p-3 text-xs text-slate-300">
                        Payment Collection
                        <select
                            value={builderConfig.paymentCollection}
                            onChange={(e) => setBuilderConfig((prev) => ({
                                ...prev,
                                paymentCollection: e.target.value as BuilderConfig['paymentCollection'],
                            }))}
                            className="mt-1 w-full rounded-md bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                        >
                            <option value="CASH_TO_DRIVER">Cash to Driver</option>
                            <option value="PREPAID_TO_PLATFORM">Prepaid to Platform</option>
                        </select>
                    </label>

                    <label className="rounded-xl bg-slate-900/80 p-3 text-xs text-slate-300">
                        Subtotal (EUR)
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={builderConfig.subtotal}
                            onChange={(e) => setBuilderConfig((prev) => ({ ...prev, subtotal: Number(e.target.value) || 0 }))}
                            className="mt-1 w-full rounded-md bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                        />
                    </label>

                    <label className="rounded-xl bg-slate-900/80 p-3 text-xs text-slate-300">
                        Delivery Fee (EUR)
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={builderConfig.deliveryFee}
                            onChange={(e) => setBuilderConfig((prev) => ({ ...prev, deliveryFee: Number(e.target.value) || 0 }))}
                            className="mt-1 w-full rounded-md bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                        />
                    </label>

                    <label className="rounded-xl bg-slate-900/80 p-3 text-xs text-slate-300">
                        Markup Receivable (EUR)
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={builderConfig.markupReceivable}
                            onChange={(e) => setBuilderConfig((prev) => ({ ...prev, markupReceivable: Number(e.target.value) || 0 }))}
                            className="mt-1 w-full rounded-md bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                        />
                    </label>

                    <label className="rounded-xl bg-slate-900/80 p-3 text-xs text-slate-300">
                        Business Commission % (Subtotal)
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={builderConfig.businessCommissionPercent}
                            onChange={(e) => setBuilderConfig((prev) => ({ ...prev, businessCommissionPercent: Number(e.target.value) || 0 }))}
                            className="mt-1 w-full rounded-md bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                        />
                    </label>

                    <label className="rounded-xl bg-slate-900/80 p-3 text-xs text-slate-300">
                        Driver Delivery Payout %
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={builderConfig.driverDeliveryPayoutPercent}
                            onChange={(e) => setBuilderConfig((prev) => ({ ...prev, driverDeliveryPayoutPercent: Number(e.target.value) || 0 }))}
                            className="mt-1 w-full rounded-md bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                        />
                    </label>

                    <label className="rounded-xl bg-slate-900/80 p-3 text-xs text-slate-300">
                        Driver Delivery Receivable %
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={builderConfig.driverDeliveryReceivablePercent}
                            onChange={(e) => setBuilderConfig((prev) => ({ ...prev, driverDeliveryReceivablePercent: Number(e.target.value) || 0 }))}
                            className="mt-1 w-full rounded-md bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                        />
                    </label>

                    <label className="rounded-xl bg-slate-900/80 p-3 text-xs text-slate-300">
                        Free Delivery Payer Model
                        <select
                            value={builderConfig.freeDeliveryPayer}
                            onChange={(e) => setBuilderConfig((prev) => ({
                                ...prev,
                                freeDeliveryPayer: e.target.value as BuilderPayerModel,
                            }))}
                            className="mt-1 w-full rounded-md bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                        >
                            <option value="PLATFORM">Platform Funds It</option>
                            <option value="BUSINESS_FULL">Business Fully Reimburses</option>
                            <option value="BUSINESS_SPLIT">Business Partially Reimburses</option>
                        </select>
                    </label>

                    <label className="rounded-xl bg-slate-900/80 p-3 text-xs text-slate-300">
                        Driver Free-Delivery Compensation (EUR)
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={builderConfig.driverFreeDeliveryCompensation}
                            onChange={(e) => setBuilderConfig((prev) => ({ ...prev, driverFreeDeliveryCompensation: Number(e.target.value) || 0 }))}
                            className="mt-1 w-full rounded-md bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                        />
                    </label>

                    <label className="rounded-xl bg-slate-900/80 p-3 text-xs text-slate-300">
                        Business Reimbursement (EUR)
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={builderConfig.businessReimbursementAmount}
                            onChange={(e) => setBuilderConfig((prev) => ({ ...prev, businessReimbursementAmount: Number(e.target.value) || 0 }))}
                            className="mt-1 w-full rounded-md bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                        />
                    </label>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl bg-slate-900/80 p-3 shadow-md shadow-black/30">
                        <div className="mb-3 text-sm font-semibold text-slate-100">Builder Expected Output</div>
                        {(() => {
                            const rows = builderPreview.rows;
                            const driverReceivable = rows.filter((r) => r.type === 'DRIVER' && r.direction === 'RECEIVABLE');
                            const driverPayable = rows.filter((r) => r.type === 'DRIVER' && r.direction === 'PAYABLE');
                            const businessReceivable = rows.filter((r) => r.type === 'BUSINESS' && r.direction === 'RECEIVABLE');
                            const businessPayable = rows.filter((r) => r.type === 'BUSINESS' && r.direction === 'PAYABLE');
                            return (
                                <div className="grid gap-3 md:grid-cols-2">
                                    <FlowColumn
                                        title="Driver Owes Platform"
                                        subtitle="DRIVER / RECEIVABLE"
                                        rows={driverReceivable}
                                        accentClass="bg-amber-300/25 text-amber-100"
                                    />
                                    <FlowColumn
                                        title="Platform Owes Driver"
                                        subtitle="DRIVER / PAYABLE"
                                        rows={driverPayable}
                                        accentClass="bg-emerald-300/25 text-emerald-100"
                                    />
                                    <FlowColumn
                                        title="Business Owes Platform"
                                        subtitle="BUSINESS / RECEIVABLE"
                                        rows={businessReceivable}
                                        accentClass="bg-sky-300/25 text-sky-100"
                                    />
                                    <FlowColumn
                                        title="Platform Owes Business"
                                        subtitle="BUSINESS / PAYABLE"
                                        rows={businessPayable}
                                        accentClass="bg-fuchsia-300/25 text-fuchsia-100"
                                    />
                                </div>
                            );
                        })()}
                    </div>

                    <div className="rounded-2xl bg-slate-900/80 p-3 shadow-md shadow-black/30">
                        <div className="mb-3 text-sm font-semibold text-slate-100">What To Set In Rules</div>
                        <div className="space-y-2">
                            {builderPreview.ruleHints.map((rule, idx) => (
                                <div key={`${rule.name}-${idx}`} className="rounded-xl bg-slate-800/90 p-2 text-xs text-slate-200">
                                    <div className="font-semibold text-slate-100">{rule.name}</div>
                                    <div className="mt-1 text-slate-300">
                                        {rule.entityType} / {rule.direction} | {rule.amountType} {rule.amount}
                                        {rule.amountType === 'PERCENT' ? '%' : ' EUR'}
                                        {rule.appliesTo ? ` on ${rule.appliesTo}` : ''}
                                    </div>
                                    <div className="text-slate-400">Scope: {rule.scope}</div>
                                </div>
                            ))}
                            {builderPreview.ruleHints.length === 0 && (
                                <div className="rounded-xl bg-slate-800/90 p-2 text-xs text-slate-400">No rule rows produced from current builder values.</div>
                            )}
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-slate-300">
                            {builderPreview.notes.map((note, idx) => (
                                <div key={idx} className="rounded-lg bg-indigo-500/15 px-2 py-1 text-indigo-100">{note}</div>
                            ))}
                            {builderPreview.suggestedScenarioId && (
                                <div className="rounded-lg bg-slate-800 px-2 py-1 text-slate-300">
                                    Closest harness scenario: <span className="font-semibold text-slate-100">{builderPreview.suggestedScenarioId}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {latestResult && (
                <div className="space-y-4">
                    <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 shadow-lg shadow-black/35">
                        <div className="text-sm text-slate-200">Latest Run Summary</div>
                        <div className="mt-2 text-base font-semibold text-white">
                            {latestResult.passed
                                ? `PASS (${latestResult.passedCount}/${latestResult.total})`
                                : `FAIL (${latestResult.passedCount}/${latestResult.total})`}
                        </div>
                        <div className="mt-1 text-sm text-slate-200">
                            Passed: {latestResult.passedCount} | Failed: {latestResult.failedCount}
                        </div>
                    </div>

                    {latestResult.results.length > 1 && (
                        <div className="rounded-2xl bg-slate-900/80 p-3 shadow-md shadow-black/30">
                            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Scenario View</div>
                            <div className="flex flex-wrap gap-2">
                                {latestResult.results.map((result) => {
                                    const isActive = (selectedResultScenarioId ?? latestResult.results[0]?.scenarioId) === result.scenarioId;
                                    return (
                                        <button
                                            key={result.scenarioId}
                                            type="button"
                                            onClick={() => setSelectedResultScenarioId(result.scenarioId)}
                                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                                isActive
                                                    ? 'bg-indigo-500/25 text-indigo-100'
                                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            {result.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {(() => {
                        const visibleResult = latestResult.results.find(
                            (r) => r.scenarioId === (selectedResultScenarioId ?? latestResult.results[0]?.scenarioId),
                        ) ?? latestResult.results[0];

                        if (!visibleResult) return null;

                        const result = visibleResult;

                        return (
                            <div
                                key={result.scenarioId}
                                className="space-y-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 shadow-lg shadow-black/30"
                            >
                            <div className="flex items-center justify-between">
                                <div className="font-semibold text-slate-100">{result.name}</div>
                                <div
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                        result.passed
                                            ? 'bg-emerald-300/20 text-emerald-200'
                                            : 'bg-rose-300/20 text-rose-200'
                                    }`}
                                >
                                    {result.passed ? 'PASS' : 'FAIL'}
                                </div>
                            </div>

                            <div className="mt-2 text-sm text-slate-300">
                                Expected settlements: {result.expectedCount} | Actual settlements: {result.actualCount}
                            </div>

                            {(() => {
                                const meta = scenarioOrderMeta[result.scenarioId];
                                if (!meta) {
                                    return (
                                        <div className="rounded-xl bg-slate-800 p-3 text-xs text-slate-400 shadow-sm shadow-black/30">
                                            Order cost breakdown unavailable for this scenario.
                                        </div>
                                    );
                                }

                                const customerTotal = meta.subtotal + meta.deliveryFee;
                                return (
                                    <div className="grid gap-3 md:grid-cols-4">
                                        <div className="rounded-2xl bg-slate-800/95 p-3 shadow-sm shadow-black/30">
                                            <div className="text-xs text-slate-400">Order Subtotal</div>
                                            <div className="mt-1 text-base font-semibold text-slate-100">{formatMoney(meta.subtotal)}</div>
                                        </div>
                                        <div className="rounded-2xl bg-slate-800/95 p-3 shadow-sm shadow-black/30">
                                            <div className="text-xs text-slate-400">Delivery Fee</div>
                                            <div className="mt-1 text-base font-semibold text-slate-100">{formatMoney(meta.deliveryFee)}</div>
                                        </div>
                                        <div className="rounded-2xl bg-slate-800/95 p-3 shadow-sm shadow-black/30">
                                            <div className="text-xs text-slate-400">Customer Total</div>
                                            <div className="mt-1 text-base font-semibold text-slate-100">{formatMoney(customerTotal)}</div>
                                        </div>
                                        <div className="rounded-2xl bg-slate-800/95 p-3 shadow-sm shadow-black/30">
                                            <div className="text-xs text-slate-400">Payment Collection</div>
                                            <div className="mt-1 text-sm font-semibold text-slate-100">
                                                {meta.paymentCollection === 'CASH_TO_DRIVER' ? 'Cash to Driver' : 'Prepaid to Platform'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {!result.passed && result.mismatches.length > 0 && (
                                <div className="mt-3 rounded-xl bg-rose-950/50 p-3 text-sm text-rose-200 shadow-sm shadow-black/30">
                                    <div className="font-medium">Mismatches</div>
                                    <ul className="mt-2 list-disc pl-5">
                                        {result.mismatches.map((mismatch, idx) => (
                                            <li key={idx}>{mismatch}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {(() => {
                                const expected = parseSettlements(result.expectedSettlements);
                                const actual = parseSettlements(result.actualSettlements);

                                const expectedDriverReceivable = expected.filter((r) => r.type === 'DRIVER' && r.direction === 'RECEIVABLE');
                                const expectedDriverPayable = expected.filter((r) => r.type === 'DRIVER' && r.direction === 'PAYABLE');
                                const expectedBusinessReceivable = expected.filter((r) => r.type === 'BUSINESS' && r.direction === 'RECEIVABLE');
                                const expectedBusinessPayable = expected.filter((r) => r.type === 'BUSINESS' && r.direction === 'PAYABLE');

                                const actualDriverReceivable = actual.filter((r) => r.type === 'DRIVER' && r.direction === 'RECEIVABLE');
                                const actualDriverPayable = actual.filter((r) => r.type === 'DRIVER' && r.direction === 'PAYABLE');
                                const actualBusinessReceivable = actual.filter((r) => r.type === 'BUSINESS' && r.direction === 'RECEIVABLE');
                                const actualBusinessPayable = actual.filter((r) => r.type === 'BUSINESS' && r.direction === 'PAYABLE');

                                const expectedDriverNet = netEntityPosition(expected, 'DRIVER');
                                const expectedBusinessNet = netEntityPosition(expected, 'BUSINESS');
                                const actualDriverNet = netEntityPosition(actual, 'DRIVER');
                                const actualBusinessNet = netEntityPosition(actual, 'BUSINESS');

                                return (
                                    <div className="space-y-4">
                                        <div className="grid gap-3 md:grid-cols-3">
                                            <div className="rounded-2xl bg-amber-950/35 p-3 shadow-sm shadow-black/30">
                                                <div className="text-xs text-amber-300">Expected Driver Net</div>
                                                <div className="mt-1 text-sm font-semibold text-amber-100">
                                                    {expectedDriverNet >= 0
                                                        ? `Platform owes Driver ${formatMoney(expectedDriverNet)}`
                                                        : `Driver owes Platform ${formatMoney(Math.abs(expectedDriverNet))}`}
                                                </div>
                                            </div>
                                            <div className="rounded-2xl bg-sky-950/35 p-3 shadow-sm shadow-black/30">
                                                <div className="text-xs text-sky-300">Expected Business Net</div>
                                                <div className="mt-1 text-sm font-semibold text-sky-100">
                                                    {expectedBusinessNet >= 0
                                                        ? `Platform owes Business ${formatMoney(expectedBusinessNet)}`
                                                        : `Business owes Platform ${formatMoney(Math.abs(expectedBusinessNet))}`}
                                                </div>
                                            </div>
                                            <div className="rounded-2xl bg-slate-800/90 p-3 shadow-sm shadow-black/30">
                                                <div className="text-xs text-slate-400">Flow Guide</div>
                                                <div className="mt-1 text-sm font-medium text-slate-100">Driver / Business ⇄ Platform</div>
                                                <div className="text-xs text-slate-400">Receivable means they owe platform; payable means platform owes them.</div>
                                            </div>
                                        </div>

                                        <div className="grid gap-4 xl:grid-cols-2">
                                            <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 p-3 shadow-md shadow-black/30">
                                            <div className="mb-3 text-sm font-semibold">Expected Money Flows</div>
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <FlowColumn
                                                    title="Driver Owes Platform"
                                                    subtitle="DRIVER / RECEIVABLE"
                                                    rows={expectedDriverReceivable}
                                                    accentClass="bg-amber-300/25 text-amber-100"
                                                />
                                                <FlowColumn
                                                    title="Platform Owes Driver"
                                                    subtitle="DRIVER / PAYABLE"
                                                    rows={expectedDriverPayable}
                                                    accentClass="bg-emerald-300/25 text-emerald-100"
                                                />
                                                <FlowColumn
                                                    title="Business Owes Platform"
                                                    subtitle="BUSINESS / RECEIVABLE"
                                                    rows={expectedBusinessReceivable}
                                                    accentClass="bg-sky-300/25 text-sky-100"
                                                />
                                                <FlowColumn
                                                    title="Platform Owes Business"
                                                    subtitle="BUSINESS / PAYABLE"
                                                    rows={expectedBusinessPayable}
                                                    accentClass="bg-fuchsia-300/25 text-fuchsia-100"
                                                />
                                            </div>
                                            <div className="mt-3 rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-300">
                                                Driver net: {expectedDriverNet >= 0 ? `Platform -> Driver ${formatMoney(expectedDriverNet)}` : `Driver -> Platform ${formatMoney(Math.abs(expectedDriverNet))}`} | Business net:{' '}
                                                {expectedBusinessNet >= 0 ? `Platform -> Business ${formatMoney(expectedBusinessNet)}` : `Business -> Platform ${formatMoney(Math.abs(expectedBusinessNet))}`}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 p-3 shadow-md shadow-black/30">
                                            <div className="mb-3 text-sm font-semibold">Actual Money Flows</div>
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <FlowColumn
                                                    title="Driver Owes Platform"
                                                    subtitle="DRIVER / RECEIVABLE"
                                                    rows={actualDriverReceivable}
                                                    accentClass="bg-amber-300/25 text-amber-100"
                                                />
                                                <FlowColumn
                                                    title="Platform Owes Driver"
                                                    subtitle="DRIVER / PAYABLE"
                                                    rows={actualDriverPayable}
                                                    accentClass="bg-emerald-300/25 text-emerald-100"
                                                />
                                                <FlowColumn
                                                    title="Business Owes Platform"
                                                    subtitle="BUSINESS / RECEIVABLE"
                                                    rows={actualBusinessReceivable}
                                                    accentClass="bg-sky-300/25 text-sky-100"
                                                />
                                                <FlowColumn
                                                    title="Platform Owes Business"
                                                    subtitle="BUSINESS / PAYABLE"
                                                    rows={actualBusinessPayable}
                                                    accentClass="bg-fuchsia-300/25 text-fuchsia-100"
                                                />
                                            </div>
                                            <div className="mt-3 rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-300">
                                                Driver net: {actualDriverNet >= 0 ? `Platform -> Driver ${formatMoney(actualDriverNet)}` : `Driver -> Platform ${formatMoney(Math.abs(actualDriverNet))}`} | Business net:{' '}
                                                {actualBusinessNet >= 0 ? `Platform -> Business ${formatMoney(actualBusinessNet)}` : `Business -> Platform ${formatMoney(Math.abs(actualBusinessNet))}`}
                                            </div>
                                        </div>
                                        </div>
                                    </div>
                                );
                            })()}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
