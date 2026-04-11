/**
 * OrderFlowHarness — integration test harness for order creation, delivery, and settlement.
 *
 * Usage pattern:
 *   const h = new OrderFlowHarness(db);
 *   beforeAll(() => h.seed());
 *   afterAll(() => h.cleanup());
 *
 *   it('...', async () => {
 *     const order = await h.createOrder({ items: [...] });
 *     const settlements = await h.settle(order);
 *     h.assertSettlements(settlements, [{ type: 'BUSINESS', ... }]);
 *   });
 *
 * All seeded entities use deterministic UUIDs in the 0x0000000000009000 range.
 * Cleanup removes only rows created by this harness — safe to run against dev DB.
 */

import { randomUUID } from 'crypto';
import type { DbType } from '@/database';
import {
    businesses,
    deliveryPricingTiers,
    drivers,
    optionGroups,
    options,
    orderItems,
    orderPromotions,
    orders,
    productCategories,
    products,
    promotionBusinessEligibility,
    promotions,
    promotionUsage,
    settlementRules,
    settlements,
    userBehaviors,
    userPromoMetadata,
    userPromotions,
    users,
} from '@/database/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { OrderService } from '@/services/OrderService';
import { PricingService } from '@/services/PricingService';
import { PromotionEngine, type CartContext, type PromotionResult } from '@/services/PromotionEngine';
import { normalizeMoney } from '@/lib/utils/money';
import { OrderRepository } from '@/repositories/OrderRepository';
import { AuthRepository } from '@/repositories/AuthRepository';
import { ProductRepository } from '@/repositories/ProductRepository';
import { FinancialService } from '@/services/FinancialService';
import { SettlementRepository } from '@/repositories/SettlementRepository';
import type { DbOrder, DbOrderItem } from '@/database/schema';
import type { PubSub } from '@/lib/pubsub';

// ---------------------------------------------------------------------------
// Deterministic UUIDs — 9000 block.  All IDs are prefixed to avoid any clash
// with SettlementScenarioHarnessService (which uses the 0001–0010 blocks).
// ---------------------------------------------------------------------------

export const IDS = {
    // Users
    customerId:      '00000000-0000-0000-0000-000000009001',
    driverUserId:    '00000000-0000-0000-0000-000000009002',
    driverProfileId: '00000000-0000-0000-0000-000000009003',

    // Business
    restaurantId:    '00000000-0000-0000-0000-000000009010',
    categoryId:      '00000000-0000-0000-0000-000000009011',

    // Products  (all from restaurantId / categoryId)
    basicProduct:    '00000000-0000-0000-0000-000000009020',  // base=10, no markup
    markupProduct:   '00000000-0000-0000-0000-000000009021',  // base=10, markup=13
    discountProduct: '00000000-0000-0000-0000-000000009022',  // base=10, markup=13, sale=20%
    nightProduct:    '00000000-0000-0000-0000-000000009023',  // base=10, markup=13, night=16
    optionProduct:   '00000000-0000-0000-0000-000000009024',  // base=8,  markup=10

    // Option group + options on optionProduct
    optionGroupSize: '00000000-0000-0000-0000-000000009030',  // "Size", min=0, max=1
    optionRegular:   '00000000-0000-0000-0000-000000009031',  // +0.00
    optionLarge:     '00000000-0000-0000-0000-000000009032',  // +2.00

    // Delivery tier: covers all distances → price = 2.50
    tierId:          '00000000-0000-0000-0000-000000009040',

    // Global settlement rules  (active by default)
    ruleGlobalBiz10: '00000000-0000-0000-0000-000000009050',  // BUSINESS RECV 10% ORDER_PRICE
    ruleGlobalDrv80: '00000000-0000-0000-0000-000000009051',  // DRIVER  PAY  80% DELIVERY_PRICE
    ruleRestBiz5:    '00000000-0000-0000-0000-000000009052',  // BUSINESS RECV  5% ORDER_PRICE (restaurant-scoped)

    // Platform FREE_DELIVERY promo
    promoPlatFree:        '00000000-0000-0000-0000-000000009060',
    ruleFreeDriverCmp:    '00000000-0000-0000-0000-000000009061',  // DRIVER PAY €2 FIXED [promo-scoped]

    // Platform FIXED_AMOUNT €3 promo
    promoPlatFixed3:      '00000000-0000-0000-0000-000000009062',

    // Business-created FREE_DELIVERY promo (business covers driver €1)
    promoBizFree:         '00000000-0000-0000-0000-000000009063',
    ruleBizFreeDriverCmp: '00000000-0000-0000-0000-000000009064',  // DRIVER PAY €1 [biz+promo scoped]
    ruleBizFreeRecover:   '00000000-0000-0000-0000-000000009065',  // BUSINESS RECV €1 [biz+promo scoped]

    // Business-created FIXED_AMOUNT €5 promo (order discount)
    promoBizOrder5:       '00000000-0000-0000-0000-000000009066',
} as const;

