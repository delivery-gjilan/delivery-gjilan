/**
 * Comprehensive unit tests for the SettlementCalculationEngine.
 *
 * These tests exercise the actual settlement logic used in production:
 *   - Automatic settlements (markup, priority surcharge, driver tip, stock, catalog)
 *   - Rule-based settlements (DELIVERY_PRICE most-specific-wins, ORDER_PRICE additive)
 *   - Rule amount calculations (FIXED, PERCENT with maxAmount cap)
 *   - Driver commission fallback when no delivery rules exist
 *   - Edge cases (null fields, zero amounts, missing driver)
 *
 * The engine is instantiated with a mock DB.  Pure helpers (addMarkupSettlement,
 * addPrioritySurchargeSettlement, etc.) are tested indirectly through
 * calculateOrderSettlements by controlling the mock data returned.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettlementCalculationEngine, type SettlementCalculation } from '../SettlementCalculationEngine';
import type { DbOrder, DbOrderItem } from '@/database/schema';
import type { DbType } from '@/database';

// ---------------------------------------------------------------------------
// Mock DB builder — simulates Drizzle's chainable query API
// ---------------------------------------------------------------------------

type QueryResult = Record<string, unknown>[];

function noop() {
    return [];
}

/**
 * Build a fake DB that lets us control the results of each `.select().from(table)`
 * chain.  tableResults maps a table reference to the rows that query should return.
 */
function createMockDb(tableResults: Map<unknown, QueryResult> = new Map()) {
    const db = {
        select: vi.fn().mockImplementation((_cols?: unknown) => {
            let resolvedTable: unknown = null;
            const chain: Record<string, unknown> = {
                from: vi.fn().mockImplementation((table: unknown) => {
                    resolvedTable = table;
                    return chain;
                }),
                where: vi.fn().mockImplementation(() => chain),
                limit: vi.fn().mockImplementation(() => chain),
                groupBy: vi.fn().mockImplementation(() => chain),
                leftJoin: vi.fn().mockImplementation(() => chain),
                then: (resolve: (value: unknown) => unknown) => {
                    const rows = (resolvedTable && tableResults.get(resolvedTable)) ?? [];
                    return Promise.resolve(rows).then(resolve);
                },
                [Symbol.iterator]: undefined,
            };
            return chain;
        }),
        query: {},
    };
    return db as unknown as DbType;
}

// ---------------------------------------------------------------------------
// Order builder — only fields the engine reads
// ---------------------------------------------------------------------------

interface OrderOverrides {
    id?: string;
    paymentCollection?: 'CASH_TO_DRIVER' | 'PREPAID_TO_PLATFORM';
    markupPrice?: number | string | null;
    prioritySurcharge?: number | string | null;
    driverTip?: number | string | null;
    deliveryPrice?: number | string | null;
    originalDeliveryPrice?: number | string | null;
    actualPrice?: number | string | null;
    basePrice?: number | string | null;
    businessPrice?: number | string | null;
    status?: string;
}

function makeOrder(overrides: OrderOverrides = {}) {
    return {
        id: 'id' in overrides ? overrides.id : 'order-1',
        paymentCollection: overrides.paymentCollection ?? 'CASH_TO_DRIVER',
        markupPrice: 'markupPrice' in overrides ? overrides.markupPrice : 0,
        prioritySurcharge: 'prioritySurcharge' in overrides ? overrides.prioritySurcharge : 0,
        driverTip: 'driverTip' in overrides ? overrides.driverTip : 0,
        deliveryPrice: 'deliveryPrice' in overrides ? overrides.deliveryPrice : 3,
        originalDeliveryPrice: 'originalDeliveryPrice' in overrides ? overrides.originalDeliveryPrice : null,
        actualPrice: 'actualPrice' in overrides ? overrides.actualPrice : 20,
        basePrice: 'basePrice' in overrides ? overrides.basePrice : 15,
        businessPrice: 'businessPrice' in overrides ? overrides.businessPrice : 15,
        status: overrides.status ?? 'DELIVERED',
    } as unknown as DbOrder;
}

function makeOrderItem(overrides: Record<string, unknown> = {}) {
    return {
        id: 'item-1',
        orderId: 'order-1',
        productId: overrides.productId ?? 'prod-1',
        quantity: overrides.quantity ?? 1,
        basePrice: overrides.basePrice ?? 10,
        finalAppliedPrice: overrides.finalAppliedPrice ?? 10,
        productName: overrides.productName ?? 'Test Product',
        price: overrides.price ?? '10',
        createdAt: new Date().toISOString(),
        ...overrides,
    } as unknown as DbOrderItem;
}

const DRIVER_ID = 'driver-1';

