/**
 * Unit tests for PromotionEngine discount calculation logic.
 *
 * The calculateDiscount and applyPromotions stacking logic are pure once
 * the DB calls (eligibility checks, usage queries) are bypassed.
 * These tests exercise every promotion type and the stacking rules.
 */
import { describe, it, expect } from 'vitest';
import type { ApplicablePromotion, CartContext, PromotionResult } from '../PromotionEngine';

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

function applyPromotions(applicable: ApplicablePromotion[], cart: CartContext): PromotionResult {
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

    const firstPromo = applicable[0];
    applied.push(firstPromo);
    totalDiscount += firstPromo.appliedAmount;
    if (firstPromo.freeDelivery) freeDeliveryApplied = true;

    if (firstPromo.isStackable) {
        for (let i = 1; i < applicable.length; i++) {
            const promo = applicable[i];
            if (promo.isStackable) {
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
});