/** Standard delivery fee used in all tests. Matches the seeded tier price. */
export const DELIVERY_PRICE = 2.50;

/** Server-authoritative priority surcharge amount. */
export const PRIORITY_SURCHARGE = 0.50;

/**
 * Business/dropoff coords anchored at the North Pole (90°N, 0°E).
 * Chosen because it will never match any production delivery zone polygon,
 * so the delivery-price calculation falls through to the seeded tier.
 */
const TEST_LAT = 90;
const TEST_LNG = 0;

// ---------------------------------------------------------------------------
// Stub PubSub — createOrder requires a PubSub instance for real-time events.
// In integration tests we don't care about pub/sub side effects.
// ---------------------------------------------------------------------------

const stubPubSub = {
    publish: () => undefined,
    subscribe: () => (async function* () {})(),
    asyncIterator: () => (async function* () {})(),
} as unknown as PubSub;

// ---------------------------------------------------------------------------
// Expected settlement shape (used by assertSettlements)
// ---------------------------------------------------------------------------

export type ExpectedSettlement = {
    type: 'DRIVER' | 'BUSINESS';
    direction: 'RECEIVABLE' | 'PAYABLE';
    amount: number;
    ruleId: string | null;
    /** omit to match any driverId */
    driverId?: string | null;
    /** omit to match any businessId */
    businessId?: string | null;
};

// ---------------------------------------------------------------------------
// Main harness class
// ---------------------------------------------------------------------------

export class OrderFlowHarness {
    private orderService: OrderService;
    private financialService: FinancialService;
    private settlementRepo: SettlementRepository;

    /** Auto-incremented order number for tests that need direct DB inserts. */
    private orderCounter = 0;

    /** All order IDs created via createOrder() — cleaned up in cleanup(). */
    private createdOrderIds: string[] = [];

    constructor(private db: DbType) {
        this.orderService = new OrderService(
            new OrderRepository(),
            new AuthRepository(db),
            new ProductRepository(db),
            stubPubSub,
            db,
        );
        this.financialService = new FinancialService(db as any);
        this.settlementRepo = new SettlementRepository(db as any);
    }

    // -----------------------------------------------------------------------
    // Seeding
    // -----------------------------------------------------------------------