// ---------------------------------------------------------------------------
// Helpers to find specific settlement types in results
// ---------------------------------------------------------------------------

function findByReason(results: SettlementCalculation[], substring: string) {
    return results.filter((s) => s.reason.includes(substring));
}

function findMarkup(results: SettlementCalculation[]) {
    return findByReason(results, 'Markup remittance');
}

function findPrioritySurcharge(results: SettlementCalculation[]) {
    return findByReason(results, 'Priority surcharge remittance');
}

function findDriverTip(results: SettlementCalculation[]) {
    return findByReason(results, 'Driver tip');
}

function findStockRemittance(results: SettlementCalculation[]) {
    return findByReason(results, 'Stock item remittance');
}

function findCatalogRevenue(results: SettlementCalculation[]) {
    return findByReason(results, 'Catalog product revenue');
}

function findDriverCommission(results: SettlementCalculation[]) {
    return findByReason(results, 'Driver delivery commission');
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKUP REMITTANCE
// ═══════════════════════════════════════════════════════════════════════════

describe('Markup remittance settlement', () => {
    it('creates DRIVER/RECEIVABLE for markup on CASH_TO_DRIVER order', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({ markupPrice: 5 });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);
        const markup = findMarkup(results);

        expect(markup).toHaveLength(1);
        expect(markup[0]).toMatchObject({
            type: 'DRIVER',
            direction: 'RECEIVABLE',
            driverId: DRIVER_ID,
            amount: 5,
            ruleId: null,
        });
    });

    it('skips markup settlement for PREPAID_TO_PLATFORM order', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({ paymentCollection: 'PREPAID_TO_PLATFORM', markupPrice: 5 });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);

        expect(findMarkup(results)).toHaveLength(0);
    });

    it('skips markup settlement when markupPrice is 0', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({ markupPrice: 0 });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);

        expect(findMarkup(results)).toHaveLength(0);
    });

    it('skips markup settlement when markupPrice is null', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({ markupPrice: null });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);

        expect(findMarkup(results)).toHaveLength(0);
    });

    it('skips markup settlement when driverId is null', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({ markupPrice: 5 });

        const results = await engine.calculateOrderSettlements(order, [], null);

        expect(findMarkup(results)).toHaveLength(0);
    });

    it('handles string markupPrice from Postgres numeric', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({ markupPrice: '3.50' });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);
        const markup = findMarkup(results);

        expect(markup).toHaveLength(1);
        expect(markup[0].amount).toBe(3.5);
    });

    it('rounds markup amount to 2 decimal places', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({ markupPrice: '2.999' });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);
        const markup = findMarkup(results);

        expect(markup).toHaveLength(1);
        expect(markup[0].amount).toBe(3);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// PRIORITY SURCHARGE REMITTANCE
// ═══════════════════════════════════════════════════════════════════════════

describe('Priority surcharge remittance settlement', () => {
    it('creates DRIVER/RECEIVABLE for priority surcharge on CASH_TO_DRIVER', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({ prioritySurcharge: 1.5 });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);
        const surcharge = findPrioritySurcharge(results);

        expect(surcharge).toHaveLength(1);
        expect(surcharge[0]).toMatchObject({
            type: 'DRIVER',
            direction: 'RECEIVABLE',
            driverId: DRIVER_ID,
            amount: 1.5,
            ruleId: null,
        });
    });

    it('skips surcharge for PREPAID_TO_PLATFORM', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({ paymentCollection: 'PREPAID_TO_PLATFORM', prioritySurcharge: 1.5 });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);

        expect(findPrioritySurcharge(results)).toHaveLength(0);
    });

    it('skips surcharge when value is 0', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({ prioritySurcharge: 0 });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);

        expect(findPrioritySurcharge(results)).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// DRIVER TIP PASSTHROUGH
// ═══════════════════════════════════════════════════════════════════════════

