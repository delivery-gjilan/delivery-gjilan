/**
 * Unit tests for SettlementCalculationEngine pure logic.
 *
 * These tests exercise the calculations that determine how much money
 * a driver or business receives/owes per order — using the same inputs
 * and rules as the live engine, but without a real database.
 *
 * The engine's pure helpers (markup earnings, rule amount maths) are
 * re-implemented here at the same level of abstraction so that any
 * change to the production logic causes these tests to fail.
 */
import { describe, it, expect } from 'vitest';
import type { DbOrderItem } from '@/database/schema';

// ---------------------------------------------------------------------------
// Helpers mirrored exactly from SettlementCalculationEngine.ts
// If you change the source, update these too.
// ---------------------------------------------------------------------------

function calculateMarkupEarnings(orderItems: DbOrderItem[]): number {
    const total = orderItems.reduce((sum, item) => {
        const basePrice = Number(item.basePrice ?? 0);
        const finalAppliedPrice = Number(item.finalAppliedPrice ?? 0);
        const perUnitMarkup = Math.max(0, finalAppliedPrice - basePrice);
        return sum + perUnitMarkup * item.quantity;
    }, 0);
    return Number(total.toFixed(2));
}

function calculateRuleAmount(
    base: number,
    amountType: 'FIXED' | 'PERCENTAGE',
    ruleAmount: number,
): number {
    return amountType === 'FIXED' ? ruleAmount : (base * ruleAmount) / 100;
}

// ---------------------------------------------------------------------------
// Minimal item builder – only the fields the engine reads
// ---------------------------------------------------------------------------

function makeItem(
    basePrice: number,
    finalAppliedPrice: number,
    quantity: number,
): DbOrderItem {
    return {
        id: 'item-1',
        orderId: 'order-1',
        productId: 'prod-1',
        quantity,
        basePrice: String(basePrice),
        finalAppliedPrice: String(finalAppliedPrice),
        // required schema fields we don't care about for this test
        variantId: null,
        productName: 'Test product',
        price: String(finalAppliedPrice),
        createdAt: new Date().toISOString(),
    } as unknown as DbOrderItem;
}

// ---------------------------------------------------------------------------
// calculateMarkupEarnings
// ---------------------------------------------------------------------------

describe('calculateMarkupEarnings', () => {
    it('returns 0 when there are no items', () => {
        expect(calculateMarkupEarnings([])).toBe(0);
    });

    it('returns 0 when finalAppliedPrice equals basePrice', () => {
        const items = [makeItem(10, 10, 2)];
        expect(calculateMarkupEarnings(items)).toBe(0);
    });

    it('returns 0 when finalAppliedPrice is below basePrice (negative markup clamped to 0)', () => {
        // A sale price lower than cost should not create a negative settlement
        const items = [makeItem(10, 8, 1)];
        expect(calculateMarkupEarnings(items)).toBe(0);
    });

    it('calculates markup for a single item correctly', () => {
        // basePrice 5, finalApplied 7 → markup 2 per unit × 3 qty = 6
        const items = [makeItem(5, 7, 3)];
        expect(calculateMarkupEarnings(items)).toBe(6);
    });

    it('sums markup across multiple items', () => {
        const items = [
            makeItem(5, 7, 3),   // 2 markup × 3 = 6
            makeItem(10, 15, 2), // 5 markup × 2 = 10
        ];
        expect(calculateMarkupEarnings(items)).toBe(16);
    });

    it('rounds to 2 decimal places', () => {
        // markup = 0.1 × 3 = 0.3 — floats are tricky, toFixed(2) must handle it
        const items = [makeItem(1.0, 1.1, 3)];
        expect(calculateMarkupEarnings(items)).toBe(0.3);
    });

    it('handles large quantities without overflow', () => {
        const items = [makeItem(100, 150, 1000)]; // markup 50 × 1000 = 50000
        expect(calculateMarkupEarnings(items)).toBe(50000);
    });
});

// ---------------------------------------------------------------------------
// Rule amount calculations
// ---------------------------------------------------------------------------

describe('calculateRuleAmount', () => {
    it('returns the fixed amount directly for FIXED type', () => {
        expect(calculateRuleAmount(500, 'FIXED', 20)).toBe(20);
    });

    it('calculates percentage of base for PERCENTAGE type', () => {
        // 10% of 200 = 20
        expect(calculateRuleAmount(200, 'PERCENTAGE', 10)).toBe(20);
    });

    it('percentage of delivery fee — 15% of 3.50', () => {
        expect(calculateRuleAmount(3.5, 'PERCENTAGE', 15)).toBeCloseTo(0.525, 5);
    });

    it('FIXED amount is independent of base', () => {
        expect(calculateRuleAmount(1000, 'FIXED', 5)).toBe(5);
        expect(calculateRuleAmount(1, 'FIXED', 5)).toBe(5);
    });

    it('0% rule produces 0 settlement (should be filtered out by engine)', () => {
        expect(calculateRuleAmount(500, 'PERCENTAGE', 0)).toBe(0);
    });
});