    /** Seed all base fixtures. Call in beforeAll. Idempotent — deletes first. */
    async seed(): Promise<void> {
        await this.cleanup();

        const now = new Date().toISOString();

        // Business
        await this.db.insert(businesses).values({
            id: IDS.restaurantId,
            name: 'Test Restaurant',
            businessType: 'RESTAURANT',
            locationLat: TEST_LAT,
            locationLng: TEST_LNG,
            locationAddress: 'North Pole',
            opensAt: 0,
            closesAt: 0,   // 0 → 0 means open all day (wraps midnight)
            commissionPercentage: '0',
            createdAt: now,
            updatedAt: now,
        });

        // Category
        await this.db.insert(productCategories).values({
            id: IDS.categoryId,
            businessId: IDS.restaurantId,
            name: 'Main Menu',
            createdAt: now,
            updatedAt: now,
        });

        // Products
        await this.db.insert(products).values([
            {
                id: IDS.basicProduct,
                businessId: IDS.restaurantId,
                categoryId: IDS.categoryId,
                name: 'Plain Burger',
                basePrice: 10,
                markupPrice: null,
                nightMarkedupPrice: null,
                isOnSale: false,
                saleDiscountPercentage: null,
                isAvailable: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.markupProduct,
                businessId: IDS.restaurantId,
                categoryId: IDS.categoryId,
                name: 'Markup Burger',
                basePrice: 10,
                markupPrice: 13,
                nightMarkedupPrice: null,
                isOnSale: false,
                saleDiscountPercentage: null,
                isAvailable: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.discountProduct,
                businessId: IDS.restaurantId,
                categoryId: IDS.categoryId,
                name: 'Discounted Burger',
                basePrice: 10,
                markupPrice: 13,
                nightMarkedupPrice: null,
                isOnSale: true,
                saleDiscountPercentage: 20,   // 20% off contextPrice (markupPrice)
                isAvailable: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.nightProduct,
                businessId: IDS.restaurantId,
                categoryId: IDS.categoryId,
                name: 'Night Burger',
                basePrice: 10,
                markupPrice: 13,
                nightMarkedupPrice: 16,
                isOnSale: false,
                saleDiscountPercentage: null,
                isAvailable: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.optionProduct,
                businessId: IDS.restaurantId,
                categoryId: IDS.categoryId,
                name: 'Customizable Burger',
                basePrice: 8,
                markupPrice: 10,
                nightMarkedupPrice: null,
                isOnSale: false,
                saleDiscountPercentage: null,
                isAvailable: true,
                createdAt: now,
                updatedAt: now,
            },
        ]);

        // Option group + options (on optionProduct)
        await this.db.insert(optionGroups).values({
            id: IDS.optionGroupSize,
            productId: IDS.optionProduct,
            name: 'Size',
            minSelections: 0,
            maxSelections: 1,
            displayOrder: 0,
            createdAt: now,
            updatedAt: now,
        });

        await this.db.insert(options).values([
            {
                id: IDS.optionRegular,
                optionGroupId: IDS.optionGroupSize,
                name: 'Regular',
                extraPrice: 0,
                displayOrder: 0,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.optionLarge,
                optionGroupId: IDS.optionGroupSize,
                name: 'Large',
                extraPrice: 2,
                displayOrder: 1,
                createdAt: now,
                updatedAt: now,
            },
        ]);

        // Delivery pricing tier — covers all distances with a flat €2.50 rate
        await this.db.insert(deliveryPricingTiers).values({
            id: IDS.tierId,
            minDistanceKm: 0,
            maxDistanceKm: null,
            price: DELIVERY_PRICE,
            sortOrder: 0,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        });

        // Users
        await this.db.insert(users).values([
            {
                id: IDS.customerId,
                email: 'integration-customer@test.local',
                password: 'hashed-test-password',
                firstName: 'Test',
                lastName: 'Customer',
                role: 'CUSTOMER',
                signupStep: 'COMPLETED',
                emailVerified: true,
                phoneVerified: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.driverUserId,
                email: 'integration-driver@test.local',
                password: 'hashed-test-password',
                firstName: 'Test',
                lastName: 'Driver',
                role: 'DRIVER',
                signupStep: 'COMPLETED',
                emailVerified: true,
                phoneVerified: true,
                createdAt: now,
                updatedAt: now,
            },
        ]);

        // Driver profile (commission=0 so fallback uses 0 if no delivery rule matches)
        await this.db.insert(drivers).values({
            id: IDS.driverProfileId,
            userId: IDS.driverUserId,
            commissionPercentage: '0',
            maxActiveOrders: '5',
            hasOwnVehicle: true,
            createdAt: now,
            updatedAt: now,
        });

        // Promotions must be inserted BEFORE settlement rules because some rules
        // have a FK reference to promotions.id via the promotionId column.
        await this.db.insert(promotions).values([
            {
                id: IDS.promoPlatFree,
                code: 'TESTFREEDELIVERY',
                name: '[Test] Platform Free Delivery',
                type: 'FREE_DELIVERY',
                target: 'ALL_USERS',
                discountValue: 0,
                isActive: true,
                isStackable: false,
                currentGlobalUsage: 0,
                totalUsageCount: 0,
                creatorType: 'PLATFORM',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.promoPlatFixed3,
                code: 'TESTFIXED3',
                name: '[Test] Platform Fixed \u20ac3 Off',
                type: 'FIXED_AMOUNT',
                target: 'ALL_USERS',
                discountValue: 3,
                isActive: true,
                isStackable: false,
                currentGlobalUsage: 0,
                totalUsageCount: 0,
                creatorType: 'PLATFORM',
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.promoBizFree,
                code: 'TESTBIZFREE',
                name: '[Test] Business Free Delivery',
                type: 'FREE_DELIVERY',
                target: 'ALL_USERS',
                discountValue: 0,
                isActive: true,
                isStackable: false,
                currentGlobalUsage: 0,
                totalUsageCount: 0,
                creatorType: 'BUSINESS',
                creatorId: IDS.restaurantId,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.promoBizOrder5,
                code: 'TESTBIZORDER5',
                name: '[Test] Business \u20ac5 Off Order',
                type: 'FIXED_AMOUNT',
                target: 'ALL_USERS',
                discountValue: 5,
                isActive: true,
                isStackable: false,
                currentGlobalUsage: 0,
                totalUsageCount: 0,
                creatorType: 'BUSINESS',
                creatorId: IDS.restaurantId,
                createdAt: now,
                updatedAt: now,
            },
        ]);

        // Settlement rules
        await this.db.insert(settlementRules).values([
            {
                id: IDS.ruleGlobalBiz10,
                name: '[Test] Global Business 10% of Order',
                type: 'ORDER_PRICE',
                entityType: 'BUSINESS',
                direction: 'RECEIVABLE',
                amountType: 'PERCENT',
                amount: '10.00',
                businessId: null,
                promotionId: null,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.ruleGlobalDrv80,
                name: '[Test] Global Driver 80% of Delivery',
                type: 'DELIVERY_PRICE',
                entityType: 'DRIVER',
                direction: 'PAYABLE',
                amountType: 'PERCENT',
                amount: '80.00',
                businessId: null,
                promotionId: null,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.ruleFreeDriverCmp,
                name: '[Test] Platform Free Delivery — Driver Compensation €2',
                type: 'DELIVERY_PRICE',
                entityType: 'DRIVER',
                direction: 'PAYABLE',
                amountType: 'FIXED',
                amount: '2.00',
                businessId: null,
                promotionId: IDS.promoPlatFree,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.ruleBizFreeDriverCmp,
                name: '[Test] Business Free Delivery — Driver Comp €1',
                type: 'DELIVERY_PRICE',
                entityType: 'DRIVER',
                direction: 'PAYABLE',
                amountType: 'FIXED',
                amount: '1.00',
                businessId: IDS.restaurantId,
                promotionId: IDS.promoBizFree,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: IDS.ruleBizFreeRecover,
                name: '[Test] Business Free Delivery — Restaurant Reimburses €1',
                type: 'DELIVERY_PRICE',
                entityType: 'BUSINESS',
                direction: 'RECEIVABLE',
                amountType: 'FIXED',
                amount: '1.00',
                businessId: IDS.restaurantId,
                promotionId: IDS.promoBizFree,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
        ]);

        // Promotion eligibility: all promos are eligible for the restaurant
        await this.db.insert(promotionBusinessEligibility).values([
            { promotionId: IDS.promoPlatFree,    businessId: IDS.restaurantId, createdAt: now },
            { promotionId: IDS.promoPlatFixed3,  businessId: IDS.restaurantId, createdAt: now },
            { promotionId: IDS.promoBizFree,     businessId: IDS.restaurantId, createdAt: now },
            { promotionId: IDS.promoBizOrder5,   businessId: IDS.restaurantId, createdAt: now },
        ]);

        // Ensure user promo metadata row exists (createOrder does an upsert but seeding it
        // upfront avoids any FK race during parallel test runs on the same user).
        await this.db.insert(userPromoMetadata).values({ userId: IDS.customerId }).onConflictDoNothing();
    }

    // -----------------------------------------------------------------------
    // Cleanup
    // -----------------------------------------------------------------------

    /** Remove all data seeded by this harness. Call in afterAll. */
    async cleanup(): Promise<void> {
        const allPromoIds = [
            IDS.promoPlatFree,
            IDS.promoPlatFixed3,
            IDS.promoBizFree,
            IDS.promoBizOrder5,
        ];

        const allRuleIds = [
            IDS.ruleGlobalBiz10,
            IDS.ruleGlobalDrv80,
            // ruleRestBiz5 is seeded dynamically via seedRestaurantRule(); include it
            // here as a defensive cleanup so it's removed even after a test failure.
            IDS.ruleRestBiz5,
            IDS.ruleFreeDriverCmp,
            IDS.ruleBizFreeDriverCmp,
            IDS.ruleBizFreeRecover,
        ];

        const directInsertOrderIds = Array.from({ length: this.orderCounter }, (_, i) =>
            this.orderId(i + 1),
        );
        const allOrderIds = [...this.createdOrderIds, ...directInsertOrderIds];

        if (allOrderIds.length > 0) {
            await this.db.delete(orderPromotions).where(inArray(orderPromotions.orderId, allOrderIds));
            await this.db.delete(settlements).where(inArray(settlements.orderId, allOrderIds));
            await this.db.delete(orderItems).where(inArray(orderItems.orderId, allOrderIds));
            await this.db.delete(orders).where(inArray(orders.id, allOrderIds));
        }

        await this.db.delete(settlementRules).where(inArray(settlementRules.id, allRuleIds));

        await this.db.delete(promotionUsage).where(inArray(promotionUsage.promotionId, allPromoIds));
        await this.db.delete(userPromotions).where(inArray(userPromotions.promotionId, allPromoIds));
        await this.db.delete(promotionBusinessEligibility).where(
            inArray(promotionBusinessEligibility.promotionId, allPromoIds),
        );
        await this.db.delete(promotions).where(inArray(promotions.id, allPromoIds));

        await this.db.delete(options).where(
            inArray(options.id, [IDS.optionRegular, IDS.optionLarge]),
        );
        await this.db.delete(optionGroups).where(eq(optionGroups.id, IDS.optionGroupSize));

        await this.db.delete(products).where(
            inArray(products.id, [
                IDS.basicProduct,
                IDS.markupProduct,
                IDS.discountProduct,
                IDS.nightProduct,
                IDS.optionProduct,
            ]),
        );
        await this.db.delete(productCategories).where(eq(productCategories.id, IDS.categoryId));

        await this.db.delete(deliveryPricingTiers).where(eq(deliveryPricingTiers.id, IDS.tierId));

        await this.db.delete(userBehaviors).where(eq(userBehaviors.userId, IDS.customerId));
        await this.db.delete(userPromoMetadata).where(
            inArray(userPromoMetadata.userId, [IDS.customerId, IDS.driverUserId]),
        );
        await this.db.delete(drivers).where(eq(drivers.id, IDS.driverProfileId));
        await this.db.delete(users).where(
            inArray(users.id, [IDS.customerId, IDS.driverUserId]),
        );
        await this.db.delete(businesses).where(eq(businesses.id, IDS.restaurantId));

        // Reset counters for re-use
        this.createdOrderIds = [];
        this.orderCounter = 0;
    }

    // -----------------------------------------------------------------------
    // Order creation (through OrderService — tests full pricing pipeline)
    // -----------------------------------------------------------------------

    /**
     * Create an order via OrderService.createOrder.
     * totalPrice is pre-computed from product definitions + delivery fee
     * so you don't need to calculate it yourself.
     *
     * @param items        - product IDs, quantities, optional options
     * @param promotionId  - optional promo to apply
     * @param priority     - enable priority surcharge (adds €0.50)
     * @param payment      - payment collection method
     */
    async createOrder(params: {
        items: Array<{
            productId: string;
            quantity: number;
            notes?: string;
            selectedOptions?: Array<{ optionGroupId: string; optionId: string }>;
        }>;
        promotionId?: string;
        priority?: boolean;
        payment?: 'CASH_TO_DRIVER' | 'PREPAID_TO_PLATFORM';
        /**
         * Override totalPrice if you want to test a specific mismatch.
         * Normally leave undefined — the harness calculates the correct total.
         */
        totalPriceOverride?: number;
    }) {
        const { items, promotionId, priority = false, payment = 'CASH_TO_DRIVER' } = params;

        const pricingService = new PricingService(this.db);
        const promotionEngine = new PromotionEngine(this.db);

        const productIds = items.map((i) => i.productId);
        const priceMap = await pricingService.calculateProductPrices(productIds, { timestamp: new Date() });

        // Build inputs with strict client-sent pricing.
        let subtotal = 0;
        const cartItems: CartContext['items'] = [];
        const businessIds = new Set<string>();

        const createOrderItems = [] as any[];
        for (const item of items) {
            const priceRes = priceMap.get(item.productId);
            if (!priceRes) throw new Error(`Pricing not found for product ${item.productId}`);

            const [product] = await this.db.select().from(products).where(eq(products.id, item.productId));
            if (!product) throw new Error(`Product ${item.productId} not found`);

            businessIds.add(product.businessId);

            const unitPrice = normalizeMoney(priceRes.finalAppliedPrice);

            let optionExtra = 0;
            const selectedOptions = [] as Array<{ optionGroupId: string; optionId: string; price: number }>;
            for (const so of item.selectedOptions ?? []) {
                const [option] = await this.db.select().from(options).where(eq(options.id, so.optionId));
                const optPrice = normalizeMoney(Number(option?.extraPrice ?? 0));
                optionExtra = normalizeMoney(optionExtra + optPrice);
                selectedOptions.push({ ...so, price: optPrice });
            }

            subtotal = normalizeMoney(subtotal + normalizeMoney((unitPrice + optionExtra) * item.quantity));

            createOrderItems.push({
                productId: item.productId,
                quantity: item.quantity,
                price: unitPrice,
                selectedOptions,
                notes: item.notes,
            });

            cartItems.push({
                productId: item.productId,
                businessId: product.businessId,
                quantity: item.quantity,
                price: unitPrice,
            });
        }

        const promoResult: PromotionResult = promotionId
            ? await promotionEngine.applySinglePromotion(IDS.customerId, promotionId, {
                  items: cartItems,
                  subtotal,
                  deliveryPrice: DELIVERY_PRICE,
                  businessIds: Array.from(businessIds),
              })
            : {
                  promotions: [],
                  totalDiscount: 0,
                  freeDeliveryApplied: false,
                  finalSubtotal: subtotal,
                  finalDeliveryPrice: DELIVERY_PRICE,
                  finalTotal: normalizeMoney(subtotal + DELIVERY_PRICE),
              };

        const deliveryPrice = normalizeMoney(promoResult.finalDeliveryPrice);
        const totalPrice = params.totalPriceOverride ?? normalizeMoney(promoResult.finalTotal + (priority ? PRIORITY_SURCHARGE : 0));

        const result = await this.orderService.createOrder(IDS.customerId, {
            items: createOrderItems,
            deliveryPrice,
            totalPrice,
            dropOffLocation: {
                latitude: TEST_LAT,
                longitude: TEST_LNG,
                address: 'Test Dropoff (North Pole)',
            },
            paymentCollection: payment,
            promotionId,
            priorityRequested: priority,
            prioritySurcharge: priority ? PRIORITY_SURCHARGE : undefined,
        });

        const id = result.id as string;
        this.createdOrderIds.push(id);
        // Narrow the return type so callers see `id: string` (the ID scalar is
        // typed string|number in generated types, but is always a string UUID at runtime).
        return { ...result, id };
    }

    /**
     * Pre-compute the expected totalPrice for an order.
     * Mirrors the pricing logic in OrderService so the server validation passes.
     *
     * For daytime tests: uses markupPrice when set, otherwise basePrice.
     * Night-time tests should use insertDeliveredOrder() with direct DB inserts.
     */
    async computeExpectedTotal(
        items: Array<{
            productId: string;
            quantity: number;
            selectedOptions?: Array<{ optionGroupId: string; optionId: string }>;
        }>,
        promotionId?: string,
        priority = false,
    ): Promise<number> {
        let subtotal = 0;

        for (const item of items) {
            const [product] = await this.db
                .select()
                .from(products)
                .where(eq(products.id, item.productId));

            if (!product) throw new Error(`Product ${item.productId} not found`);

            const base    = Number(product.basePrice);
            const markup  = product.markupPrice != null ? Number(product.markupPrice) : null;
            const discount = product.saleDiscountPercentage != null ? Number(product.saleDiscountPercentage) : null;
            const contextPrice = markup ?? base;
            const finalPrice = (product.isOnSale && discount != null)
                ? Number((contextPrice * (1 - discount / 100)).toFixed(2))
                : contextPrice;

            let optionExtra = 0;
            if (item.selectedOptions) {
                for (const so of item.selectedOptions) {
                    const [option] = await this.db
                        .select()
                        .from(options)
                        .where(eq(options.id, so.optionId));
                    if (option) optionExtra += Number(option.extraPrice);
                }
            }

            subtotal += (finalPrice + optionExtra) * item.quantity;
        }

        // If a promotion is applied, compute its effect.
        let effectiveSubtotal = subtotal;
        let effectiveDelivery = DELIVERY_PRICE;

        if (promotionId) {
            const [promo] = await this.db
                .select()
                .from(promotions)
                .where(eq(promotions.id, promotionId));

            if (promo) {
                if (promo.type === 'FREE_DELIVERY') {
                    effectiveDelivery = 0;
                } else if (promo.type === 'FIXED_AMOUNT' && promo.discountValue != null) {
                    effectiveSubtotal = Math.max(0, subtotal - Number(promo.discountValue));
                } else if (promo.type === 'PERCENTAGE' && promo.discountValue != null) {
                    const pct = Number(promo.discountValue) / 100;
                    const discount2 = subtotal * pct;
                    const cap = promo.maxDiscountCap ? Number(promo.maxDiscountCap) : Infinity;
                    effectiveSubtotal = subtotal - Math.min(discount2, cap);
                }
            }
        }

        return Number((effectiveSubtotal + effectiveDelivery + (priority ? PRIORITY_SURCHARGE : 0)).toFixed(2));
    }

    // -----------------------------------------------------------------------
    // Direct DB order insertion (for settlement-only tests)
    // -----------------------------------------------------------------------

    /**
     * Insert a DELIVERED order directly into the DB, bypassing OrderService.
     * Use this when you want to test settlement calculation with controlled prices
     * (e.g., night-time prices, multi-product scenarios) without going through
     * the full createOrder pipeline.
     *
     * @param businessPrice  What the settlement engine uses for BUSINESS ORDER_PRICE rules.
     *                       Pass the same as basePrice when no promo changes it.
     * @param markupPrice    The order-level markup (sum of finalApplied - rawBase per item).
     *                       On CASH orders this generates a DRIVER RECEIVABLE (markup remittance).
     * @param promoRows      Promotions applied to this order (for promo-scoped rule matching).
     */
    async insertDeliveredOrder(params: {
        items: Array<{
            productId: string;
            quantity: number;
            basePrice: number;          // raw business cost per item
            finalAppliedPrice: number;  // effective price charged to customer
        }>;
        subtotal: number;               // sum of (finalAppliedPrice * qty + optionExtras)
        markupAmount: number;           // order.markupPrice column
        /** What the business earns. Defaults to subtotal if omitted. */
        businessPrice?: number;
        deliveryPrice?: number;
        prioritySurcharge?: number;
        payment?: 'CASH_TO_DRIVER' | 'PREPAID_TO_PLATFORM';
        /** Attach a driver to this order. Defaults to the test driver. */
        driverUserId?: string | null;
        promoRows?: Array<{
            promotionId: string;
            appliesTo: 'PRICE' | 'DELIVERY';
            discountAmount: number;
        }>;
    }): Promise<{ order: DbOrder; items: DbOrderItem[] }> {
        const {
            subtotal,
            markupAmount,
            businessPrice: businessPriceParam,
            deliveryPrice = DELIVERY_PRICE,
            prioritySurcharge = 0,
            payment = 'CASH_TO_DRIVER',
            driverUserId = IDS.driverUserId,
            promoRows = [],
        } = params;
        const effectiveBusinessPrice = businessPriceParam ?? subtotal;

        this.orderCounter++;
        const orderId = this.orderId(this.orderCounter);
        const displayId = `TST-${String(this.orderCounter).padStart(4, '0')}`;
        const now = new Date().toISOString();

        const [createdOrder] = await this.db
            .insert(orders)
            .values({
                id: orderId,
                displayId,
                userId: IDS.customerId,
                businessId: IDS.restaurantId,
                driverId: driverUserId,
                basePrice: subtotal,
                markupPrice: markupAmount,
                actualPrice: subtotal,
                businessPrice: effectiveBusinessPrice,
                originalDeliveryPrice: deliveryPrice,
                deliveryPrice,
                prioritySurcharge,
                paymentCollection: payment,
                status: 'DELIVERED',
                dropoffLat: TEST_LAT,
                dropoffLng: TEST_LNG,
                dropoffAddress: 'Test Dropoff',
                deliveredAt: now,
                orderDate: now,
                createdAt: now,
                updatedAt: now,
            })
            .returning();

        const insertedItems = await this.db
            .insert(orderItems)
            .values(
                params.items.map((item) => ({
                    id: randomUUID(),
                    orderId,
                    productId: item.productId,
                    quantity: item.quantity,
                    basePrice: item.basePrice,
                    finalAppliedPrice: item.finalAppliedPrice,
                    saleDiscountPercentage: null,
                    markupPrice: null,
                    nightMarkedupPrice: null,
                    notes: null,
                })),
            )
            .returning();

        for (const item of params.items) {
            await this.db
                .update(products)
                .set({
                    orderCount: sql<number>`GREATEST(${products.orderCount} + ${item.quantity}, 0)`,
                })
                .where(eq(products.id, item.productId));
        }

        if (promoRows.length > 0) {
            await this.db.insert(orderPromotions).values(
                promoRows.map((row) => ({
                    id: randomUUID(),
                    orderId,
                    promotionId: row.promotionId,
                    appliesTo: row.appliesTo,
                    discountAmount: row.discountAmount,
                    createdAt: now,
                    updatedAt: now,
                })),
            );
        }

        return { order: createdOrder, items: insertedItems };
    }

    // -----------------------------------------------------------------------
    // Settlement calculation
    // -----------------------------------------------------------------------

    /** Run settlement calculation for an order. Returns the created settlement rows. */
    async settle(order: DbOrder, items: DbOrderItem[]): Promise<Array<{
        type: string;
        direction: string;
        amount: number;
        ruleId: string | null;
        driverId: string | null;
        businessId: string | null;
    }>> {
        await this.financialService.createOrderSettlements(order, items, order.driverId);
        const rows = await this.settlementRepo.getSettlements({ orderId: order.id });
        return rows.map((r) => ({
            type: r.type,
            direction: r.direction,
            amount: Number(r.amount),
            ruleId: r.ruleId ?? null,
            driverId: r.driverId ?? null,
            businessId: r.businessId ?? null,
        }));
    }

    // -----------------------------------------------------------------------
    // DB read helpers
    // -----------------------------------------------------------------------

    async getOrderFromDb(orderId: string) {
        const [row] = await this.db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId));
        return row ?? null;
    }

    async getOrderItemsFromDb(orderId: string) {
        return this.db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    }

    async getOrderPromotionsFromDb(orderId: string) {
        return this.db.select().from(orderPromotions).where(eq(orderPromotions.orderId, orderId));
    }

    async getSettlementsFromDb(orderId: string) {
        return this.settlementRepo.getSettlements({ orderId });
    }

    // -----------------------------------------------------------------------
    // Assertion helpers
    // -----------------------------------------------------------------------

    /**
     * Assert that actual settlements match the expected set exactly (order-independent).
     * Matching is by: type + direction + amount (±0.01) + ruleId + optional driverId/businessId.
     *
     * Prints a clear diff if they don't match.
     */
    assertSettlements(
        actual: Array<{ type: string; direction: string; amount: number; ruleId: string | null; driverId: string | null; businessId: string | null }>,
        expected: ExpectedSettlement[],
    ): void {
        const fmt = (s: { type: string; direction: string; amount: number; ruleId: string | null; driverId?: string | null; businessId?: string | null }) =>
            `${s.type} ${s.direction} €${s.amount.toFixed(2)} [rule=${s.ruleId ?? 'auto'} driver=${s.driverId ?? '-'} biz=${s.businessId ?? '-'}]`;

        const remaining = [...actual];
        const unmatched: ExpectedSettlement[] = [];

        for (const exp of expected) {
            const idx = remaining.findIndex(
                (a) =>
                    a.type === exp.type &&
                    a.direction === exp.direction &&
                    Math.abs(a.amount - exp.amount) <= 0.01 &&
                    a.ruleId === exp.ruleId &&
                    (exp.driverId === undefined || a.driverId === exp.driverId) &&
                    (exp.businessId === undefined || a.businessId === exp.businessId),
            );
            if (idx === -1) {
                unmatched.push(exp);
            } else {
                remaining.splice(idx, 1);
            }
        }

        const messages: string[] = [];
        if (unmatched.length > 0) {
            messages.push('Missing expected settlements:\n' + unmatched.map((e) => '  - ' + fmt(e)).join('\n'));
        }
        if (remaining.length > 0) {
            messages.push('Unexpected extra settlements:\n' + remaining.map((a) => '  + ' + fmt(a)).join('\n'));
        }
        if (messages.length > 0) {
            messages.push('\nAll actual settlements:\n' + actual.map((a) => '  ' + fmt(a)).join('\n'));
            throw new Error('Settlement mismatch:\n' + messages.join('\n'));
        }
    }

    // -----------------------------------------------------------------------
    // Optional rule helpers (for describe-scoped setup)
    // -----------------------------------------------------------------------

    /**
     * Seed a restaurant-scoped ORDER_PRICE rule that adds 5% on top of the global
     * rule for all orders from IDS.restaurantId.
     *
     * Intended to be called in a `beforeAll` for describe blocks that specifically
     * test additive stacking of business-scoped settlement rules.
     *
     * @example
     *   describe('restaurant-scoped rule', () => {
     *     beforeAll(() => h.seedRestaurantRule());
     *     afterAll(() => h.removeRestaurantRule());
     *     it('...', ...);
     *   });
     */
    async seedRestaurantRule(): Promise<void> {
        const now = new Date().toISOString();
        await this.db
            .insert(settlementRules)
            .values({
                id: IDS.ruleRestBiz5,
                name: '[Test] Restaurant-scoped Business 5% of Order',
                type: 'ORDER_PRICE',
                entityType: 'BUSINESS',
                direction: 'RECEIVABLE',
                amountType: 'PERCENT',
                amount: '5.00',
                businessId: IDS.restaurantId,
                promotionId: null,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            })
            .onConflictDoNothing();
    }

    /** Remove the restaurant-scoped rule seeded by seedRestaurantRule(). */
    async removeRestaurantRule(): Promise<void> {
        await this.db.delete(settlementRules).where(eq(settlementRules.id, IDS.ruleRestBiz5));
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /** Generate a deterministic order ID for directly-inserted orders. */
    orderId(n: number): string {
        return `00000000-0000-0000-9000-${String(n).padStart(12, '0')}`;
    }
}