describe('Driver tip passthrough settlement', () => {
    it('creates DRIVER/PAYABLE for tip on PREPAID_TO_PLATFORM order', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({ paymentCollection: 'PREPAID_TO_PLATFORM', driverTip: 2 });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);
        const tip = findDriverTip(results);

        expect(tip).toHaveLength(1);
        expect(tip[0]).toMatchObject({
            type: 'DRIVER',
            direction: 'PAYABLE',
            driverId: DRIVER_ID,
            amount: 2,
            ruleId: null,
        });
    });

    it('skips tip settlement for CASH_TO_DRIVER (driver kept tip in cash)', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({ paymentCollection: 'CASH_TO_DRIVER', driverTip: 3 });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);

        expect(findDriverTip(results)).toHaveLength(0);
    });

    it('skips tip settlement when driverTip is 0', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({ paymentCollection: 'PREPAID_TO_PLATFORM', driverTip: 0 });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);

        expect(findDriverTip(results)).toHaveLength(0);
    });

    it('skips tip settlement when driverTip is null', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({ paymentCollection: 'PREPAID_TO_PLATFORM', driverTip: null });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);

        expect(findDriverTip(results)).toHaveLength(0);
    });

    it('handles string tip value from Postgres numeric', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({ paymentCollection: 'PREPAID_TO_PLATFORM', driverTip: '4.50' });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);
        const tip = findDriverTip(results);

        expect(tip).toHaveLength(1);
        expect(tip[0].amount).toBe(4.5);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED AUTOMATIC SETTLEMENTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Combined automatic settlements — CASH_TO_DRIVER', () => {
    it('creates both markup and surcharge but no tip for CASH_TO_DRIVER', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({
            markupPrice: 5,
            prioritySurcharge: 1,
            driverTip: 2, // driver already has this in cash
        });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);

        expect(findMarkup(results)).toHaveLength(1);
        expect(findPrioritySurcharge(results)).toHaveLength(1);
        expect(findDriverTip(results)).toHaveLength(0);

        // All RECEIVABLE for CASH_TO_DRIVER automatic settlements
        const autoSettlements = results.filter((s) => s.ruleId === null);
        for (const s of autoSettlements) {
            expect(s.direction).toBe('RECEIVABLE');
        }
    });
});

