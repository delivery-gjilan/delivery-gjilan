/**
 * Order Pricing Integration Tests
 *
 * Tests the full OrderService.createOrder pipeline: validates that price fields
 * on the order and order_items rows are computed correctly for every product type.
 *
 * Each test calls createOrder() then reads the DB rows directly to assert the
 * exact values stored.  This verifies the pricing tier selection, discount logic,
 * option extras, markup split, and promotion discount application.
 *
 * Run:
 *   cd api && npx vitest run --config vitest.integration.config.ts order-pricing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDB } from '@/database';
import { OrderFlowHarness, IDS, DELIVERY_PRICE, PRIORITY_SURCHARGE } from './harness';

let h: OrderFlowHarness;

beforeAll(async () => {
    const db = await getDB();
    h = new OrderFlowHarness(db);
    await h.seed();
});

afterAll(async () => {
    await h.cleanup();
});

// ---------------------------------------------------------------------------
// 1. Basic product — no markup tier, no discount
// ---------------------------------------------------------------------------

describe('basic product (no markup)', () => {
    it('charges basePrice as finalAppliedPrice', async () => {
        const order = await h.createOrder({
            items: [{ productId: IDS.basicProduct, quantity: 2 }],
        });

        const dbOrder = await h.getOrderFromDb(order.id);
        const dbItems = await h.getOrderItemsFromDb(order.id);

        // Item-level assertions
        expect(dbItems).toHaveLength(1);
        expect(Number(dbItems[0].finalAppliedPrice)).toBe(10);
        expect(Number(dbItems[0].basePrice)).toBe(10);
        expect(dbItems[0].saleDiscountPercentage).toBeNull();

        // Order-level assertions
        expect(Number(dbOrder!.basePrice)).toBe(20);        // 10 × 2
        expect(Number(dbOrder!.markupPrice)).toBe(0);       // no markup tier → 0
        expect(Number(dbOrder!.actualPrice)).toBe(20);
        expect(Number(dbOrder!.deliveryPrice)).toBeCloseTo(DELIVERY_PRICE, 2);
    });
});

// ---------------------------------------------------------------------------
// 2. Markup product — daytime, no discount
// ---------------------------------------------------------------------------

describe('markup product (daytime)', () => {
    it('charges markupPrice and records markup split correctly', async () => {
        const order = await h.createOrder({
            items: [{ productId: IDS.markupProduct, quantity: 2 }],
        });

        const dbOrder = await h.getOrderFromDb(order.id);
        const dbItems = await h.getOrderItemsFromDb(order.id);

        // markupProduct: basePrice=10, markupPrice=13
        expect(Number(dbItems[0].finalAppliedPrice)).toBe(13);
        expect(Number(dbItems[0].basePrice)).toBe(10);   // snapshot of product's raw price

        // order.basePrice = discounted business base = 10×2 = 20
        // markupPrice = platform margin delta = (13-10)×2 = 6
        expect(Number(dbOrder!.basePrice)).toBe(20);
        expect(Number(dbOrder!.markupPrice)).toBe(6);
        expect(Number(dbOrder!.actualPrice)).toBe(26);
    });
});

// ---------------------------------------------------------------------------
// 3. Discount product — 20% off markupPrice
// ---------------------------------------------------------------------------

describe('discount product (isOnSale=true, saleDiscountPercentage=20)', () => {
    it('applies percentage discount to context price (markupPrice)', async () => {
        const order = await h.createOrder({
            items: [{ productId: IDS.discountProduct, quantity: 1 }],
        });

        const dbOrder = await h.getOrderFromDb(order.id);
        const dbItems = await h.getOrderItemsFromDb(order.id);

        // discountProduct: markupPrice=13, discount=20%
        // finalAppliedPrice = 13 × 0.80 = 10.40
        const expectedFinal = 10.40;
        expect(Number(dbItems[0].finalAppliedPrice)).toBeCloseTo(expectedFinal, 2);
        expect(Number(dbItems[0].saleDiscountPercentage)).toBe(20);

        // order.basePrice = discounted business base = 10 × 0.80 = 8.00
        // markupPrice = platform margin delta = (10.40 - 8.00) × 1 = 2.40
        expect(Number(dbOrder!.basePrice)).toBeCloseTo(8, 2);
        expect(Number(dbOrder!.markupPrice)).toBeCloseTo(2.40, 2);
    });

    it('stores the discount percentage snapshot in the order item', async () => {
        const order = await h.createOrder({
            items: [{ productId: IDS.discountProduct, quantity: 1 }],
        });
        const dbItems = await h.getOrderItemsFromDb(order.id);
        // Must record the discount pct at time of order so it can be audited later
        expect(Number(dbItems[0].saleDiscountPercentage)).toBe(20);
    });
});

// ---------------------------------------------------------------------------
// 4. Product with options — "Large" size adds €2
// ---------------------------------------------------------------------------

describe('product with options (extraPrice)', () => {
    it('adds option extraPrice to item total', async () => {
        const order = await h.createOrder({
            items: [
                {
                    productId: IDS.optionProduct,
                    quantity: 1,
                    selectedOptions: [
                        { optionGroupId: IDS.optionGroupSize, optionId: IDS.optionLarge },
                    ],
                },
            ],
        });

        const dbOrder = await h.getOrderFromDb(order.id);
        const dbItems = await h.getOrderItemsFromDb(order.id);

        // optionProduct: base=8, markup=10, +2 (Large) → customer pays 12
        expect(Number(dbItems[0].finalAppliedPrice)).toBe(10);  // product price before options
        // order.basePrice = discounted business base + options = 8 + 2 = 10
        expect(Number(dbOrder!.basePrice)).toBe(10);
        // Markup split: (10 - 8) × 1 = 2  (options extra not included in markup calc)
        expect(Number(dbOrder!.markupPrice)).toBe(2);
    });

    it('does not add extra when "Regular" (€0) option is chosen', async () => {
        const order = await h.createOrder({
            items: [
                {
                    productId: IDS.optionProduct,
                    quantity: 1,
                    selectedOptions: [
                        { optionGroupId: IDS.optionGroupSize, optionId: IDS.optionRegular },
                    ],
                },
            ],
        });
        const dbOrder = await h.getOrderFromDb(order.id);
        expect(Number(dbOrder!.basePrice)).toBe(8);  // business base, no extra
    });
});

// ---------------------------------------------------------------------------
// 5. Priority surcharge
// ---------------------------------------------------------------------------

describe('priority surcharge', () => {
    it('stores prioritySurcharge=0.50 on the order', async () => {
        const order = await h.createOrder({
            items: [{ productId: IDS.markupProduct, quantity: 1 }],
            priority: true,
        });

        const dbOrder = await h.getOrderFromDb(order.id);
        expect(Number(dbOrder!.prioritySurcharge)).toBeCloseTo(PRIORITY_SURCHARGE, 2);
    });

    it('total price includes the surcharge', async () => {
        const order = await h.createOrder({
            items: [{ productId: IDS.markupProduct, quantity: 1 }],
            priority: true,
        });
        const dbOrder = await h.getOrderFromDb(order.id);
        // actualPrice(13) + delivery(2.50) + surcharge(0.50) = 16.00
        const expectedTotal = Number(dbOrder!.actualPrice) + Number(dbOrder!.deliveryPrice) + Number(dbOrder!.prioritySurcharge);
        expect(expectedTotal).toBeCloseTo(16, 2);
    });
});

// ---------------------------------------------------------------------------
// 6. Platform FREE_DELIVERY promotion
// ---------------------------------------------------------------------------

describe('platform FREE_DELIVERY promotion', () => {
    it('sets deliveryPrice to 0 and records an order_promotions row', async () => {
        const order = await h.createOrder({
            items: [{ productId: IDS.markupProduct, quantity: 1 }],
            promotionId: IDS.promoPlatFree,
        });

        const dbOrder = await h.getOrderFromDb(order.id);
        const dbPromos = await h.getOrderPromotionsFromDb(order.id);

        expect(Number(dbOrder!.deliveryPrice)).toBe(0);
        expect(dbPromos).toHaveLength(1);
        expect(dbPromos[0].promotionId).toBe(IDS.promoPlatFree);
        expect(dbPromos[0].appliesTo).toBe('DELIVERY');
        // discountAmount = original delivery (€2.50)
        expect(Number(dbPromos[0].discountAmount)).toBeCloseTo(DELIVERY_PRICE, 2);
    });

    it('item prices are unaffected by a free-delivery promo', async () => {
        const order = await h.createOrder({
            items: [{ productId: IDS.markupProduct, quantity: 1 }],
            promotionId: IDS.promoPlatFree,
        });
        const dbOrder = await h.getOrderFromDb(order.id);
        expect(Number(dbOrder!.actualPrice)).toBe(13);    // unchanged
        expect(Number(dbOrder!.basePrice)).toBe(10);       // discounted business base
    });
});

// ---------------------------------------------------------------------------
// 7. Platform FIXED_AMOUNT €3 promotion
// ---------------------------------------------------------------------------

describe('platform FIXED_AMOUNT €3 promotion', () => {
    it('reduces actualPrice by the discount amount', async () => {
        // markupProduct × 2: subtotal = 13 × 2 = 26, after €3 off = 23
        const order = await h.createOrder({
            items: [{ productId: IDS.markupProduct, quantity: 2 }],
            promotionId: IDS.promoPlatFixed3,
        });

        const dbOrder = await h.getOrderFromDb(order.id);
        expect(Number(dbOrder!.actualPrice)).toBeCloseTo(23, 2);
    });

    it('records the discount in order_promotions', async () => {
        const order = await h.createOrder({
            items: [{ productId: IDS.markupProduct, quantity: 2 }],
            promotionId: IDS.promoPlatFixed3,
        });
        const dbPromos = await h.getOrderPromotionsFromDb(order.id);
        expect(dbPromos).toHaveLength(1);
        expect(dbPromos[0].promotionId).toBe(IDS.promoPlatFixed3);
        expect(dbPromos[0].appliesTo).toBe('PRICE');
        expect(Number(dbPromos[0].discountAmount)).toBe(3);
    });

    it('stores originalPrice when a price discount is applied', async () => {
        const order = await h.createOrder({
            items: [{ productId: IDS.markupProduct, quantity: 2 }],
            promotionId: IDS.promoPlatFixed3,
        });
        const dbOrder = await h.getOrderFromDb(order.id);
        // originalPrice captures the pre-discount subtotal for refund/audit purposes
        expect(Number(dbOrder!.originalPrice)).toBeCloseTo(26, 2);
    });
});

// ---------------------------------------------------------------------------
// 8. Business-created promotion (creatorType=BUSINESS, FIXED_AMOUNT €5)
// ---------------------------------------------------------------------------

describe('business-created order discount promotion', () => {
    it('reduces actualPrice (customer pays less)', async () => {
        // basicProduct × 3: subtotal = 10 × 3 = 30, after €5 off = 25
        const order = await h.createOrder({
            items: [{ productId: IDS.basicProduct, quantity: 3 }],
            promotionId: IDS.promoBizOrder5,
        });
        const dbOrder = await h.getOrderFromDb(order.id);
        expect(Number(dbOrder!.actualPrice)).toBeCloseTo(25, 2);
    });

    it('records the discount in order_promotions', async () => {
        const order = await h.createOrder({
            items: [{ productId: IDS.basicProduct, quantity: 3 }],
            promotionId: IDS.promoBizOrder5,
        });
        const dbPromos = await h.getOrderPromotionsFromDb(order.id);
        expect(dbPromos).toHaveLength(1);
        expect(dbPromos[0].promotionId).toBe(IDS.promoBizOrder5);
        expect(Number(dbPromos[0].discountAmount)).toBe(5);
    });

    it('businessPrice = basePrice minus business-funded promo discount', async () => {
        // basicProduct × 3: basePrice = 10 × 3 = 30
        // Business-created promo deducts €5 → businessPrice = 30 - 5 = 25
        const order = await h.createOrder({
            items: [{ productId: IDS.basicProduct, quantity: 3 }],
            promotionId: IDS.promoBizOrder5,
        });
        const dbOrder = await h.getOrderFromDb(order.id);
        expect(Number(dbOrder!.businessPrice)).toBeCloseTo(25, 2);
    });
});

// ---------------------------------------------------------------------------
// 9. Business-created FREE_DELIVERY promotion
// ---------------------------------------------------------------------------

describe('business-created FREE_DELIVERY promotion', () => {
    it('sets deliveryPrice to 0 just like a platform promo', async () => {
        const order = await h.createOrder({
            items: [{ productId: IDS.markupProduct, quantity: 1 }],
            promotionId: IDS.promoBizFree,
        });
        const dbOrder = await h.getOrderFromDb(order.id);
        expect(Number(dbOrder!.deliveryPrice)).toBe(0);
    });

    it('records an order_promotions row with appliesTo=DELIVERY', async () => {
        const order = await h.createOrder({
            items: [{ productId: IDS.markupProduct, quantity: 1 }],
            promotionId: IDS.promoBizFree,
        });
        const dbPromos = await h.getOrderPromotionsFromDb(order.id);
        expect(dbPromos).toHaveLength(1);
        expect(dbPromos[0].appliesTo).toBe('DELIVERY');
    });
});
