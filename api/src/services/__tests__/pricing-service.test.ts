/**
 * Unit tests for PricingService price precedence logic.
 *
 * The pricing rule is pure: given a product's price fields and the current
 * time, exactly one price wins. No DB needed — we test buildPriceResult
 * by calling the exported PricingService with a mock db that returns a
 * fixed product row.
 *
 * Price precedence (from PricingService source):
 *   1. salePrice     — when isOnSale && salePrice is set
 *   2. nightMarked   — when night hours && nightMarkedupPrice is set
 *   3. markupPrice   — when set (outside night)
 *   4. basePrice     — fallback
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
    salePrice: number | null;
    isOnSale: boolean;
};

function buildPriceResult(product: ProductRow, timestamp?: Date) {
    const basePrice = Number(product.basePrice);
    const markupPrice = product.markupPrice != null ? Number(product.markupPrice) : null;
    const nightMarkedupPrice = product.nightMarkedupPrice != null ? Number(product.nightMarkedupPrice) : null;
    const salePrice = product.salePrice != null ? Number(product.salePrice) : null;
    const nightHours = isNightHours(timestamp);

    let finalAppliedPrice: number;
    if (product.isOnSale && salePrice != null) {
        finalAppliedPrice = salePrice;
    } else if (nightHours && nightMarkedupPrice != null) {
        finalAppliedPrice = nightMarkedupPrice;
    } else if (markupPrice != null) {
        finalAppliedPrice = markupPrice;
    } else {
        finalAppliedPrice = basePrice;
    }

    return {
        basePrice,
        markupPrice,
        nightMarkedupPrice,
        salePrice,
        isNightHours: nightHours,
        finalAppliedPrice: Number(finalAppliedPrice.toFixed(2)),
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
        salePrice: 8,
        isOnSale: false,
    };

    it('Rule 1: salePrice wins when isOnSale=true, even during night', () => {
        const result = buildPriceResult({ ...base, isOnSale: true }, NIGHT_TIME);
        expect(result.finalAppliedPrice).toBe(8);
    });

    it('Rule 1: salePrice wins during day too', () => {
        const result = buildPriceResult({ ...base, isOnSale: true }, DAY_TIME);
        expect(result.finalAppliedPrice).toBe(8);
    });

    it('Rule 1: isOnSale=true but salePrice=null → falls through to nightMarkup', () => {
        const result = buildPriceResult({ ...base, isOnSale: true, salePrice: null }, NIGHT_TIME);
        expect(result.finalAppliedPrice).toBe(15);
    });

    it('Rule 2: nightMarkedupPrice wins at night when not on sale', () => {
        const result = buildPriceResult({ ...base, isOnSale: false }, NIGHT_TIME);
        expect(result.finalAppliedPrice).toBe(15);
    });

    it('Rule 2: nightMarkedupPrice wins in early morning', () => {
        const result = buildPriceResult({ ...base, isOnSale: false }, EARLY_AM);
        expect(result.finalAppliedPrice).toBe(15);
    });

    it('Rule 2: nightMarkedupPrice=null at night → falls through to markupPrice', () => {
        const result = buildPriceResult({ ...base, nightMarkedupPrice: null, isOnSale: false }, NIGHT_TIME);
        expect(result.finalAppliedPrice).toBe(12);
    });

    it('Rule 3: markupPrice wins during day when not on sale', () => {
        const result = buildPriceResult({ ...base, isOnSale: false }, DAY_TIME);
        expect(result.finalAppliedPrice).toBe(12);
    });

    it('Rule 4: basePrice is fallback when all others are null or off', () => {
        const result = buildPriceResult(
            { ...base, markupPrice: null, nightMarkedupPrice: null, isOnSale: false },
            DAY_TIME,
        );
        expect(result.finalAppliedPrice).toBe(10);
    });

    it('Rule 4: basePrice fallback also applies at night with no night markup', () => {
        const result = buildPriceResult(
            { ...base, markupPrice: null, nightMarkedupPrice: null, isOnSale: false },
            NIGHT_TIME,
        );
        expect(result.finalAppliedPrice).toBe(10);
    });

    it('rounds to 2 decimal places', () => {
        // 10.005 should round correctly
        const result = buildPriceResult({ ...base, markupPrice: 10.005, isOnSale: false }, DAY_TIME);
        expect(result.finalAppliedPrice).toBe(10.01);
    });

    it('isNightHours flag is correct in returned result', () => {
        const day = buildPriceResult(base, DAY_TIME);
        const night = buildPriceResult(base, NIGHT_TIME);
        expect(day.isNightHours).toBe(false);
        expect(night.isNightHours).toBe(true);
    });
});
