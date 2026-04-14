/**
 * Unit tests for PromotionEngine discount calculation logic.
 *
 * The calculateDiscount and applyPromotions stacking logic are pure once
 * the DB calls (eligibility checks, usage queries) are bypassed.
 * These tests exercise every promotion type and the stacking rules.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PromotionEngine, type ApplicablePromotion, type CartContext, type PromotionResult } from '../PromotionEngine';
import type { DbType } from '@/database';

// ---------------------------------------------------------------------------
// Mirror of PromotionEngine.calculateDiscount (private method)
// If the source changes, update here.
// ---------------------------------------------------------------------------

function calculateDiscount(promo: {
    type: string;
    discountValue?: number | null;
    maxDiscountCap?: number | null;
    spendThreshold?: number | null;
    thresholdReward?: { type: string } | null;
}, subtotal: number): number {
    let discount = 0;

    switch (promo.type) {
        case 'FIXED_AMOUNT':
            discount = Number(promo.discountValue || 0);
            break;

        case 'PERCENTAGE': {
            const percent = Number(promo.discountValue || 0);
            discount = (subtotal * percent) / 100;
            if (promo.maxDiscountCap) {
                discount = Math.min(discount, Number(promo.maxDiscountCap));
            }
            break;
        }

        case 'FREE_DELIVERY':
            discount = 0; // handled via freeDelivery flag
            break;

        case 'SPEND_X_GET_FREE':
            discount = 0;
            break;

        case 'SPEND_X_PERCENT': {
            const pct = Number(promo.discountValue || 0);
            discount = (subtotal * pct) / 100;
            if (promo.maxDiscountCap) discount = Math.min(discount, Number(promo.maxDiscountCap));
            break;
        }

        case 'SPEND_X_FIXED':
            discount = Number(promo.discountValue || 0);
            break;
    }

    return Math.min(discount, subtotal); // can't discount more than subtotal
}

// ---------------------------------------------------------------------------
// Mirror of PromotionEngine stacking logic (from applyPromotions)
// ---------------------------------------------------------------------------

function applyPromotions(
    applicable: ApplicablePromotion[],
    cart: CartContext,
    manualPromoCode?: string,
): PromotionResult {
    if (applicable.length === 0) {
        return {
            promotions: [],
            totalDiscount: 0,
            freeDeliveryApplied: false,
            finalSubtotal: cart.subtotal,
            finalDeliveryPrice: cart.deliveryPrice,
            finalTotal: cart.subtotal + cart.deliveryPrice,
        };
    }

    const applied: ApplicablePromotion[] = [];
    let totalDiscount = 0;
    let freeDeliveryApplied = false;

    const normalizedManualCode = manualPromoCode?.trim().toUpperCase();
    const firstPromo = normalizedManualCode
        ? applicable.find((promo) => promo.code === normalizedManualCode) ?? applicable[0]
        : applicable[0];

    if (!firstPromo) {
        return {
            promotions: [],
            totalDiscount: 0,
            freeDeliveryApplied: false,
            finalSubtotal: cart.subtotal,
            finalDeliveryPrice: cart.deliveryPrice,
            finalTotal: cart.subtotal + cart.deliveryPrice,
        };
    }

    applied.push(firstPromo);
    totalDiscount += firstPromo.appliedAmount;
    if (firstPromo.freeDelivery) freeDeliveryApplied = true;

    if (firstPromo.isStackable) {
        for (const promo of applicable) {
            if (promo.id === firstPromo.id) continue;
            if (promo.isStackable) {
                if (promo.freeDelivery && freeDeliveryApplied) continue;
                applied.push(promo);
                totalDiscount += promo.appliedAmount;
                if (promo.freeDelivery) freeDeliveryApplied = true;
            }
        }
    }

    const finalSubtotal = Math.max(0, cart.subtotal - totalDiscount);
    const finalDeliveryPrice = freeDeliveryApplied ? 0 : cart.deliveryPrice;
    const finalTotal = finalSubtotal + finalDeliveryPrice;

    return { promotions: applied, totalDiscount, freeDeliveryApplied, finalSubtotal, finalDeliveryPrice, finalTotal };
}

function makePromo(overrides: Partial<ApplicablePromotion>): ApplicablePromotion {
    return {
        id: 'promo-1',
        code: null,
        name: 'Test Promo',
        type: 'FIXED_AMOUNT',
        target: 'ALL_USERS',
        discountValue: null,
        maxDiscountCap: null,
        freeDelivery: false,
        priority: 1,
        isStackable: false,
        appliedAmount: 0,
        ...overrides,
    };
}

const cart: CartContext = {
    items: [],
    subtotal: 50,
    deliveryPrice: 3,
    businessIds: ['biz-1'],
};

afterEach(() => {
    vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// calculateDiscount — each type
// ---------------------------------------------------------------------------

describe('calculateDiscount — FIXED_AMOUNT', () => {
    it('returns the fixed value regardless of subtotal', () => {
        expect(calculateDiscount({ type: 'FIXED_AMOUNT', discountValue: 5 }, 50)).toBe(5);
        expect(calculateDiscount({ type: 'FIXED_AMOUNT', discountValue: 5 }, 100)).toBe(5);
    });

    it('is capped at the subtotal — cannot create negative total', () => {
        expect(calculateDiscount({ type: 'FIXED_AMOUNT', discountValue: 200 }, 50)).toBe(50);
    });
});

describe('calculateDiscount — PERCENTAGE', () => {
    it('calculates correct percentage of subtotal', () => {
        expect(calculateDiscount({ type: 'PERCENTAGE', discountValue: 10 }, 200)).toBe(20);
    });

    it('respects maxDiscountCap', () => {
        // 50% of 200 = 100, but capped at 30
        expect(calculateDiscount({ type: 'PERCENTAGE', discountValue: 50, maxDiscountCap: 30 }, 200)).toBe(30);
    });

    it('does not cap when discount is below the cap', () => {
        // 10% of 100 = 10, cap is 50 — no cap applies
        expect(calculateDiscount({ type: 'PERCENTAGE', discountValue: 10, maxDiscountCap: 50 }, 100)).toBe(10);
    });

    it('0% discount returns 0', () => {
        expect(calculateDiscount({ type: 'PERCENTAGE', discountValue: 0 }, 100)).toBe(0);
    });
});

describe('calculateDiscount — FREE_DELIVERY', () => {
    it('returns 0 discount on subtotal (delivery handled by freeDelivery flag)', () => {
        expect(calculateDiscount({ type: 'FREE_DELIVERY' }, 50)).toBe(0);
    });
});

describe('calculateDiscount — SPEND_X_GET_FREE', () => {
    it('returns 0 (free item/delivery handled separately)', () => {
        expect(calculateDiscount({ type: 'SPEND_X_GET_FREE' }, 80)).toBe(0);
    });
});

describe('calculateDiscount — SPEND_X_PERCENT', () => {
    it('calculates percentage with cap', () => {
        // 20% of 100 = 20, cap 15
        expect(calculateDiscount({ type: 'SPEND_X_PERCENT', discountValue: 20, maxDiscountCap: 15 }, 100)).toBe(15);
    });

    it('calculates percentage without cap', () => {
        expect(calculateDiscount({ type: 'SPEND_X_PERCENT', discountValue: 10, maxDiscountCap: null }, 100)).toBe(10);
    });
});

describe('calculateDiscount — SPEND_X_FIXED', () => {
    it('returns fixed discount value', () => {
        expect(calculateDiscount({ type: 'SPEND_X_FIXED', discountValue: 7 }, 100)).toBe(7);
    });
});

// ---------------------------------------------------------------------------
// applyPromotions — stacking logic
// ---------------------------------------------------------------------------

describe('applyPromotions stacking', () => {
    it('returns unchanged cart when no promotions', () => {
        const result = applyPromotions([], cart);
        expect(result.totalDiscount).toBe(0);
        expect(result.finalTotal).toBe(53);
        expect(result.freeDeliveryApplied).toBe(false);
    });

    it('applies a single non-stackable promo', () => {
        const promos = [makePromo({ appliedAmount: 10, isStackable: false })];
        const result = applyPromotions(promos, cart);
        expect(result.totalDiscount).toBe(10);
        expect(result.finalSubtotal).toBe(40);
        expect(result.finalTotal).toBe(43); // 40 subtotal + 3 delivery
    });

    it('does not stack a second promo when first is non-stackable', () => {
        const promos = [
            makePromo({ id: 'p1', appliedAmount: 10, isStackable: false }),
            makePromo({ id: 'p2', appliedAmount: 5,  isStackable: true  }),
        ];
        const result = applyPromotions(promos, cart);
        expect(result.promotions).toHaveLength(1);
        expect(result.totalDiscount).toBe(10);
    });

    it('stacks two stackable promos', () => {
        const promos = [
            makePromo({ id: 'p1', appliedAmount: 10, isStackable: true }),
            makePromo({ id: 'p2', appliedAmount: 5,  isStackable: true }),
        ];
        const result = applyPromotions(promos, cart);
        expect(result.promotions).toHaveLength(2);
        expect(result.totalDiscount).toBe(15);
        expect(result.finalSubtotal).toBe(35);
    });

    it('does not stack a non-stackable second promo even when first is stackable', () => {
        const promos = [
            makePromo({ id: 'p1', appliedAmount: 10, isStackable: true  }),
            makePromo({ id: 'p2', appliedAmount: 5,  isStackable: false }),
        ];
        const result = applyPromotions(promos, cart);
        expect(result.promotions).toHaveLength(1);
        expect(result.totalDiscount).toBe(10);
    });

    it('sets freeDelivery and zeroes delivery price', () => {
        const promos = [makePromo({ appliedAmount: 0, freeDelivery: true, isStackable: false })];
        const result = applyPromotions(promos, cart);
        expect(result.freeDeliveryApplied).toBe(true);
        expect(result.finalDeliveryPrice).toBe(0);
        expect(result.finalTotal).toBe(50); // subtotal unchanged, delivery 0
    });

    it('finalSubtotal never goes below 0', () => {
        // discount larger than subtotal
        const promos = [makePromo({ appliedAmount: 999, isStackable: false })];
        const result = applyPromotions(promos, cart);
        expect(result.finalSubtotal).toBe(0);
    });

    it('keeps only one free-delivery promo when stacking', () => {
        const promos = [
            makePromo({ id: 'fd-1', freeDelivery: true, appliedAmount: 0, isStackable: true }),
            makePromo({ id: 'fd-2', freeDelivery: true, appliedAmount: 0, isStackable: true }),
            makePromo({ id: 'd-1', freeDelivery: false, appliedAmount: 5, isStackable: true }),
        ];
        const result = applyPromotions(promos, cart);
        expect(result.promotions.map((p) => p.id)).toEqual(['fd-1', 'd-1']);
        expect(result.freeDeliveryApplied).toBe(true);
        expect(result.finalDeliveryPrice).toBe(0);
        expect(result.totalDiscount).toBe(5);
    });

    it('prefers manual code promo as first promo when present', () => {
        const promos = [
            makePromo({ id: 'auto', code: null, priority: 10, appliedAmount: 8, isStackable: true }),
            makePromo({ id: 'manual', code: 'SAVE5', priority: 1, appliedAmount: 5, isStackable: false }),
        ];
        const result = applyPromotions(promos, cart, 'save5');
        expect(result.promotions).toHaveLength(1);
        expect(result.promotions[0]?.id).toBe('manual');
        expect(result.totalDiscount).toBe(5);
    });
});

describe('PromotionEngine.applySelectedPromotions', () => {
    it('rejects when any selected promotion is no longer applicable', async () => {
        const engine = new PromotionEngine({} as unknown as DbType);
        vi.spyOn(engine, 'getApplicablePromotions').mockResolvedValue([
            makePromo({ id: 'p1', isStackable: true, appliedAmount: 5 }),
        ]);

        await expect(
            engine.applySelectedPromotions('user-1', ['p1', 'p2'], cart),
        ).rejects.toThrow('One or more selected promotions are no longer valid');
    });

    it('rejects non-combinable selections when one promo is non-stackable', async () => {
        const engine = new PromotionEngine({} as unknown as DbType);
        vi.spyOn(engine, 'getApplicablePromotions').mockResolvedValue([
            makePromo({ id: 'p1', priority: 50, isStackable: false, appliedAmount: 10 }),
            makePromo({ id: 'p2', priority: 20, isStackable: true, appliedAmount: 5 }),
        ]);

        await expect(
            engine.applySelectedPromotions('user-1', ['p1', 'p2'], cart),
        ).rejects.toThrow('Selected promotions cannot be combined');
    });

    it('rejects multiple free-delivery selections', async () => {
        const engine = new PromotionEngine({} as unknown as DbType);
        vi.spyOn(engine, 'getApplicablePromotions').mockResolvedValue([
            makePromo({ id: 'fd-1', priority: 40, isStackable: true, freeDelivery: true, appliedAmount: 0 }),
            makePromo({ id: 'fd-2', priority: 30, isStackable: true, freeDelivery: true, appliedAmount: 0 }),
        ]);

        await expect(
            engine.applySelectedPromotions('user-1', ['fd-1', 'fd-2'], cart),
        ).rejects.toThrow('Multiple free-delivery promotions cannot be combined');
    });

    it('applies valid stackable selected promotions in priority order', async () => {
        const engine = new PromotionEngine({} as unknown as DbType);
        vi.spyOn(engine, 'getApplicablePromotions').mockResolvedValue([
            makePromo({ id: 'low', priority: 10, isStackable: true, appliedAmount: 4 }),
            makePromo({ id: 'high', priority: 100, isStackable: true, appliedAmount: 9 }),
        ]);

        const result = await engine.applySelectedPromotions('user-1', ['low', 'high'], cart);

        expect(result.promotions.map((p) => p.id)).toEqual(['high', 'low']);
        expect(result.totalDiscount).toBe(13);
        expect(result.finalSubtotal).toBe(37);
        expect(result.finalDeliveryPrice).toBe(3);
        expect(result.finalTotal).toBe(40);
    });

    it('guards final subtotal from going below zero', async () => {
        const engine = new PromotionEngine({} as unknown as DbType);
        vi.spyOn(engine, 'getApplicablePromotions').mockResolvedValue([
            makePromo({ id: 'p1', priority: 10, isStackable: true, appliedAmount: 40 }),
            makePromo({ id: 'p2', priority: 5, isStackable: true, appliedAmount: 30 }),
        ]);

        const result = await engine.applySelectedPromotions('user-1', ['p1', 'p2'], cart);

        expect(result.totalDiscount).toBe(70);
        expect(result.finalSubtotal).toBe(0);
        expect(result.finalTotal).toBe(3);
    });
});