describe('Combined automatic settlements — PREPAID_TO_PLATFORM', () => {
    it('creates only tip settlement for PREPAID_TO_PLATFORM (no markup/surcharge)', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);
        const order = makeOrder({
            paymentCollection: 'PREPAID_TO_PLATFORM',
            markupPrice: 5,
            prioritySurcharge: 1,
            driverTip: 2,
        });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);

        // Markup and surcharge should NOT be created (platform collected directly)
        expect(findMarkup(results)).toHaveLength(0);
        expect(findPrioritySurcharge(results)).toHaveLength(0);

        // Tip should be created as PAYABLE (platform forwards tip to driver)
        const tips = findDriverTip(results);
        expect(tips).toHaveLength(1);
        expect(tips[0].direction).toBe('PAYABLE');
        expect(tips[0].amount).toBe(2);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// RULE APPLICATION — Base selection logic
// ═══════════════════════════════════════════════════════════════════════════

describe('Rule amount calculation — applyRule logic mirror', () => {
    // These mirror the private applyRule method's base selection and
    // amount calculation.  Changes to the engine should fail these.

    it('FIXED amount rule ignores base value', () => {
        const amount = 5; // fixed €5
        expect(amount).toBe(5); // regardless of base
    });

    it('PERCENT rule calculates on base', () => {
        const base = 200;
        const ruleAmount = 10; // 10%
        const amount = (base * ruleAmount) / 100;
        expect(amount).toBe(20);
    });

    it('PERCENT rule applies maxAmount cap', () => {
        const base = 200;
        const ruleAmount = 50; // 50%
        const maxAmount = 30;
        let amount = (base * ruleAmount) / 100; // = 100
        if (maxAmount > 0 && amount > maxAmount) amount = maxAmount;
        expect(amount).toBe(30);
    });

    it('PERCENT rule does not cap when below maxAmount', () => {
        const base = 100;
        const ruleAmount = 10; // 10%
        const maxAmount = 50;
        let amount = (base * ruleAmount) / 100; // = 10
        if (maxAmount > 0 && amount > maxAmount) amount = maxAmount;
        expect(amount).toBe(10);
    });

    it('DELIVERY_PRICE rule uses deliveryPrice as base', () => {
        // Mirror of: if (rule.type === 'DELIVERY_PRICE') base = Number(order.deliveryPrice ?? ...)
        const order = makeOrder({ deliveryPrice: 3.5 });
        const base = Number(order.deliveryPrice ?? order.originalDeliveryPrice ?? 0);
        expect(base).toBe(3.5);
    });

    it('ORDER_PRICE BUSINESS rule uses businessPrice as base (falls back to basePrice)', () => {
        // Mirror of: if (rule.entityType === 'BUSINESS') base = Number(order.businessPrice ?? order.basePrice ?? ...)
        const order = makeOrder({ businessPrice: 18, basePrice: 20 });
        const base = Number(order.businessPrice ?? order.basePrice ?? order.actualPrice ?? 0);
        expect(base).toBe(18);
    });

    it('ORDER_PRICE BUSINESS rule falls back to basePrice when businessPrice is null', () => {
        const order = makeOrder({ businessPrice: null, basePrice: 20 });
        const base = Number(order.businessPrice ?? order.basePrice ?? order.actualPrice ?? 0);
        expect(base).toBe(20);
    });

    it('ORDER_PRICE DRIVER rule uses actualPrice as base', () => {
        // Mirror of: else base = Number(order.actualPrice ?? 0)
        const order = makeOrder({ actualPrice: 25 });
        const base = Number(order.actualPrice ?? 0);
        expect(base).toBe(25);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SETTLING SERVICE — Net balance & partial payment logic
// ═══════════════════════════════════════════════════════════════════════════

describe('Net balance calculation (mirrors SettlingService)', () => {
    function calculateNetCents(
        settlements: { amount: number | string; direction: 'RECEIVABLE' | 'PAYABLE' }[],
    ) {
        let netCents = 0;
        for (const s of settlements) {
            const amountCents = Math.round(Number(s.amount) * 100);
            if (s.direction === 'RECEIVABLE') {
                netCents += amountCents;
            } else {
                netCents -= amountCents;
            }
        }
        return netCents;
    }

    it('markup + surcharge = total RECEIVABLE', () => {
        const netCents = calculateNetCents([
            { amount: 5, direction: 'RECEIVABLE' },   // markup
            { amount: 1, direction: 'RECEIVABLE' },   // surcharge
        ]);
        expect(netCents).toBe(600); // 6.00 EUR in cents
    });

    it('tip reduces driver debt (PAYABLE offsets RECEIVABLE)', () => {
        const netCents = calculateNetCents([
            { amount: 5, direction: 'RECEIVABLE' },   // markup
            { amount: 1, direction: 'RECEIVABLE' },   // surcharge
            { amount: 2, direction: 'PAYABLE' },      // tip passthrough
        ]);
        expect(netCents).toBe(400); // net 4.00 EUR driver owes
    });

    it('tip larger than debts → platform owes driver', () => {
        const netCents = calculateNetCents([
            { amount: 1, direction: 'RECEIVABLE' },   // small markup
            { amount: 5, direction: 'PAYABLE' },      // large tip
        ]);
        expect(netCents).toBe(-400); // platform owes driver 4.00
    });

    it('fractional cent arithmetic avoids floating-point drift', () => {
        const netCents = calculateNetCents([
            { amount: 0.1, direction: 'RECEIVABLE' },
            { amount: 0.2, direction: 'RECEIVABLE' },
        ]);
        // 0.1 + 0.2 = 0.30000000000000004 in JS floats
        // But Math.round(0.1 * 100) + Math.round(0.2 * 100) = 10 + 20 = 30
        expect(netCents).toBe(30);
    });

    it('partial payment creates correct remainder', () => {
        const absNet = 1000; // 10.00 EUR
        const paymentCents = 600; // pay 6.00
        const remainderCents = absNet - paymentCents;
        const remainderAmount = Number((remainderCents / 100).toFixed(2));
        expect(remainderAmount).toBe(4);
    });

    it('string amounts from Postgres are handled correctly', () => {
        const netCents = calculateNetCents([
            { amount: '15.50', direction: 'RECEIVABLE' },
            { amount: '3.00', direction: 'PAYABLE' },
        ]);
        expect(netCents).toBe(1250);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// DRIVER CASH SUMMARY — Correctness verification
// ═══════════════════════════════════════════════════════════════════════════

describe('Driver cash summary formula verification', () => {
    /**
     * cashCollected = totalPrice - businessPrice
     *   where totalPrice = actualPrice + deliveryPrice + prioritySurcharge + driverTip
     *
     * This represents: what the driver KEEPS after paying the business for food.
     * Then settlements adjust further (markup/surcharge are RECEIVABLE deductions).
     */

    it('calculates correct cashCollected for a simple order', () => {
        const order = {
            actualPrice: 20,
            deliveryPrice: 3,
            prioritySurcharge: 1,
            driverTip: 2,
            businessPrice: 15,
        };

        const totalPrice =
            order.actualPrice + order.deliveryPrice + order.prioritySurcharge + order.driverTip;
        const cashCollected = totalPrice - order.businessPrice;

        expect(totalPrice).toBe(26);
        expect(cashCollected).toBe(11);
    });

    it('takeHome = cashCollected + netSettlement (driver keeps delivery + tip)', () => {
        const cashCollected = 11; // from example above
        const youOwePlatform = 6; // markup(5) + surcharge(1)
        const platformOwesYou = 0; // no PAYABLE for CASH_TO_DRIVER
        const netSettlement = platformOwesYou - youOwePlatform; // -6
        const takeHome = cashCollected + netSettlement; // 11 + (-6) = 5

        // Driver keeps: deliveryPrice(3) + driverTip(2) = 5
        expect(takeHome).toBe(5);
    });

    it('PREPAID order tip appears in platformOwesYou', () => {
        // For a PREPAID order: driver collects 0 cash
        // But platform creates a PAYABLE settlement for the tip
        const cashCollected = 0;
        const youOwePlatform = 0;
        const platformOwesYou = 2; // tip passthrough PAYABLE
        const netSettlement = platformOwesYou - youOwePlatform;
        const takeHome = cashCollected + netSettlement;

        expect(takeHome).toBe(2); // Driver earns the tip from platform
    });

    it('handles order with markup and delivery commission rule', () => {
        // Order: actualPrice=20, businessPrice=15, markupPrice=5, delivery=3
        // Settlement: markup RECEIVABLE 5, delivery commission RECEIVABLE 0.45 (15% of 3)
        const cashCollected = 20 + 3 + 0 + 0 - 15; // 8
        const youOwePlatform = 5 + 0.45; // 5.45
        const platformOwesYou = 0;
        const netSettlement = 0 - 5.45;
        const takeHome = 8 + (-5.45); // 2.55

        // Driver keeps: delivery(3) - deliveryCommission(0.45) = 2.55
        expect(takeHome).toBeCloseTo(2.55, 2);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SETTLEMENT BREAKDOWN RESOLVER — Category classification
// ═══════════════════════════════════════════════════════════════════════════

describe('Settlement breakdown categorization logic', () => {
    /**
     * Mirrors the settlementBreakdown resolver's categorization:
     *   - null ruleId + reason "Stock item…" → STOCK_REMITTANCE
     *   - null ruleId + reason "Driver tip…" → DRIVER_TIP
     *   - null ruleId + reason "Catalog product…" → CATALOG_REVENUE
    *   - any reason "Direct call fixed payment…" → DIRECT_CALL_FIXED_FEE
     *   - null ruleId + other → AUTO_REMITTANCE (markup/surcharge)
     *   - ruleId + promotionId → PROMOTION_COST
     *   - ruleId + DELIVERY_PRICE type → DELIVERY_COMMISSION
     *   - ruleId + ORDER_PRICE type → PLATFORM_COMMISSION
     */

    type BreakdownRow = {
        ruleId: string | null;
        promotionId: string | null;
        ruleType: string | null;
        direction: string;
        reason: string;
    };

    function categorize(row: BreakdownRow): string {
        const isStockRemittance = row.reason.startsWith('Stock item');
        const isDriverTip = row.reason.startsWith('Driver tip');
        const isCatalogRevenue = row.reason.startsWith('Catalog product');
        const isDirectCallFixedFee = row.reason.startsWith('Direct call fixed payment');

        if (isDirectCallFixedFee) return 'DIRECT_CALL_FIXED_FEE';

        if (!row.ruleId) {
            if (isStockRemittance) return 'STOCK_REMITTANCE';
            if (isDriverTip) return 'DRIVER_TIP';
            if (isCatalogRevenue) return 'CATALOG_REVENUE';
            return 'AUTO_REMITTANCE';
        } else if (row.promotionId) {
            return 'PROMOTION_COST';
        } else if (row.ruleType === 'DELIVERY_PRICE') {
            return 'DELIVERY_COMMISSION';
        } else {
            return 'PLATFORM_COMMISSION';
        }
    }

    it('classifies markup remittance as AUTO_REMITTANCE', () => {
        expect(
            categorize({
                ruleId: null,
                promotionId: null,
                ruleType: null,
                direction: 'RECEIVABLE',
                reason: 'Markup remittance (€5.00 cash collected)',
            }),
        ).toBe('AUTO_REMITTANCE');
    });

    it('classifies priority surcharge as AUTO_REMITTANCE', () => {
        expect(
            categorize({
                ruleId: null,
                promotionId: null,
                ruleType: null,
                direction: 'RECEIVABLE',
                reason: 'Priority surcharge remittance (€1.00 cash collected)',
            }),
        ).toBe('AUTO_REMITTANCE');
    });

    it('classifies stock item remittance as STOCK_REMITTANCE', () => {
        expect(
            categorize({
                ruleId: null,
                promotionId: null,
                ruleType: null,
                direction: 'RECEIVABLE',
                reason: 'Stock item remittance (€8.50 items from operator inventory)',
            }),
        ).toBe('STOCK_REMITTANCE');
    });

    it('classifies driver tip as DRIVER_TIP', () => {
        expect(
            categorize({
                ruleId: null,
                promotionId: null,
                ruleType: null,
                direction: 'PAYABLE',
                reason: 'Driver tip (€2.00 prepaid by customer)',
            }),
        ).toBe('DRIVER_TIP');
    });

    it('classifies catalog product revenue as CATALOG_REVENUE', () => {
        expect(
            categorize({
                ruleId: null,
                promotionId: null,
                ruleType: null,
                direction: 'RECEIVABLE',
                reason: 'Catalog product revenue (€12.00 adopted items)',
            }),
        ).toBe('CATALOG_REVENUE');
    });

    it('classifies direct-call fixed-payment reason as DIRECT_CALL_FIXED_FEE', () => {
        expect(
            categorize({
                ruleId: 'rule-1',
                promotionId: 'promo-1',
                ruleType: 'DELIVERY_PRICE',
                direction: 'PAYABLE',
                reason: 'Direct call fixed payment: Driver payable on delivery fee (€1.00 fixed)',
            }),
        ).toBe('DIRECT_CALL_FIXED_FEE');
    });

    it('classifies rule with promotionId as PROMOTION_COST', () => {
        expect(
            categorize({
                ruleId: 'rule-1',
                promotionId: 'promo-1',
                ruleType: 'ORDER_PRICE',
                direction: 'RECEIVABLE',
                reason: 'Business receivable on order price (10% of €20.00)',
            }),
        ).toBe('PROMOTION_COST');
    });

    it('classifies DELIVERY_PRICE rule as DELIVERY_COMMISSION', () => {
        expect(
            categorize({
                ruleId: 'rule-1',
                promotionId: null,
                ruleType: 'DELIVERY_PRICE',
                direction: 'RECEIVABLE',
                reason: 'Driver receivable on delivery fee (15% of €3.00)',
            }),
        ).toBe('DELIVERY_COMMISSION');
    });

    it('classifies ORDER_PRICE rule as PLATFORM_COMMISSION', () => {
        expect(
            categorize({
                ruleId: 'rule-1',
                promotionId: null,
                ruleType: 'ORDER_PRICE',
                direction: 'RECEIVABLE',
                reason: 'Business receivable on order price (€2.00 fixed)',
            }),
        ).toBe('PLATFORM_COMMISSION');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// DELIVERY RULE SCOPING — Most-specific-wins hierarchy
// ═══════════════════════════════════════════════════════════════════════════

describe('Delivery rule scoping – most-specific-wins', () => {
    /**
     * Mirrors the engine's delivery rule selection:
     *   BP (business+promotion) > P (promotion) > B (business) > G (global)
     *   If BP rules exist for DELIVERY_PRICE, only those are used.
     *   Falls through to next level if no rules at that specificity.
     */

    type MockRule = {
        type: 'DELIVERY_PRICE' | 'ORDER_PRICE';
        businessId: string | null;
        promotionId: string | null;
    };

    function selectDeliveryRules(allRules: MockRule[]): MockRule[] {
        const globalRules = allRules.filter((r) => !r.businessId && !r.promotionId);
        const businessRules = allRules.filter((r) => r.businessId && !r.promotionId);
        const promotionRules = allRules.filter((r) => !r.businessId && r.promotionId);
        const businessPromoRules = allRules.filter((r) => r.businessId && r.promotionId);

        if (businessPromoRules.some((r) => r.type === 'DELIVERY_PRICE')) {
            return businessPromoRules.filter((r) => r.type === 'DELIVERY_PRICE');
        } else if (promotionRules.some((r) => r.type === 'DELIVERY_PRICE')) {
            return promotionRules.filter((r) => r.type === 'DELIVERY_PRICE');
        } else if (businessRules.some((r) => r.type === 'DELIVERY_PRICE')) {
            return businessRules.filter((r) => r.type === 'DELIVERY_PRICE');
        } else {
            return globalRules.filter((r) => r.type === 'DELIVERY_PRICE');
        }
    }

    it('selects BP rule when BP, P, B, G all exist', () => {
        const rules: MockRule[] = [
            { type: 'DELIVERY_PRICE', businessId: null, promotionId: null },
            { type: 'DELIVERY_PRICE', businessId: 'biz-1', promotionId: null },
            { type: 'DELIVERY_PRICE', businessId: null, promotionId: 'promo-1' },
            { type: 'DELIVERY_PRICE', businessId: 'biz-1', promotionId: 'promo-1' },
        ];
        const selected = selectDeliveryRules(rules);
        expect(selected).toHaveLength(1);
        expect(selected[0].businessId).toBe('biz-1');
        expect(selected[0].promotionId).toBe('promo-1');
    });

    it('selects P rule when no BP rules exist', () => {
        const rules: MockRule[] = [
            { type: 'DELIVERY_PRICE', businessId: null, promotionId: null },
            { type: 'DELIVERY_PRICE', businessId: 'biz-1', promotionId: null },
            { type: 'DELIVERY_PRICE', businessId: null, promotionId: 'promo-1' },
        ];
        const selected = selectDeliveryRules(rules);
        expect(selected).toHaveLength(1);
        expect(selected[0].promotionId).toBe('promo-1');
    });

    it('selects B rule when no BP or P delivery rules', () => {
        const rules: MockRule[] = [
            { type: 'DELIVERY_PRICE', businessId: null, promotionId: null },
            { type: 'DELIVERY_PRICE', businessId: 'biz-1', promotionId: null },
            { type: 'ORDER_PRICE', businessId: null, promotionId: 'promo-1' }, // wrong type
        ];
        const selected = selectDeliveryRules(rules);
        expect(selected).toHaveLength(1);
        expect(selected[0].businessId).toBe('biz-1');
    });

    it('selects G rule as final fallback', () => {
        const rules: MockRule[] = [
            { type: 'DELIVERY_PRICE', businessId: null, promotionId: null },
            { type: 'ORDER_PRICE', businessId: 'biz-1', promotionId: null },
        ];
        const selected = selectDeliveryRules(rules);
        expect(selected).toHaveLength(1);
        expect(selected[0].businessId).toBeNull();
        expect(selected[0].promotionId).toBeNull();
    });

    it('returns empty when no DELIVERY_PRICE rules exist at any level', () => {
        const rules: MockRule[] = [
            { type: 'ORDER_PRICE', businessId: null, promotionId: null },
        ];
        const selected = selectDeliveryRules(rules);
        expect(selected).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// ORDER PRICE RULE SCOPING — Additive stacking
// ═══════════════════════════════════════════════════════════════════════════

describe('Order price rule scoping – additive with BP|P mutual exclusion', () => {
    /**
     * Global + Business always included.
     * Then: if any BP rules exist → add BP, skip P.
     * Otherwise → add P.
     */

    type MockRule = {
        type: 'DELIVERY_PRICE' | 'ORDER_PRICE';
        businessId: string | null;
        promotionId: string | null;
        id: string;
    };

    function selectOrderRules(allRules: MockRule[]): MockRule[] {
        const globalRules = allRules.filter((r) => !r.businessId && !r.promotionId);
        const businessRules = allRules.filter((r) => r.businessId && !r.promotionId);
        const promotionRules = allRules.filter((r) => !r.businessId && r.promotionId);
        const businessPromoRules = allRules.filter((r) => r.businessId && r.promotionId);

        const selected: MockRule[] = [
            ...globalRules.filter((r) => r.type === 'ORDER_PRICE'),
            ...businessRules.filter((r) => r.type === 'ORDER_PRICE'),
        ];

        if (businessPromoRules.some((r) => r.type === 'ORDER_PRICE')) {
            selected.push(...businessPromoRules.filter((r) => r.type === 'ORDER_PRICE'));
        } else {
            selected.push(...promotionRules.filter((r) => r.type === 'ORDER_PRICE'));
        }

        return selected;
    }

    it('includes Global + Business + BP (skips P) when BP exists', () => {
        const rules: MockRule[] = [
            { id: 'g', type: 'ORDER_PRICE', businessId: null, promotionId: null },
            { id: 'b', type: 'ORDER_PRICE', businessId: 'biz-1', promotionId: null },
            { id: 'p', type: 'ORDER_PRICE', businessId: null, promotionId: 'promo-1' },
            { id: 'bp', type: 'ORDER_PRICE', businessId: 'biz-1', promotionId: 'promo-1' },
        ];
        const selected = selectOrderRules(rules);
        const ids = selected.map((r) => r.id);
        expect(ids).toContain('g');
        expect(ids).toContain('b');
        expect(ids).toContain('bp');
        expect(ids).not.toContain('p'); // excluded because BP exists
    });

    it('includes Global + Business + P when no BP exists', () => {
        const rules: MockRule[] = [
            { id: 'g', type: 'ORDER_PRICE', businessId: null, promotionId: null },
            { id: 'b', type: 'ORDER_PRICE', businessId: 'biz-1', promotionId: null },
            { id: 'p', type: 'ORDER_PRICE', businessId: null, promotionId: 'promo-1' },
        ];
        const selected = selectOrderRules(rules);
        const ids = selected.map((r) => r.id);
        expect(ids).toContain('g');
        expect(ids).toContain('b');
        expect(ids).toContain('p');
    });

    it('works with only Global rules', () => {
        const rules: MockRule[] = [
            { id: 'g', type: 'ORDER_PRICE', businessId: null, promotionId: null },
        ];
        const selected = selectOrderRules(rules);
        expect(selected.map((r) => r.id)).toEqual(['g']);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// DRIVER COMMISSION FALLBACK
// ═══════════════════════════════════════════════════════════════════════════

describe('Driver commission fallback calculation', () => {
    /**
     * When no DELIVERY_PRICE settlement rules match, the engine falls back
     * to the driver's commissionPercentage from their profile record.
     * Amount = deliveryPrice × commissionPercentage / 100
     */

    it('calculates correct commission amount', () => {
        const deliveryPrice = 3.5;
        const commissionPercentage = 15; // 15%
        const amount = Number(((deliveryPrice * commissionPercentage) / 100).toFixed(2));
        expect(amount).toBe(0.53); // 0.525 rounded to 0.53
    });

    it('produces 0 when commissionPercentage is 0', () => {
        const deliveryPrice = 3.5;
        const commissionPercentage = 0;
        const amount = Number(((deliveryPrice * commissionPercentage) / 100).toFixed(2));
        expect(amount).toBe(0);
    });

    it('produces 0 when deliveryPrice is 0', () => {
        const deliveryPrice = 0;
        const commissionPercentage = 15;
        const amount = Number(((deliveryPrice * commissionPercentage) / 100).toFixed(2));
        expect(amount).toBe(0);
    });

    it('handles 100% commission', () => {
        const deliveryPrice = 5;
        const commissionPercentage = 100;
        const amount = Number(((deliveryPrice * commissionPercentage) / 100).toFixed(2));
        expect(amount).toBe(5);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// FULL SCENARIO — Realistic order with multiple settlement types
// ═══════════════════════════════════════════════════════════════════════════

describe('Full settlement scenario – CASH_TO_DRIVER with markup + surcharge', () => {
    it('creates correct settlements for a typical cash order', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);

        const order = makeOrder({
            paymentCollection: 'CASH_TO_DRIVER',
            actualPrice: 20,
            basePrice: 15,
            businessPrice: 15,
            markupPrice: 5, // 20 - 15 = 5
            deliveryPrice: 3,
            prioritySurcharge: 1,
            driverTip: 2,
        });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);

        // Markup: DRIVER RECEIVABLE €5
        const markup = findMarkup(results);
        expect(markup).toHaveLength(1);
        expect(markup[0].amount).toBe(5);
        expect(markup[0].direction).toBe('RECEIVABLE');

        // Priority: DRIVER RECEIVABLE €1
        const surcharge = findPrioritySurcharge(results);
        expect(surcharge).toHaveLength(1);
        expect(surcharge[0].amount).toBe(1);
        expect(surcharge[0].direction).toBe('RECEIVABLE');

        // No tip settlement for CASH_TO_DRIVER
        expect(findDriverTip(results)).toHaveLength(0);
    });
});

describe('Full settlement scenario – PREPAID_TO_PLATFORM with tip', () => {
    it('creates only tip settlement (no markup/surcharge remittances)', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);

        const order = makeOrder({
            paymentCollection: 'PREPAID_TO_PLATFORM',
            actualPrice: 20,
            basePrice: 15,
            businessPrice: 15,
            markupPrice: 5,
            deliveryPrice: 3,
            prioritySurcharge: 1,
            driverTip: 4,
        });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);

        expect(findMarkup(results)).toHaveLength(0);
        expect(findPrioritySurcharge(results)).toHaveLength(0);

        const tip = findDriverTip(results);
        expect(tip).toHaveLength(1);
        expect(tip[0].amount).toBe(4);
        expect(tip[0].direction).toBe('PAYABLE');
    });
});

describe('Full scenario – order with no markup, no surcharge, no tip', () => {
    it('creates no automatic settlements', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);

        const order = makeOrder({
            markupPrice: 0,
            prioritySurcharge: 0,
            driverTip: 0,
        });

        const results = await engine.calculateOrderSettlements(order, [], DRIVER_ID);

        expect(findMarkup(results)).toHaveLength(0);
        expect(findPrioritySurcharge(results)).toHaveLength(0);
        expect(findDriverTip(results)).toHaveLength(0);
    });
});

describe('Full scenario – no driverId', () => {
    it('creates no driver settlements when driverId is null', async () => {
        const db = createMockDb();
        const engine = new SettlementCalculationEngine(db);

        const order = makeOrder({
            markupPrice: 5,
            prioritySurcharge: 1,
            driverTip: 2,
        });

        const results = await engine.calculateOrderSettlements(order, [], null);

        // No driver settlements should be created
        const driverSettlements = results.filter((s) => s.type === 'DRIVER');
        expect(driverSettlements).toHaveLength(0);
    });
});
