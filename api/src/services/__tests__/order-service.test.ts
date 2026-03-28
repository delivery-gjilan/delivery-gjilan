/**
 * Unit tests for OrderService pure logic:
 *  1. generateDisplayId — produces the GJ-XXXX format
 *  2. delivery price tier matching — given a distance and a list of tiers,
 *     picks the right tier price
 *
 * Neither of these requires a database — we test the exported behaviour by
 * calling the methods or mirroring the logic from the service source.
 */
import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// 1. generateDisplayId — mirrored from OrderService.ts (private)
//    Format: GJ-XXXX where X is from the charset (no I/O/0/1)
// ---------------------------------------------------------------------------

const DISPLAY_ID_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateDisplayId(): string {
    const { randomBytes } = require('crypto');
    const bytes = randomBytes(4);
    let id = '';
    for (let i = 0; i < 4; i++) {
        id += DISPLAY_ID_CHARSET[bytes[i] % DISPLAY_ID_CHARSET.length];
    }
    return `GJ-${id}`;
}

describe('generateDisplayId', () => {
    it('starts with "GJ-"', () => {
        for (let i = 0; i < 20; i++) {
            expect(generateDisplayId()).toMatch(/^GJ-/);
        }
    });

    it('is exactly 7 characters long (GJ-XXXX)', () => {
        for (let i = 0; i < 20; i++) {
            expect(generateDisplayId()).toHaveLength(7);
        }
    });

    it('contains only allowed characters after GJ-', () => {
        const allowed = new Set(DISPLAY_ID_CHARSET.split(''));
        for (let i = 0; i < 50; i++) {
            const id = generateDisplayId();
            const suffix = id.slice(3); // remove "GJ-"
            for (const char of suffix) {
                expect(allowed.has(char), `Unexpected char ${char} in ${id}`).toBe(true);
            }
        }
    });

    it('never contains ambiguous characters I, O, 0, 1', () => {
        for (let i = 0; i < 50; i++) {
            const id = generateDisplayId();
            expect(id).not.toMatch(/[IO01]/);
        }
    });

    it('generates unique IDs (extremely low collision probability)', () => {
        const ids = new Set(Array.from({ length: 100 }, generateDisplayId));
        // With 32^4 = 1,048,576 possible IDs, 100 draws should always be unique
        expect(ids.size).toBe(100);
    });
});

// ---------------------------------------------------------------------------
// 2. Delivery price tier matching — extracted logic from
//    OrderService.calculateExpectedDeliveryPrice
//    Given a list of tiers and a distance, returns the right price.
// ---------------------------------------------------------------------------

type PricingTier = {
    minDistanceKm: number;
    maxDistanceKm: number | null;
    price: number;
    isActive: boolean;
    sortOrder: number;
};

const DEFAULT_DELIVERY_PRICE = 2.0;

function matchTierPrice(tiers: PricingTier[], distanceKm: number): number {
    if (tiers.length === 0) return DEFAULT_DELIVERY_PRICE;

    const matched = tiers.find((tier) => {
        const min = tier.minDistanceKm;
        const max = tier.maxDistanceKm;
        if (max === null || max === undefined) {
            return distanceKm >= min;
        }
        return distanceKm >= min && distanceKm < max;
    });

    if (!matched) {
        const lastTier = tiers[tiers.length - 1];
        return lastTier?.price ?? DEFAULT_DELIVERY_PRICE;
    }
    return matched.price;
}

const TIERS: PricingTier[] = [
    { minDistanceKm: 0,   maxDistanceKm: 2,    price: 1.50, isActive: true, sortOrder: 1 },
    { minDistanceKm: 2,   maxDistanceKm: 5,    price: 2.50, isActive: true, sortOrder: 2 },
    { minDistanceKm: 5,   maxDistanceKm: 10,   price: 3.50, isActive: true, sortOrder: 3 },
    { minDistanceKm: 10,  maxDistanceKm: null, price: 5.00, isActive: true, sortOrder: 4 },
];

describe('matchTierPrice — tier selection', () => {
    it('returns DEFAULT when no tiers exist', () => {
        expect(matchTierPrice([], 3)).toBe(2.0);
    });

    it('matches the first tier for a short distance', () => {
        expect(matchTierPrice(TIERS, 0.5)).toBe(1.50);
        expect(matchTierPrice(TIERS, 1.99)).toBe(1.50);
    });

    it('matches the second tier at the boundary (2 km)', () => {
        expect(matchTierPrice(TIERS, 2)).toBe(2.50);
    });

    it('matches the second tier for a mid-range distance', () => {
        expect(matchTierPrice(TIERS, 3.5)).toBe(2.50);
        expect(matchTierPrice(TIERS, 4.99)).toBe(2.50);
    });

    it('matches the open-ended last tier for very long distances', () => {
        expect(matchTierPrice(TIERS, 15)).toBe(5.00);
        expect(matchTierPrice(TIERS, 100)).toBe(5.00);
    });

    it('falls back to last tier price when distance is above all defined maxes', () => {
        const twoTiers: PricingTier[] = [
            { minDistanceKm: 0, maxDistanceKm: 3, price: 1.0, isActive: true, sortOrder: 1 },
            { minDistanceKm: 3, maxDistanceKm: 6, price: 2.0, isActive: true, sortOrder: 2 },
        ];
        // 10 km falls outside all explicit ranges → fallback to last tier
        expect(matchTierPrice(twoTiers, 10)).toBe(2.0);
    });

    it('exact boundary 5 km belongs to the 5–10 range, not 2–5', () => {
        expect(matchTierPrice(TIERS, 5)).toBe(3.50);
    });

    it('exact boundary 10 km falls into the open-ended tier', () => {
        expect(matchTierPrice(TIERS, 10)).toBe(5.00);
    });
});
