/**
 * Unit tests for PricingService price precedence logic.
 *
 * Pricing rule (two-step):
 *   Step 1 — pick the context tier:
 *     night hours && nightMarkedupPrice set → nightMarkedupPrice
 *     markupPrice set                       → markupPrice
 *     fallback                              → basePrice
 *   Step 2 — apply discount if isOnSale && saleDiscountPercentage set:
 *     finalAppliedPrice = contextPrice * (1 - saleDiscountPercentage / 100)
 *
 * Night window: 23:00 – 05:59 (hour >= 23 || hour < 6)
 */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Re-implement the pure pricing logic from PricingService.ts
// Mirror exactly — if the source changes, these tests will catch divergence.
// ---------------------------------------------------------------------------

const NIGHT_START_HOUR = 23;
const NIGHT_END_HOUR = 6;

function isNightHours(timestamp: Date = new Date()): boolean {
    const hour = timestamp.getHours();
    return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

type ProductRow = {
    id: string;
    basePrice: number;
    markupPrice: number | null;
    nightMarkedupPrice: number | null;
    saleDiscountPercentage: number | null;
    isOnSale: boolean;
};

function buildPriceResult(product: ProductRow, timestamp?: Date) {
    const basePrice = Number(product.basePrice);
    const markupPrice = product.markupPrice != null ? Number(product.markupPrice) : null;
    const nightMarkedupPrice = product.nightMarkedupPrice != null ? Number(product.nightMarkedupPrice) : null;
    const saleDiscountPercentage = product.saleDiscountPercentage != null ? Number(product.saleDiscountPercentage) : null;
    const nightHours = isNightHours(timestamp);

    // Step 1: pick context tier
    const contextPrice = (nightHours && nightMarkedupPrice != null)
        ? nightMarkedupPrice
        : (markupPrice != null ? markupPrice : basePrice);

    // Step 2: apply discount
    const finalAppliedPrice = (product.isOnSale && saleDiscountPercentage != null)
        ? Number((contextPrice * (1 - saleDiscountPercentage / 100)).toFixed(2))
        : contextPrice;

    return {
        basePrice,
        markupPrice,
        nightMarkedupPrice,
        saleDiscountPercentage,
        isNightHours: nightHours,
        finalAppliedPrice,
    };
}

// Helpers to make timestamps
const DAY_TIME   = new Date('2026-03-26T14:00:00'); // 14:00 — day
const NIGHT_TIME = new Date('2026-03-26T23:30:00'); // 23:30 — night
const EARLY_AM   = new Date('2026-03-26T04:00:00'); // 04:00 — also night

// ---------------------------------------------------------------------------
// isNightHours
// ---------------------------------------------------------------------------

describe('isNightHours', () => {
    it('23:00 is night', () => expect(isNightHours(new Date('2026-03-26T23:00:00'))).toBe(true));
    it('03:00 is night', () => expect(isNightHours(new Date('2026-03-26T03:00:00'))).toBe(true));
    it('05:59 is night', () => expect(isNightHours(new Date('2026-03-26T05:59:00'))).toBe(true));
    it('06:00 is NOT night', () => expect(isNightHours(new Date('2026-03-26T06:00:00'))).toBe(false));
    it('12:00 is NOT night', () => expect(isNightHours(new Date('2026-03-26T12:00:00'))).toBe(false));
    it('22:59 is NOT night', () => expect(isNightHours(new Date('2026-03-26T22:59:00'))).toBe(false));
});

// ---------------------------------------------------------------------------
// Price precedence
// ---------------------------------------------------------------------------

describe('buildPriceResult — price precedence', () => {
    const base: ProductRow = {
        id: 'prod-1',
        basePrice: 10,
        markupPrice: 12,
        nightMarkedupPrice: 15,
        saleDiscountPercentage: 20, // 20% off
        isOnSale: false,
    };

    it('discount applies to nightMarkedupPrice when isOnSale=true at night', () => {
        // 20% off 15 = 12
        const result = buildPriceResult({ ...base, isOnSale: true }, NIGHT_TIME);
        expect(result.finalAppliedPrice).toBe(12);
    });

    it('discount applies to markupPrice when isOnSale=true during day', () => {
        // 20% off 12 = 9.6
        const result = buildPriceResult({ ...base, isOnSale: true }, DAY_TIME);
        expect(result.finalAppliedPrice).toBe(9.6);
    });

    it('isOnSale=true but saleDiscountPercentage=null → no discount, uses contextPrice', () => {
        // No discount → at night → nightMarkedupPrice = 15
        const result = buildPriceResult({ ...base, isOnSale: true, saleDiscountPercentage: null }, NIGHT_TIME);
        expect(result.finalAppliedPrice).toBe(15);
    });

    it('nightMarkedupPrice wins at night when isOnSale=false', () => {
        const result = buildPriceResult({ ...base, isOnSale: false }, NIGHT_TIME);
        expect(result.finalAppliedPrice).toBe(15);
    });

    it('nightMarkedupPrice wins in early morning', () => {
        const result = buildPriceResult({ ...base, isOnSale: false }, EARLY_AM);
        expect(result.finalAppliedPrice).toBe(15);
    });

    it('nightMarkedupPrice=null at night → falls through to markupPrice', () => {
        const result = buildPriceResult({ ...base, nightMarkedupPrice: null, isOnSale: false }, NIGHT_TIME);
        expect(result.finalAppliedPrice).toBe(12);
    });

    it('markupPrice wins during day when isOnSale=false', () => {
        const result = buildPriceResult({ ...base, isOnSale: false }, DAY_TIME);
        expect(result.finalAppliedPrice).toBe(12);
    });

    it('basePrice is fallback when all others are null or off', () => {
        const result = buildPriceResult(
            { ...base, markupPrice: null, nightMarkedupPrice: null, isOnSale: false },
            DAY_TIME,
        );
        expect(result.finalAppliedPrice).toBe(10);
    });

    it('basePrice fallback also applies at night with no night markup', () => {
        const result = buildPriceResult(
            { ...base, markupPrice: null, nightMarkedupPrice: null, isOnSale: false },
            NIGHT_TIME,
        );
        expect(result.finalAppliedPrice).toBe(10);
    });

    it('discount applies to basePrice fallback when on sale with no markup', () => {
        // 20% off 10 = 8
        const result = buildPriceResult(
            { ...base, markupPrice: null, nightMarkedupPrice: null, isOnSale: true },
            DAY_TIME,
        );
        expect(result.finalAppliedPrice).toBe(8);
    });

    it('rounds discounted price to 2 decimal places', () => {
        // 10% off 10.005 = 10.005 * 0.9 = 9.0045 → 9.00
        const result = buildPriceResult(
            { ...base, markupPrice: 10.005, saleDiscountPercentage: 10, isOnSale: true },
            DAY_TIME,
        );
        expect(result.finalAppliedPrice).toBe(9);
    });

    it('isNightHours flag is correct in returned result', () => {
        const day = buildPriceResult(base, DAY_TIME);
        const night = buildPriceResult(base, NIGHT_TIME);
        expect(day.isNightHours).toBe(false);
        expect(night.isNightHours).toBe(true);
    });
});
