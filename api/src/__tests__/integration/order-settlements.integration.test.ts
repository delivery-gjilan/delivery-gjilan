/**
 * Order Settlement Integration Tests
 *
 * Tests that FinancialService.createOrderSettlements produces the correct
 * settlement rows for every scenario: markup remittance, priority surcharge,
 * promo-scoped rules, business-scoped rules, and business-funded promos.
 *
 * Each test uses insertDeliveredOrder() to build a DELIVERED order with known
 * prices directly in the DB, then calls settle() and asserts the settlement rows.
 * This is fast and deterministic — no business-hours or delivery-zone variability.
 *
 * Run:
 *   cd api && npx vitest run --config vitest.integration.config.ts order-settlements
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
// 1. No-markup product, CASH — business commission only (no driver remittance)
// ---------------------------------------------------------------------------

describe('basic product (no markup), CASH', () => {
    it('creates BUSINESS RECV and DRIVER PAY; no markup remittance', async () => {
        // basicProduct: base=10, no markup ⟹ markupAmount=0, finalApplied=10
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.basicProduct, quantity: 2, basePrice: 10, finalAppliedPrice: 10 }],
            subtotal: 20,          // 10 × 2
            markupAmount: 0,
            deliveryPrice: DELIVERY_PRICE,
            payment: 'CASH_TO_DRIVER',
        });

        const settlements = await h.settle(order, items);

        h.assertSettlements(settlements, [
            // 10% of businessPrice(20)
            { type: 'BUSINESS', direction: 'RECEIVABLE', amount: 2.00, ruleId: IDS.ruleGlobalBiz10 },
            // 80% of delivery(2.50)
            { type: 'DRIVER', direction: 'PAYABLE', amount: 2.00, ruleId: IDS.ruleGlobalDrv80 },
            // No DRIVER RECEIVABLE — markupAmount=0 so no remittance generated
        ]);
    });
});

// ---------------------------------------------------------------------------
// 2. Markup product, CASH — includes markup remittance
// ---------------------------------------------------------------------------

describe('markup product (base=10, markup=13), CASH', () => {
    it('creates BUSINESS RECV + DRIVER PAY + DRIVER RECV (markup remittance)', async () => {
        // finalApplied=13, raw base=10 ⟹ markup per item = 3; qty=2 ⟹ total markup = 6
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.markupProduct, quantity: 2, basePrice: 10, finalAppliedPrice: 13 }],
            subtotal: 26,          // 13 × 2
            markupAmount: 6,       // (13-10) × 2
            deliveryPrice: DELIVERY_PRICE,
            payment: 'CASH_TO_DRIVER',
        });

        const settlements = await h.settle(order, items);

        h.assertSettlements(settlements, [
            // 10% of 26 = 2.60
            { type: 'BUSINESS', direction: 'RECEIVABLE', amount: 2.60, ruleId: IDS.ruleGlobalBiz10 },
            // 80% of 2.50 = 2.00
            { type: 'DRIVER', direction: 'PAYABLE', amount: 2.00, ruleId: IDS.ruleGlobalDrv80 },
            // Driver collected €6 markup in cash → must remit to platform
            { type: 'DRIVER', direction: 'RECEIVABLE', amount: 6.00, ruleId: null },
        ]);
    });

    it('settlement amounts sum to the expected net flows', async () => {
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.markupProduct, quantity: 2, basePrice: 10, finalAppliedPrice: 13 }],
            subtotal: 26,
            markupAmount: 6,
            deliveryPrice: DELIVERY_PRICE,
            payment: 'CASH_TO_DRIVER',
        });
        const settlements = await h.settle(order, items);
        expect(settlements).toHaveLength(3);
    });
});

// ---------------------------------------------------------------------------
// 3. Markup product, PREPAID — no markup remittance
// ---------------------------------------------------------------------------

describe('markup product, PREPAID_TO_PLATFORM', () => {
    it('does NOT create a DRIVER RECEIVABLE (markup remittance skipped for prepaid)', async () => {
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.markupProduct, quantity: 2, basePrice: 10, finalAppliedPrice: 13 }],
            subtotal: 26,
            markupAmount: 6,
            deliveryPrice: DELIVERY_PRICE,
            payment: 'PREPAID_TO_PLATFORM',   // ← prepaid
        });

        const settlements = await h.settle(order, items);

        h.assertSettlements(settlements, [
            { type: 'BUSINESS', direction: 'RECEIVABLE', amount: 2.60, ruleId: IDS.ruleGlobalBiz10 },
            { type: 'DRIVER',   direction: 'PAYABLE',    amount: 2.00, ruleId: IDS.ruleGlobalDrv80 },
            // No DRIVER RECEIVABLE — platform already collected the markup via the prepaid flow
        ]);
    });
});

// ---------------------------------------------------------------------------
// 4. Sale discount product, CASH
// ---------------------------------------------------------------------------

describe('discount product (base=10, markup=13, discount=20%), CASH', () => {
    it('commission is based on discounted finalAppliedPrice', async () => {
        // finalApplied = 13 × 0.80 = 10.40; markupAmount = 10.40 - 10 = 0.40
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.discountProduct, quantity: 1, basePrice: 10, finalAppliedPrice: 10.40 }],
            subtotal: 10.40,
            markupAmount: 0.40,
            deliveryPrice: DELIVERY_PRICE,
            payment: 'CASH_TO_DRIVER',
        });

        const settlements = await h.settle(order, items);

        h.assertSettlements(settlements, [
            // 10% of 10.40 = 1.04
            { type: 'BUSINESS', direction: 'RECEIVABLE', amount: 1.04, ruleId: IDS.ruleGlobalBiz10 },
            // 80% of 2.50 = 2.00
            { type: 'DRIVER',   direction: 'PAYABLE',    amount: 2.00, ruleId: IDS.ruleGlobalDrv80 },
            // Driver remits the reduced markup (0.40)
            { type: 'DRIVER',   direction: 'RECEIVABLE', amount: 0.40, ruleId: null },
        ]);
    });
});

// ---------------------------------------------------------------------------
// 5. Night-time price (simulated via direct insert), CASH
// ---------------------------------------------------------------------------

describe('night-time price (nightMarkedupPrice=16), CASH', () => {
    it('uses nightMarkedupPrice for markup remittance calculation', async () => {
        // nightProduct: base=10, night=16 ⟹ markup per item = 16-10 = 6
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.nightProduct, quantity: 1, basePrice: 10, finalAppliedPrice: 16 }],
            subtotal: 16,
            markupAmount: 6,   // 16 - 10
            deliveryPrice: DELIVERY_PRICE,
            payment: 'CASH_TO_DRIVER',
        });

        const settlements = await h.settle(order, items);

        h.assertSettlements(settlements, [
            { type: 'BUSINESS', direction: 'RECEIVABLE', amount: 1.60, ruleId: IDS.ruleGlobalBiz10 },
            { type: 'DRIVER',   direction: 'PAYABLE',    amount: 2.00, ruleId: IDS.ruleGlobalDrv80 },
            { type: 'DRIVER',   direction: 'RECEIVABLE', amount: 6.00, ruleId: null },
        ]);
    });
});

// ---------------------------------------------------------------------------
// 6. Night-time + discount combined, CASH
// ---------------------------------------------------------------------------

describe('night-time + 10% discount combined, CASH', () => {
    it('applies discount on top of nightMarkedupPrice', async () => {
        // nightProduct: night=16, discount=10% ⟹ finalApplied = 16×0.9 = 14.40
        // markupAmount = 14.40 - 10 = 4.40
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.nightProduct, quantity: 1, basePrice: 10, finalAppliedPrice: 14.40 }],
            subtotal: 14.40,
            markupAmount: 4.40,
            deliveryPrice: DELIVERY_PRICE,
            payment: 'CASH_TO_DRIVER',
        });

        const settlements = await h.settle(order, items);

        h.assertSettlements(settlements, [
            { type: 'BUSINESS', direction: 'RECEIVABLE', amount: 1.44, ruleId: IDS.ruleGlobalBiz10 },
            { type: 'DRIVER',   direction: 'PAYABLE',    amount: 2.00, ruleId: IDS.ruleGlobalDrv80 },
            { type: 'DRIVER',   direction: 'RECEIVABLE', amount: 4.40, ruleId: null },
        ]);
    });
});

// ---------------------------------------------------------------------------
// 7. Priority surcharge, CASH — creates separate DRIVER RECEIVABLE
// ---------------------------------------------------------------------------

describe('priority surcharge, CASH', () => {
    it('adds DRIVER RECEIVABLE for the surcharge amount', async () => {
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.markupProduct, quantity: 1, basePrice: 10, finalAppliedPrice: 13 }],
            subtotal: 13,
            markupAmount: 3,
            deliveryPrice: DELIVERY_PRICE,
            prioritySurcharge: PRIORITY_SURCHARGE,  // €0.50
            payment: 'CASH_TO_DRIVER',
        });

        const settlements = await h.settle(order, items);

        h.assertSettlements(settlements, [
            { type: 'BUSINESS', direction: 'RECEIVABLE', amount: 1.30, ruleId: IDS.ruleGlobalBiz10 },
            { type: 'DRIVER',   direction: 'PAYABLE',    amount: 2.00, ruleId: IDS.ruleGlobalDrv80 },
            // Markup remittance
            { type: 'DRIVER',   direction: 'RECEIVABLE', amount: 3.00, ruleId: null },
            // Priority surcharge remittance — driver collected it in cash
            { type: 'DRIVER',   direction: 'RECEIVABLE', amount: PRIORITY_SURCHARGE, ruleId: null },
        ]);
    });

    it('does NOT create priority surcharge remittance when PREPAID', async () => {
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.markupProduct, quantity: 1, basePrice: 10, finalAppliedPrice: 13 }],
            subtotal: 13,
            markupAmount: 3,
            deliveryPrice: DELIVERY_PRICE,
            prioritySurcharge: PRIORITY_SURCHARGE,
            payment: 'PREPAID_TO_PLATFORM',   // ← prepaid
        });

        const settlements = await h.settle(order, items);
        // No DRIVER RECEIVABLE rows at all (platform collected everything)
        const driverRecv = settlements.filter((s) => s.type === 'DRIVER' && s.direction === 'RECEIVABLE');
        expect(driverRecv).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// 8. No-driver order — no driver settlements
// ---------------------------------------------------------------------------

describe('order with no driver assigned', () => {
    it('creates only BUSINESS settlements when no driver', async () => {
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.markupProduct, quantity: 1, basePrice: 10, finalAppliedPrice: 13 }],
            subtotal: 13,
            markupAmount: 3,
            deliveryPrice: DELIVERY_PRICE,
            payment: 'CASH_TO_DRIVER',
            driverUserId: null,               // ← no driver
        });

        const settlements = await h.settle(order, items);

        // No DRIVER settlements when driver is null
        const driverSettlements = settlements.filter((s) => s.type === 'DRIVER');
        expect(driverSettlements).toHaveLength(0);

        // Business commission still fires
        h.assertSettlements(settlements, [
            { type: 'BUSINESS', direction: 'RECEIVABLE', amount: 1.30, ruleId: IDS.ruleGlobalBiz10 },
        ]);
    });
});

// ---------------------------------------------------------------------------
// 9. Business-scoped ORDER_PRICE rule (adds on top of global rule)
// ---------------------------------------------------------------------------

describe('restaurant-scoped additional settlement rule', () => {
    // The restaurant-scoped rule is NOT in the default seed — it would contaminate
    // every other test's settlement assertions.  Opt-in here only.
    beforeAll(async () => h.seedRestaurantRule());
    afterAll(async () => h.removeRestaurantRule());

    it('fires both global 10% and restaurant-specific 5%', async () => {
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.markupProduct, quantity: 1, basePrice: 10, finalAppliedPrice: 13 }],
            subtotal: 13,
            markupAmount: 3,
            deliveryPrice: DELIVERY_PRICE,
            payment: 'CASH_TO_DRIVER',
        });

        const settlements = await h.settle(order, items);

        h.assertSettlements(settlements, [
            // Global:  10% of 13 = 1.30
            { type: 'BUSINESS', direction: 'RECEIVABLE', amount: 1.30, ruleId: IDS.ruleGlobalBiz10 },
            // Restaurant-scoped: 5% of 13 = 0.65 (additive)
            { type: 'BUSINESS', direction: 'RECEIVABLE', amount: 0.65, ruleId: IDS.ruleRestBiz5 },
            // 80% of delivery
            { type: 'DRIVER',   direction: 'PAYABLE',    amount: 2.00, ruleId: IDS.ruleGlobalDrv80 },
            // Markup remittance
            { type: 'DRIVER',   direction: 'RECEIVABLE', amount: 3.00, ruleId: null },
        ]);
    });
});

// ---------------------------------------------------------------------------
// 10. Platform FREE_DELIVERY promo — promo-scoped driver compensation
// ---------------------------------------------------------------------------

describe('platform FREE_DELIVERY promo with driver compensation rule', () => {
    it('replaces delivery commission with promo-scoped fixed driver pay', async () => {
        // Promo makes delivery=0; promo-scoped rule pays driver €2 instead of 80% of 0
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.markupProduct, quantity: 1, basePrice: 10, finalAppliedPrice: 13 }],
            subtotal: 13,
            markupAmount: 3,
            deliveryPrice: 0,                 // free delivery
            payment: 'CASH_TO_DRIVER',
            promoRows: [
                { promotionId: IDS.promoPlatFree, appliesTo: 'DELIVERY', discountAmount: DELIVERY_PRICE },
            ],
        });

        const settlements = await h.settle(order, items);

        h.assertSettlements(settlements, [
            { type: 'BUSINESS', direction: 'RECEIVABLE', amount: 1.30, ruleId: IDS.ruleGlobalBiz10 },
            // Promo-scoped driver compensation overrides the global 80% rule (which would = 0)
            { type: 'DRIVER',   direction: 'PAYABLE',    amount: 2.00, ruleId: IDS.ruleFreeDriverCmp },
            // Markup remittance (cash)
            { type: 'DRIVER',   direction: 'RECEIVABLE', amount: 3.00, ruleId: null },
        ]);
    });
});

// ---------------------------------------------------------------------------
// 11. Business-created FREE_DELIVERY promo — business covers driver cost
//     Business pays driver €1; business reimburses platform €1 via separate rule
// ---------------------------------------------------------------------------

describe('business-created FREE_DELIVERY promo (business covers driver)', () => {
    it('creates driver compensation + business reimbursement settlements', async () => {
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.markupProduct, quantity: 1, basePrice: 10, finalAppliedPrice: 13 }],
            subtotal: 13,
            markupAmount: 3,
            deliveryPrice: 0,
            payment: 'CASH_TO_DRIVER',
            promoRows: [
                { promotionId: IDS.promoBizFree, appliesTo: 'DELIVERY', discountAmount: DELIVERY_PRICE },
            ],
        });

        const settlements = await h.settle(order, items);

        h.assertSettlements(settlements, [
            // Global business commission  (10% × 13)
            { type: 'BUSINESS', direction: 'RECEIVABLE', amount: 1.30, ruleId: IDS.ruleGlobalBiz10 },
            // Business-+promo-scoped driver comp (platform pays driver €1)
            { type: 'DRIVER',   direction: 'PAYABLE',    amount: 1.00, ruleId: IDS.ruleBizFreeDriverCmp },
            // Business-+promo-scoped reimbursement (business owes platform €1 back)
            { type: 'BUSINESS', direction: 'RECEIVABLE', amount: 1.00, ruleId: IDS.ruleBizFreeRecover },
            // Markup remittance (cash)
            { type: 'DRIVER',   direction: 'RECEIVABLE', amount: 3.00, ruleId: null },
        ]);
    });

    it('explains the cash flow: restaurant nets (13 - 1.30 - 1.00) = €10.70', async () => {
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.markupProduct, quantity: 1, basePrice: 10, finalAppliedPrice: 13 }],
            subtotal: 13,
            markupAmount: 3,
            deliveryPrice: 0,
            payment: 'CASH_TO_DRIVER',
            promoRows: [
                { promotionId: IDS.promoBizFree, appliesTo: 'DELIVERY', discountAmount: DELIVERY_PRICE },
            ],
        });

        const settlements = await h.settle(order, items);
        const bizSettlements = settlements.filter((s) => s.type === 'BUSINESS' && s.direction === 'RECEIVABLE');
        const totalBizOwed = bizSettlements.reduce((sum, s) => sum + s.amount, 0);

        // Restaurant owes: 1.30 (commission) + 1.00 (reimbursement) = 2.30
        expect(totalBizOwed).toBeCloseTo(2.30, 2);
    });
});

// ---------------------------------------------------------------------------
// 12. Business-created FIXED_AMOUNT promotion (businessPrice unchanged in current impl)
// ---------------------------------------------------------------------------

describe('business FIXED_AMOUNT promo (€5 off order), CASH', () => {
    it('uses businessPrice (reduced by biz-funded discount) for commission', async () => {
        /**
         * basicProduct × 3: subtotal=30, after €5 biz promo = actualPrice=25.
         * businessPrice = basePrice − business-funded discount = 30 − 5 = 25.
         * Commission = 10% × 25 = 2.50.
         *
         * The business absorbs its own promo discount, so the platform's
         * commission base is the reduced businessPrice.
         */
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.basicProduct, quantity: 3, basePrice: 10, finalAppliedPrice: 10 }],
            subtotal: 30,
            markupAmount: 0,
            businessPrice: 25,          // 30 − 5 (business-funded promo)
            deliveryPrice: DELIVERY_PRICE,
            payment: 'CASH_TO_DRIVER',
            promoRows: [
                { promotionId: IDS.promoBizOrder5, appliesTo: 'PRICE', discountAmount: 5 },
            ],
        });

        const settlements = await h.settle(order, items);

        h.assertSettlements(settlements, [
            // businessPrice=25 → 10% = 2.50
            { type: 'BUSINESS', direction: 'RECEIVABLE', amount: 2.50, ruleId: IDS.ruleGlobalBiz10 },
            // 80% of delivery
            { type: 'DRIVER',   direction: 'PAYABLE',    amount: 2.00, ruleId: IDS.ruleGlobalDrv80 },
            // No markup remittance (basicProduct has no markupPrice tier)
        ]);
    });
});

// ---------------------------------------------------------------------------
// 13. Idempotency — settle() twice must not create duplicate settlements
// ---------------------------------------------------------------------------

describe('settlement idempotency', () => {
    it('calling settle twice produces the same rows (no duplicates)', async () => {
        const { order, items } = await h.insertDeliveredOrder({
            items: [{ productId: IDS.markupProduct, quantity: 1, basePrice: 10, finalAppliedPrice: 13 }],
            subtotal: 13,
            markupAmount: 3,
            deliveryPrice: DELIVERY_PRICE,
            payment: 'CASH_TO_DRIVER',
        });

        await h.settle(order, items);
        await h.settle(order, items);  // second call — should be a no-op

        const settlements = await h.getSettlementsFromDb(order.id);
        // Exactly 3 rows: BUSINESS RECV (global 10%) + DRIVER PAY (global 80%) + markup DRIVER RECV
        expect(settlements).toHaveLength(3);
    });
});
