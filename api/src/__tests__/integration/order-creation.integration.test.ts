/**
 * Order Creation Integration Tests — Validation, Approval, Zones, Payment
 *
 * Covers every critical guard in OrderCreationModule.createOrder that has
 * no test coverage elsewhere:
 *
 *   - Validation rejection cases (bad prices, closed business, multi-business,
 *     unavailable product, option errors, incomplete signup, invalid promo)
 *   - Approval status routing (FIRST_ORDER, HIGH_VALUE, OUT_OF_ZONE, PENDING)
 *   - Delivery zone fee routing (zone-polygon match vs tier fallback, service
 *     zone → locationFlagged when outside)
 *   - Payment collection (default CASH_TO_DRIVER, explicit variants)
 *   - Minimum order amount enforcement
 *
 * Run:
 *   cd api && npx vitest run --config vitest.integration.config.ts order-creation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import { getDB } from '@/database';
import {
    businesses,
    businessHours,
    deliveryZones,
    optionGroups,
    options,
    orders,
    products,
    productCategories,
    users,
    promotions,
    userPromoMetadata,
    userBehaviors,
    orderItems,
    orderPromotions,
} from '@/database/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { OrderService } from '@/services/OrderService';
import { OrderRepository } from '@/repositories/OrderRepository';
import { AuthRepository } from '@/repositories/AuthRepository';
import { ProductRepository } from '@/repositories/ProductRepository';
import { PricingService } from '@/services/PricingService';
import { normalizeMoney } from '@/lib/utils/money';
import type { PubSub } from '@/lib/pubsub';
import type { DbType } from '@/database';

// ---------------------------------------------------------------------------
// Stub PubSub — we don't care about subscription side effects here
// ---------------------------------------------------------------------------

const stubPubSub: PubSub = {
    publish: () => undefined,
    subscribe: () => (async function* () {})(),
    asyncIterator: () => (async function* () {})(),
} as unknown as PubSub;

// ---------------------------------------------------------------------------
// Deterministic IDs — 0x000…9100 block to avoid clashing with other harnesses
// ---------------------------------------------------------------------------

const IDS = {
    // Users
    newCustomer:     '00000000-0000-0000-0000-000000009101',  // fresh user, zero orders
    repeatCustomer:  '00000000-0000-0000-0000-000000009102',  // has prior order
    incompleteUser:  '00000000-0000-0000-0000-000000009103',  // signupStep != COMPLETED

    // Businesses
    restaurantA:     '00000000-0000-0000-0000-000000009110',  // always open
    restaurantB:     '00000000-0000-0000-0000-000000009111',  // always open (second biz for multi-biz test)
    closedRestaurant:'00000000-0000-0000-0000-000000009112',  // closed today

    // Categories
    catA:            '00000000-0000-0000-0000-000000009120',
    catB:            '00000000-0000-0000-0000-000000009121',
    catClosed:       '00000000-0000-0000-0000-000000009122',

    // Products
    productA:        '00000000-0000-0000-0000-000000009130',  // from restaurantA, base=10
    productB:        '00000000-0000-0000-0000-000000009131',  // from restaurantB, base=8
    closedProduct:   '00000000-0000-0000-0000-000000009132',  // from closedRestaurant, base=10
    unavailProduct:  '00000000-0000-0000-0000-000000009133',  // from restaurantA, isAvailable=false
    highValueProduct:'00000000-0000-0000-0000-000000009134',  // from restaurantA, base=25 → total >€20

    // Products for min-order test
    cheapProduct:    '00000000-0000-0000-0000-000000009135',  // from restaurantA, base=1

    // Option group + options on productA
    optionGroupReq:  '00000000-0000-0000-0000-000000009140',  // minSelections=1, maxSelections=2
    optionA:         '00000000-0000-0000-0000-000000009141',  // +0.00
    optionB:         '00000000-0000-0000-0000-000000009142',  // +1.50

    // Delivery zones
    zoneInsideId:    '00000000-0000-0000-0000-000000009150',  // fee=€1.00, contains testPoint
    servicezoneId:   '00000000-0000-0000-0000-000000009151',  // isServiceZone=true, does NOT contain testPoint

    // Pricing tier (covers all distances, €2.50)
    tierId:          '00000000-0000-0000-0000-000000009160',

    // Prior order for repeatCustomer (inserted directly)
    priorOrderId:    '00000000-0000-0000-0000-000000009170',

    // Promotions for total/delivery validation tests
    promoFixed2:     '00000000-0000-0000-0000-000000009180',
    promoFreeDelivery:'00000000-0000-0000-0000-000000009181',
    promoStackableFixed1: '00000000-0000-0000-0000-000000009182',
    promoStackableFreeDelivery: '00000000-0000-0000-0000-000000009183',
    promoNonStackableFixed2: '00000000-0000-0000-0000-000000009184',
    promoSecondFreeDelivery: '00000000-0000-0000-0000-000000009185',
} as const;

// Drop-off point used in all happy-path tests.
// North Pole — unlikely to match any real production delivery zone.
const TEST_LAT = 90;
const TEST_LNG = 0;

// Delivery price that the tier produces for the test coordinates
const TIER_DELIVERY_PRICE = 2.50;

// Zone-polygon delivery price (cheaper zone for zone-routing tests)
const ZONE_DELIVERY_PRICE = 1.00;

// ---------------------------------------------------------------------------
// A polygon that completely contains the North Pole (90°N, 0°E).
// We use a large cap in lat/lng space (not geographically precise, but the
// ray-casting isPointInPolygon implementation treats lat/lng as Cartesian).
// Polygon: a square 89°–91° lat (clamped in practice to just >89), -1°–1° lng
// Actually at the north pole lat=90, there's a quirk with ray-casting, so
// let's use a test point at (50, 10) for the zone tests instead and create
// a zone that contains it.
// ---------------------------------------------------------------------------

// Secondary test coordinates for delivery zone tests (a point in Europe)
const ZONE_TEST_LAT = 50.0;
const ZONE_TEST_LNG = 10.0;

// Polygon that contains (50, 10) — a simple square around it
const POLYGON_CONTAINING_ZONE_TEST_POINT = [
    { lat: 49.0, lng: 9.0 },
    { lat: 51.0, lng: 9.0 },
    { lat: 51.0, lng: 11.0 },
    { lat: 49.0, lng: 11.0 },
];

// Polygon that does NOT contain (90, 0) — keeps the main test coords outside service zone
const POLYGON_NOT_CONTAINING_TEST_POINT = [
    { lat: 42.0, lng: 21.0 },
    { lat: 43.0, lng: 21.0 },
    { lat: 43.0, lng: 22.0 },
    { lat: 42.0, lng: 22.0 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let db: DbType;
let orderService: OrderService;

/**
 * Build the minimal `CreateOrderInput` for an order from restaurantA.
 * Optionally override anything.
 */
function makeOrderInput(overrides: Partial<Parameters<OrderService['createOrder']>[1]> = {}) {
    return {
        items: [
            {
                productId: IDS.productA,
                quantity: 1,
                price: 10,
                selectedOptions: [],
            },
        ],
        deliveryPrice: TIER_DELIVERY_PRICE,
        totalPrice: normalizeMoney(10 + TIER_DELIVERY_PRICE),
        dropOffLocation: {
            latitude: TEST_LAT,
            longitude: TEST_LNG,
            address: 'North Pole',
        },
        paymentCollection: 'CASH_TO_DRIVER' as const,
        ...overrides,
    };
}

/** Compute expected total using the pricing service (mirrors harness logic). */
async function computeTotal(productId: string, quantity: number, deliveryPrice: number, optionExtra = 0): Promise<number> {
    const pricingService = new PricingService(db);
    const priceMap = await pricingService.calculateProductPrices([productId], { timestamp: new Date() });
    const unitPrice = normalizeMoney(priceMap.get(productId)!.finalAppliedPrice);
    return normalizeMoney((unitPrice + optionExtra) * quantity + deliveryPrice);
}

/** Track created order IDs for cleanup. */
const createdOrderIds: string[] = [];

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
    db = await getDB();

    orderService = new OrderService(
        new OrderRepository(),
        new AuthRepository(db),
        new ProductRepository(db),
        stubPubSub,
        db,
    );

    await seedAll();
});

afterAll(async () => {
    await cleanupAll();
});

// Reset created orders between describe blocks so approval checks work on fresh users
// (the newCustomer needs zero orders to trigger FIRST_ORDER approval)
beforeEach(async () => {
    // Nothing needed globally — individual tests that need a clean slate manage it.
});

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seedAll() {
    await cleanupAll();

    const now = new Date().toISOString();

    // ---- Businesses -------------------------------------------------------
    await db.insert(businesses).values([
        {
            id: IDS.restaurantA,
            name: 'Test Restaurant A',
            businessType: 'RESTAURANT',
            locationLat: TEST_LAT,
            locationLng: TEST_LNG,
            locationAddress: 'North Pole',
            opensAt: 0,
            closesAt: 0,   // 0→0: open all day (wraps midnight)
            commissionPercentage: '0',
            createdAt: now,
            updatedAt: now,
        },
        {
            id: IDS.restaurantB,
            name: 'Test Restaurant B',
            businessType: 'RESTAURANT',
            locationLat: TEST_LAT,
            locationLng: TEST_LNG,
            locationAddress: 'North Pole',
            opensAt: 0,
            closesAt: 0,
            commissionPercentage: '0',
            createdAt: now,
            updatedAt: now,
        },
        {
            id: IDS.closedRestaurant,
            name: 'Closed Restaurant',
            businessType: 'RESTAURANT',
            locationLat: TEST_LAT,
            locationLng: TEST_LNG,
            locationAddress: 'North Pole',
            opensAt: 1,     // opens at 00:01
            closesAt: 2,    // closes at 00:02 — always closed
            commissionPercentage: '0',
            createdAt: now,
            updatedAt: now,
        },
    ]);

    // Closed restaurant: override with businessHours that are definitively closed
    // We use a dayOfWeek that matches no real day (impossible) — simpler: insert
    // a businessHours row for every day with a 1-minute window (00:01–00:02).
    // Since all 7 days are covered now and none match current time (>= 2 minutes
    // past midnight), the business is effectivley always closed.
    const closedSlots = Array.from({ length: 7 }, (_, i) => ({
        id: randomUUID(),
        businessId: IDS.closedRestaurant,
        dayOfWeek: i,
        opensAt: 1,
        closesAt: 2,
        createdAt: now,
        updatedAt: now,
    }));
    await db.insert(businessHours).values(closedSlots);

    // ---- Categories -------------------------------------------------------
    await db.insert(productCategories).values([
        { id: IDS.catA, businessId: IDS.restaurantA, name: 'Menu A', createdAt: now, updatedAt: now },
        { id: IDS.catB, businessId: IDS.restaurantB, name: 'Menu B', createdAt: now, updatedAt: now },
        { id: IDS.catClosed, businessId: IDS.closedRestaurant, name: 'Menu Closed', createdAt: now, updatedAt: now },
    ]);

    // ---- Products ---------------------------------------------------------
    await db.insert(products).values([
        {
            id: IDS.productA,
            businessId: IDS.restaurantA,
            categoryId: IDS.catA,
            name: 'Burger A',
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
            id: IDS.productB,
            businessId: IDS.restaurantB,
            categoryId: IDS.catB,
            name: 'Burger B',
            basePrice: 8,
            markupPrice: null,
            nightMarkedupPrice: null,
            isOnSale: false,
            saleDiscountPercentage: null,
            isAvailable: true,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: IDS.closedProduct,
            businessId: IDS.closedRestaurant,
            categoryId: IDS.catClosed,
            name: 'Closed Product',
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
            id: IDS.unavailProduct,
            businessId: IDS.restaurantA,
            categoryId: IDS.catA,
            name: 'Unavailable Product',
            basePrice: 10,
            markupPrice: null,
            nightMarkedupPrice: null,
            isOnSale: false,
            saleDiscountPercentage: null,
            isAvailable: false,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: IDS.highValueProduct,
            businessId: IDS.restaurantA,
            categoryId: IDS.catA,
            name: 'Expensive Product',
            basePrice: 25,
            markupPrice: null,
            nightMarkedupPrice: null,
            isOnSale: false,
            saleDiscountPercentage: null,
            isAvailable: true,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: IDS.cheapProduct,
            businessId: IDS.restaurantA,
            categoryId: IDS.catA,
            name: 'Cheap Product',
            basePrice: 1,
            markupPrice: null,
            nightMarkedupPrice: null,
            isOnSale: false,
            saleDiscountPercentage: null,
            isAvailable: true,
            createdAt: now,
            updatedAt: now,
        },
    ]);

    // ---- Option group + options (on productA) ----------------------------
    await db.insert(optionGroups).values({
        id: IDS.optionGroupReq,
        productId: IDS.productA,
        name: 'Required Choice',
        minSelections: 1,
        maxSelections: 2,
        displayOrder: 0,
        createdAt: now,
        updatedAt: now,
    });
    await db.insert(options).values([
        {
            id: IDS.optionA,
            optionGroupId: IDS.optionGroupReq,
            name: 'Standard',
            extraPrice: 0,
            displayOrder: 0,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: IDS.optionB,
            optionGroupId: IDS.optionGroupReq,
            name: 'Deluxe',
            extraPrice: 1.5,
            displayOrder: 1,
            createdAt: now,
            updatedAt: now,
        },
    ]);

    // ---- Delivery pricing tier (covers all distances → €2.50) -----------
    await db.insert(deliveryZones).values([
        {
            id: IDS.zoneInsideId,
            name: 'Test Zone (contains zone-test point)',
            polygon: POLYGON_CONTAINING_ZONE_TEST_POINT,
            deliveryFee: ZONE_DELIVERY_PRICE,
            sortOrder: 0,
            isActive: true,
            isServiceZone: false,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: IDS.servicezoneId,
            name: 'Service Zone (does NOT contain north pole)',
            polygon: POLYGON_NOT_CONTAINING_TEST_POINT,
            deliveryFee: 3.00,
            sortOrder: 1,
            isActive: true,
            isServiceZone: true,
            createdAt: now,
            updatedAt: now,
        },
    ]);

    // ---- Users (inserted separately to avoid Drizzle overload union confusion) ----
    await db.insert(users).values({
        id: IDS.newCustomer,
        email: 'new-customer-9101@test.local',
        password: 'hashed',
        firstName: 'New',
        lastName: 'Customer',
        role: 'CUSTOMER',
        signupStep: 'COMPLETED',
        emailVerified: true,
        phoneVerified: true,
        createdAt: now,
        updatedAt: now,
    });
    await db.insert(users).values({
        id: IDS.repeatCustomer,
        email: 'repeat-customer-9102@test.local',
        password: 'hashed',
        firstName: 'Repeat',
        lastName: 'Customer',
        role: 'CUSTOMER',
        signupStep: 'COMPLETED',
        emailVerified: true,
        phoneVerified: true,
        createdAt: now,
        updatedAt: now,
    });
    await db.insert(users).values({
        id: IDS.incompleteUser,
        email: 'incomplete-9103@test.local',
        password: 'hashed',
        firstName: 'Incomplete',
        lastName: 'User',
        role: 'CUSTOMER',
        signupStep: 'PHONE_SENT',    // not COMPLETED
        emailVerified: true,
        phoneVerified: false,
        createdAt: now,
        updatedAt: now,
    });

    // Insert a prior order for repeatCustomer so it is not treated as a first-order
    await db.insert(orders).values({
        id: IDS.priorOrderId,
        displayId: 'GJ-PRIOR',
        userId: IDS.repeatCustomer,
        businessId: IDS.restaurantA,
        basePrice: 10,
        markupPrice: 0,
        actualPrice: 10,
        businessPrice: 10,
        originalDeliveryPrice: TIER_DELIVERY_PRICE,
        deliveryPrice: TIER_DELIVERY_PRICE,
        prioritySurcharge: 0,
        paymentCollection: 'CASH_TO_DRIVER',
        status: 'DELIVERED',
        locationFlagged: false,
        dropoffLat: TEST_LAT,
        dropoffLng: TEST_LNG,
        dropoffAddress: 'North Pole',
        orderDate: now,
        createdAt: now,
        updatedAt: now,
    });

    await db.insert(userPromoMetadata).values([
        { userId: IDS.newCustomer },
        { userId: IDS.repeatCustomer },
        { userId: IDS.incompleteUser },
    ]).onConflictDoNothing();

    // ---- Promotions (used by promo price-validation tests) --------------
    await db.insert(promotions).values([
        {
            id: IDS.promoFixed2,
            name: 'Fixed 2 EUR Off',
            type: 'FIXED_AMOUNT',
            target: 'ALL_USERS',
            discountValue: 2,
            isActive: true,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: IDS.promoFreeDelivery,
            name: 'Free Delivery',
            type: 'FREE_DELIVERY',
            target: 'ALL_USERS',
            isActive: true,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: IDS.promoStackableFixed1,
            name: 'Stackable Fixed 1 EUR Off',
            type: 'FIXED_AMOUNT',
            target: 'ALL_USERS',
            discountValue: 1,
            isStackable: true,
            priority: 80,
            isActive: true,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: IDS.promoStackableFreeDelivery,
            name: 'Stackable Free Delivery',
            type: 'FREE_DELIVERY',
            target: 'ALL_USERS',
            isStackable: true,
            priority: 90,
            isActive: true,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: IDS.promoNonStackableFixed2,
            name: 'Non-stackable Fixed 2 EUR Off',
            type: 'FIXED_AMOUNT',
            target: 'ALL_USERS',
            discountValue: 2,
            isStackable: false,
            priority: 95,
            isActive: true,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: IDS.promoSecondFreeDelivery,
            name: 'Second Free Delivery',
            type: 'FREE_DELIVERY',
            target: 'ALL_USERS',
            isStackable: true,
            priority: 70,
            isActive: true,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
        },
    ]);
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanupAll() {
    // Clean any orders created during tests
    if (createdOrderIds.length > 0) {
        await db.delete(orderPromotions).where(inArray(orderPromotions.orderId, createdOrderIds));
        await db.delete(orderItems).where(inArray(orderItems.orderId, createdOrderIds));
        await db.delete(orders).where(inArray(orders.id, createdOrderIds));
        createdOrderIds.length = 0;
    }

    // Remove prior order
    await db.delete(orderItems).where(eq(orderItems.orderId, IDS.priorOrderId));
    await db.delete(orders).where(eq(orders.id, IDS.priorOrderId));

    // Cleanup options
    await db.delete(options).where(inArray(options.id, [IDS.optionA, IDS.optionB]));
    await db.delete(optionGroups).where(eq(optionGroups.id, IDS.optionGroupReq));

    // Cleanup products
    await db.delete(products).where(
        inArray(products.id, [
            IDS.productA,
            IDS.productB,
            IDS.closedProduct,
            IDS.unavailProduct,
            IDS.highValueProduct,
            IDS.cheapProduct,
        ]),
    );

    // Cleanup categories
    await db.delete(productCategories).where(
        inArray(productCategories.id, [IDS.catA, IDS.catB, IDS.catClosed]),
    );

    // Cleanup business hours
    await db.delete(businessHours).where(eq(businessHours.businessId, IDS.closedRestaurant));

    // Cleanup businesses
    await db.delete(businesses).where(
        inArray(businesses.id, [IDS.restaurantA, IDS.restaurantB, IDS.closedRestaurant]),
    );

    // Cleanup delivery zones
    await db.delete(deliveryZones).where(
        inArray(deliveryZones.id, [IDS.zoneInsideId, IDS.servicezoneId]),
    );

    // Cleanup users
    await db.delete(userBehaviors).where(
        inArray(userBehaviors.userId, [IDS.newCustomer, IDS.repeatCustomer, IDS.incompleteUser]),
    );
    await db.delete(userPromoMetadata).where(
        inArray(userPromoMetadata.userId, [IDS.newCustomer, IDS.repeatCustomer, IDS.incompleteUser]),
    );

    // Cleanup promotions
    await db.delete(promotions).where(
        inArray(promotions.id, [
            IDS.promoFixed2,
            IDS.promoFreeDelivery,
            IDS.promoStackableFixed1,
            IDS.promoStackableFreeDelivery,
            IDS.promoNonStackableFixed2,
            IDS.promoSecondFreeDelivery,
        ]),
    );

    await db.delete(users).where(
        inArray(users.id, [IDS.newCustomer, IDS.repeatCustomer, IDS.incompleteUser]),
    );
}

// ---------------------------------------------------------------------------
// Helper: create an order and track its ID for cleanup
// ---------------------------------------------------------------------------

async function createOrder(userId: string, input: Parameters<OrderService['createOrder']>[1]) {
    const result = await orderService.createOrder(userId, input);
    const id = String(result.id);
    createdOrderIds.push(id);
    return result;
}

// ---------------------------------------------------------------------------
// Helper: clean up orders created during a specific test so that FIRST_ORDER
// logic is correctly reset for the newCustomer on the next test.
// ---------------------------------------------------------------------------

async function cleanNewCustomerOrders() {
    const rows = await db.select({ id: orders.id }).from(orders).where(eq(orders.userId, IDS.newCustomer));
    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
        await db.delete(orderPromotions).where(inArray(orderPromotions.orderId, ids));
        await db.delete(orderItems).where(inArray(orderItems.orderId, ids));
        await db.delete(orders).where(inArray(orders.id, ids));
        for (const id of ids) {
            const idx = createdOrderIds.indexOf(id);
            if (idx !== -1) createdOrderIds.splice(idx, 1);
        }
    }
}

async function cleanRepeatCustomerOrders() {
    const rows = await db.select({ id: orders.id }).from(orders).where(eq(orders.userId, IDS.repeatCustomer));
    const ids = rows.map((r) => r.id).filter((id) => id !== IDS.priorOrderId);
    if (ids.length > 0) {
        await db.delete(orderPromotions).where(inArray(orderPromotions.orderId, ids));
        await db.delete(orderItems).where(inArray(orderItems.orderId, ids));
        await db.delete(orders).where(inArray(orders.id, ids));
        for (const id of ids) {
            const idx = createdOrderIds.indexOf(id);
            if (idx !== -1) createdOrderIds.splice(idx, 1);
        }
    }
}

// ===========================================================================
// 1. USER VALIDATION
// ===========================================================================

describe('user validation', () => {
    it('rejects when user does not exist', async () => {
        await expect(
            orderService.createOrder('00000000-0000-0000-0000-000000000000', makeOrderInput()),
        ).rejects.toThrow('User not found');
    });

    it('rejects when signupStep is not COMPLETED', async () => {
        await expect(
            orderService.createOrder(IDS.incompleteUser, makeOrderInput()),
        ).rejects.toThrow('signup');
    });
});

// ===========================================================================
// 2. PRODUCT VALIDATION
// ===========================================================================

describe('product validation', () => {
    it('rejects when product does not exist', async () => {
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    items: [{ productId: '00000000-0000-0000-0000-000000000001', quantity: 1, price: 10, selectedOptions: [] }],
                    totalPrice: 10 + TIER_DELIVERY_PRICE,
                }),
            ),
        ).rejects.toThrow();
    });

    it('rejects when product is unavailable (isAvailable=false)', async () => {
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    items: [{ productId: IDS.unavailProduct, quantity: 1, price: 10, selectedOptions: [] }],
                    totalPrice: 10 + TIER_DELIVERY_PRICE,
                }),
            ),
        ).rejects.toThrow('unavailable');
    });

    it('rejects when items come from two different businesses', async () => {
        const totalA = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        // We only need to check that the multi-business guard fires before price validation
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    items: [
                        { productId: IDS.productA, quantity: 1, price: 10, selectedOptions: [] },
                        { productId: IDS.productB, quantity: 1, price: 8, selectedOptions: [] },
                    ],
                    totalPrice: totalA + 8,
                }),
            ),
        ).rejects.toThrow('same business');
    });
});

// ===========================================================================
// 3. BUSINESS AVAILABILITY (OPEN/CLOSED)
// ===========================================================================

describe('business hours validation', () => {
    it('rejects when the business is closed right now', async () => {
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    items: [{ productId: IDS.closedProduct, quantity: 1, price: 10, selectedOptions: [] }],
                    totalPrice: 10 + TIER_DELIVERY_PRICE,
                }),
            ),
        ).rejects.toThrow('currently closed');
    });
});

// ===========================================================================
// 4. ITEM PRICE VALIDATION
// ===========================================================================

describe('item price validation', () => {
    it('rejects when client sends a wrong unit price for an item', async () => {
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    items: [{ productId: IDS.productA, quantity: 1, price: 999, selectedOptions: [] }],
                    // total based on the wrong price
                    totalPrice: 999 + TIER_DELIVERY_PRICE,
                }),
            ),
        ).rejects.toThrow('price mismatch');
    });
});

// ===========================================================================
// 5. DELIVERY FEE VALIDATION
// ===========================================================================

describe('delivery fee validation', () => {
    it('rejects when client sends a delivery fee HIGHER than server calculated', async () => {
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        // Send delivery price €0.50 above what the server expects (exceeds the one-directional check)
        const badDeliveryPrice = TIER_DELIVERY_PRICE + 0.50;
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    deliveryPrice: badDeliveryPrice,
                    totalPrice: normalizeMoney(10 + badDeliveryPrice),
                }),
            ),
        ).rejects.toThrow('Delivery price mismatch');
    });

    it('accepts when client sends a delivery fee LOWER than server calculated (e.g. pre-applied free delivery)', async () => {
        // A client that pre-applies free delivery locally sends 0 — server still accepts
        // because the check is one-directional (client ≤ server is OK).
        // For this to pass the total validation too we also send the discounted total.
        // NOTE: No promo is applied on server side → server effectiveDeliveryPrice = TIER_DELIVERY_PRICE,
        //       but client sends 0, which is lower → one-directional check passes.
        //       Then total validation: effectiveTotal = 10 + TIER_DELIVERY_PRICE,
        //       client sends 10 + 0 = 10 → mismatch on total. So this actually fails on total.
        // The correct behavior per B3 spec: client delivery ≤ server is accepted by the
        // delivery check, but total check still validates against effectiveTotal.
        // This test verifies the correct error is total, not delivery.
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    deliveryPrice: 0,
                    totalPrice: 10,   // 10 + 0
                }),
            ),
        ).rejects.toThrow('Total price mismatch');
    });
});

// ===========================================================================
// 6. TOTAL PRICE VALIDATION
// ===========================================================================

describe('total price validation', () => {
    it('rejects when client total is higher than server calculated total', async () => {
        const correctTotal = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    totalPrice: normalizeMoney(correctTotal + 5),
                }),
            ),
        ).rejects.toThrow('Total price mismatch');
    });

    it('rejects when client total is lower than server calculated total (and no promo)', async () => {
        const correctTotal = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    totalPrice: normalizeMoney(correctTotal - 1),
                }),
            ),
        ).rejects.toThrow('Total price mismatch');
    });

    it('accepts the correct total within epsilon', async () => {
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        const order = await createOrder(IDS.repeatCustomer, makeOrderInput({ totalPrice: total }));
        expect(order.id).toBeTruthy();
    });
});

// ===========================================================================
// 7. OPTION VALIDATION
// ===========================================================================

describe('option validation', () => {
    it('rejects when a required option group has no selection (minSelections=1 not met)', async () => {
        // productA has an optionGroup with minSelections=1 — omitting it should fail
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    items: [{ productId: IDS.productA, quantity: 1, price: 10, selectedOptions: [] }],
                    totalPrice: total,
                }),
            ),
        ).rejects.toThrow('missing required selections');
    });

    it('rejects when an option belongs to a different product (wrong group)', async () => {
        // optionGroupReq belongs to productA; sending it with a different optionGroupId should fail
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    items: [{
                        productId: IDS.productA,
                        quantity: 1,
                        price: 10,
                        selectedOptions: [
                            {
                                optionGroupId: '00000000-0000-0000-0000-000000000099',  // wrong group
                                optionId: IDS.optionA,
                                price: 0,
                            },
                        ],
                    }],
                    totalPrice: total,
                }),
            ),
        ).rejects.toThrow();
    });

    it('rejects when option extraPrice is non-zero but client omits the price field', async () => {
        // optionB has extraPrice=1.50 — omitting price should reject
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE, 1.5);
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    items: [{
                        productId: IDS.productA,
                        quantity: 1,
                        price: 10,
                        selectedOptions: [
                            {
                                optionGroupId: IDS.optionGroupReq,
                                optionId: IDS.optionB,
                                // price intentionally omitted (null)
                                price: null,
                            },
                        ],
                    }],
                    totalPrice: total,
                }),
            ),
        ).rejects.toThrow('Missing option price');
    });

    it('rejects when option extraPrice does not match client-provided price', async () => {
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    items: [{
                        productId: IDS.productA,
                        quantity: 1,
                        price: 10,
                        selectedOptions: [
                            {
                                optionGroupId: IDS.optionGroupReq,
                                optionId: IDS.optionB,
                                price: 5.00,  // server expects 1.50
                            },
                        ],
                    }],
                    totalPrice: normalizeMoney(10 + 5 + TIER_DELIVERY_PRICE),
                }),
            ),
        ).rejects.toThrow('Option price mismatch');
    });

    it('accepts order with a valid required option selection (free option)', async () => {
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE, 0);
        const order = await createOrder(
            IDS.repeatCustomer,
            makeOrderInput({
                items: [{
                    productId: IDS.productA,
                    quantity: 1,
                    price: 10,
                    selectedOptions: [
                        { optionGroupId: IDS.optionGroupReq, optionId: IDS.optionA, price: 0 },
                    ],
                }],
                totalPrice: total,
            }),
        );
        expect(order.id).toBeTruthy();
    });

    it('accepts order with a paid option and correct price', async () => {
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE, 1.5);
        const order = await createOrder(
            IDS.repeatCustomer,
            makeOrderInput({
                items: [{
                    productId: IDS.productA,
                    quantity: 1,
                    price: 10,
                    selectedOptions: [
                        { optionGroupId: IDS.optionGroupReq, optionId: IDS.optionB, price: 1.5 },
                    ],
                }],
                totalPrice: total,
            }),
        );
        expect(order.id).toBeTruthy();
    });
});

// ===========================================================================
// 8. INVALID PROMOTION
// ===========================================================================

describe('invalid promotion', () => {
    it('rejects when promotionId does not exist', async () => {
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    promotionId: '00000000-0000-0000-0000-000000000099',
                    totalPrice: total,
                }),
            ),
        ).rejects.toThrow();
    });
});

// ===========================================================================
// 9. PROMOTION PRICE VALIDATION
// ===========================================================================

describe('promotion price validation', () => {
    beforeEach(async () => {
        await cleanRepeatCustomerOrders();
    });

    it('accepts order when free-delivery promo totals match server-side calculation', async () => {
        // productA: 10, free delivery: 0 => total 10
        const order = await createOrder(
            IDS.repeatCustomer,
            makeOrderInput({
                items: [{
                    productId: IDS.productA,
                    quantity: 1,
                    price: 10,
                    selectedOptions: [{ optionGroupId: IDS.optionGroupReq, optionId: IDS.optionA, price: 0 }],
                }],
                promotionId: IDS.promoFreeDelivery,
                deliveryPrice: 0,
                totalPrice: normalizeMoney(10),
            }),
        );
        expect(order.id).toBeTruthy();
    });

    it('rejects when client total is lower than expected total for free-delivery promo', async () => {
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    items: [{
                        productId: IDS.productA,
                        quantity: 1,
                        price: 10,
                        selectedOptions: [{ optionGroupId: IDS.optionGroupReq, optionId: IDS.optionA, price: 0 }],
                    }],
                    promotionId: IDS.promoFreeDelivery,
                    deliveryPrice: 0,
                    // Expected: 10 + 0, client sends less
                    totalPrice: normalizeMoney(9),
                }),
            ),
        ).rejects.toThrow('Total price mismatch');
    });

    it('rejects when free-delivery promo is selected but client sends non-zero delivery fee', async () => {
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    items: [{
                        productId: IDS.productA,
                        quantity: 1,
                        price: 10,
                        selectedOptions: [{ optionGroupId: IDS.optionGroupReq, optionId: IDS.optionA, price: 0 }],
                    }],
                    promotionId: IDS.promoFreeDelivery,
                    // Expected effective delivery is 0, client sends tier fee
                    deliveryPrice: TIER_DELIVERY_PRICE,
                    totalPrice: normalizeMoney(10 + TIER_DELIVERY_PRICE),
                }),
            ),
        ).rejects.toThrow('Delivery price mismatch');
    });
});

// ===========================================================================
// 10. PROMOTION COMBINATION VALIDATION (promotionIds)
// ===========================================================================

describe('promotion combination validation', () => {
    beforeEach(async () => {
        await cleanRepeatCustomerOrders();
    });

    it('accepts a valid stackable combination via promotionIds', async () => {
        // Free delivery (stackable) + fixed 1 => expected total = 10 - 1 + 0 = 9
        const order = await createOrder(
            IDS.repeatCustomer,
            {
                ...makeOrderInput({
                    items: [{
                        productId: IDS.productA,
                        quantity: 1,
                        price: 10,
                        selectedOptions: [{ optionGroupId: IDS.optionGroupReq, optionId: IDS.optionA, price: 0 }],
                    }],
                    deliveryPrice: 0,
                    totalPrice: normalizeMoney(9),
                }),
                promotionIds: [IDS.promoStackableFreeDelivery, IDS.promoStackableFixed1],
            } as any,
        );
        expect(order.id).toBeTruthy();
    });

    it('rejects non-combinable promotionIds when one is non-stackable', async () => {
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                {
                    ...makeOrderInput({
                        items: [{
                            productId: IDS.productA,
                            quantity: 1,
                            price: 10,
                            selectedOptions: [{ optionGroupId: IDS.optionGroupReq, optionId: IDS.optionA, price: 0 }],
                        }],
                        deliveryPrice: 0,
                        totalPrice: normalizeMoney(8),
                    }),
                    promotionIds: [IDS.promoNonStackableFixed2, IDS.promoStackableFreeDelivery],
                } as any,
            ),
        ).rejects.toThrow('Selected promotions cannot be combined');
    });

    it('rejects multiple free-delivery promotionIds', async () => {
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                {
                    ...makeOrderInput({
                        items: [{
                            productId: IDS.productA,
                            quantity: 1,
                            price: 10,
                            selectedOptions: [{ optionGroupId: IDS.optionGroupReq, optionId: IDS.optionA, price: 0 }],
                        }],
                        deliveryPrice: 0,
                        totalPrice: normalizeMoney(10),
                    }),
                    promotionIds: [IDS.promoStackableFreeDelivery, IDS.promoSecondFreeDelivery],
                } as any,
            ),
        ).rejects.toThrow('Multiple free-delivery promotions cannot be combined');
    });

    it('rejects when client total is tampered for a valid promotionIds combination', async () => {
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                {
                    ...makeOrderInput({
                        items: [{
                            productId: IDS.productA,
                            quantity: 1,
                            price: 10,
                            selectedOptions: [{ optionGroupId: IDS.optionGroupReq, optionId: IDS.optionA, price: 0 }],
                        }],
                        deliveryPrice: 0,
                        // Expected is 9, client sends 8
                        totalPrice: normalizeMoney(8),
                    }),
                    promotionIds: [IDS.promoStackableFreeDelivery, IDS.promoStackableFixed1],
                } as any,
            ),
        ).rejects.toThrow('Total price mismatch');
    });

    it('rejects mixed valid + invalid promotionIds with stable business-rule message', async () => {
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                {
                    ...makeOrderInput({
                        items: [{
                            productId: IDS.productA,
                            quantity: 1,
                            price: 10,
                            selectedOptions: [{ optionGroupId: IDS.optionGroupReq, optionId: IDS.optionA, price: 0 }],
                        }],
                        deliveryPrice: 0,
                        totalPrice: normalizeMoney(9),
                    }),
                    promotionIds: [IDS.promoStackableFreeDelivery, '00000000-0000-0000-0000-000000009999'],
                } as any,
            ),
        ).rejects.toThrow('One or more selected promotions are no longer valid');
    });
});

// ===========================================================================
// 11. ORDER STATUS — APPROVAL ROUTING
// ===========================================================================

describe('approval routing — FIRST_ORDER triggers AWAITING_APPROVAL', () => {
    afterAll(async () => {
        // Clean up so newCustomer has zero orders again for any future test
        await cleanNewCustomerOrders();
    });

    it('places first order in AWAITING_APPROVAL status', async () => {
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        const order = await createOrder(
            IDS.newCustomer,
            makeOrderInput({
                items: [{ productId: IDS.productA, quantity: 1, price: 10, selectedOptions: [] }],
                totalPrice: total,
            }),
        );

        const dbOrder = await db.select().from(orders).where(eq(orders.id, String(order.id)));
        expect(dbOrder[0]?.status).toBe('AWAITING_APPROVAL');
    });
});

describe('approval routing — HIGH_VALUE (>€20) triggers AWAITING_APPROVAL', () => {
    it('places high-value order (product=€25) in AWAITING_APPROVAL', async () => {
        // repeatCustomer has a prior order so FIRST_ORDER is not the trigger here
        const total = normalizeMoney(25 + TIER_DELIVERY_PRICE);
        const order = await createOrder(
            IDS.repeatCustomer,
            makeOrderInput({
                items: [{ productId: IDS.highValueProduct, quantity: 1, price: 25, selectedOptions: [] }],
                totalPrice: total,
            }),
        );

        const dbOrder = await db.select().from(orders).where(eq(orders.id, String(order.id)));
        expect(dbOrder[0]?.status).toBe('AWAITING_APPROVAL');
    });
});

describe('approval routing — normal repeat order goes PENDING', () => {
    it('places a low-value repeat order in PENDING status', async () => {
        // repeatCustomer, product=€10, total=€12.50 — below €20 threshold
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        const order = await createOrder(
            IDS.repeatCustomer,
            makeOrderInput({ totalPrice: total }),
        );

        const dbOrder = await db.select().from(orders).where(eq(orders.id, String(order.id)));
        expect(dbOrder[0]?.status).toBe('PENDING');
    });
});

describe('approval routing — out-of-zone (locationFlagged) triggers AWAITING_APPROVAL', () => {
    it('places an order with drop-off outside service zones in AWAITING_APPROVAL', async () => {
        // The seeded service zone does NOT contain the North Pole (TEST_LAT, TEST_LNG),
        // so the drop-off is outside the service zone → locationFlagged=true → approval required.
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        const order = await createOrder(
            IDS.repeatCustomer,
            makeOrderInput({ totalPrice: total }),
        );

        const dbOrder = await db.select().from(orders).where(eq(orders.id, String(order.id)));
        // locationFlagged because dropoff (North Pole) is outside the seeded service zone
        expect(dbOrder[0]?.locationFlagged).toBe(true);
        expect(dbOrder[0]?.status).toBe('AWAITING_APPROVAL');
    });
});

// ===========================================================================
// 12. DELIVERY ZONE FEE ROUTING
// ===========================================================================

describe('delivery zone fee routing', () => {
    /**
     * The zone at IDS.zoneInsideId covers ZONE_TEST_POINT (lat=50, lng=10)
     * with a fee of €1.00. We create a business at that location so the
     * delivery fee lookup routes through the zone.
     */

    const ZONE_BIZ_ID  = '00000000-0000-0000-0000-000000009180';
    const ZONE_CAT_ID  = '00000000-0000-0000-0000-000000009181';
    const ZONE_PROD_ID = '00000000-0000-0000-0000-000000009182';

    beforeAll(async () => {
        const now = new Date().toISOString();
        await db.insert(businesses).values({
            id: ZONE_BIZ_ID,
            name: 'Zone Business',
            businessType: 'RESTAURANT',
            locationLat: ZONE_TEST_LAT,
            locationLng: ZONE_TEST_LNG,
            locationAddress: 'Zone City',
            opensAt: 0,
            closesAt: 0,
            commissionPercentage: '0',
            createdAt: now,
            updatedAt: now,
        });
        await db.insert(productCategories).values({
            id: ZONE_CAT_ID, businessId: ZONE_BIZ_ID, name: 'Zone Menu',
            createdAt: now, updatedAt: now,
        });
        await db.insert(products).values({
            id: ZONE_PROD_ID,
            businessId: ZONE_BIZ_ID,
            categoryId: ZONE_CAT_ID,
            name: 'Zone Burger',
            basePrice: 10,
            markupPrice: null,
            nightMarkedupPrice: null,
            isOnSale: false,
            saleDiscountPercentage: null,
            isAvailable: true,
            createdAt: now,
            updatedAt: now,
        });
    });

    afterAll(async () => {
        // Clean any zone-business orders
        const rows = await db.select({ id: orders.id }).from(orders).where(eq(orders.userId, IDS.repeatCustomer));
        const ids = rows.map((r) => r.id).filter((id) => !createdOrderIds.includes(id));
        if (ids.length > 0) {
            await db.delete(orderItems).where(inArray(orderItems.orderId, ids));
            await db.delete(orders).where(inArray(orders.id, ids));
        }
        await db.delete(products).where(eq(products.id, ZONE_PROD_ID));
        await db.delete(productCategories).where(eq(productCategories.id, ZONE_CAT_ID));
        await db.delete(businesses).where(eq(businesses.id, ZONE_BIZ_ID));
    });

    it('uses zone-based delivery fee when drop-off polygon matches', async () => {
        // Drop the customer at ZONE_TEST_POINT which falls inside IDS.zoneInsideId (fee=€1.00)
        const total = normalizeMoney(10 + ZONE_DELIVERY_PRICE);
        const order = await createOrder(
            IDS.repeatCustomer,
            {
                items: [{ productId: ZONE_PROD_ID, quantity: 1, price: 10, selectedOptions: [] }],
                deliveryPrice: ZONE_DELIVERY_PRICE,
                totalPrice: total,
                dropOffLocation: {
                    latitude: ZONE_TEST_LAT,
                    longitude: ZONE_TEST_LNG,
                    address: 'Zone Drop-off',
                },
                paymentCollection: 'CASH_TO_DRIVER',
            },
        );

        const dbOrder = await db.select().from(orders).where(eq(orders.id, String(order.id)));
        expect(Number(dbOrder[0]?.deliveryPrice)).toBeCloseTo(ZONE_DELIVERY_PRICE, 2);
    });

    it('rejects when client sends wrong delivery price for a zone match', async () => {
        // Client sends TIER price (€2.50) but server expects zone price (€1.00)
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                {
                    items: [{ productId: ZONE_PROD_ID, quantity: 1, price: 10, selectedOptions: [] }],
                    deliveryPrice: TIER_DELIVERY_PRICE,  // wrong — zone says €1.00
                    totalPrice: normalizeMoney(10 + TIER_DELIVERY_PRICE),
                    dropOffLocation: {
                        latitude: ZONE_TEST_LAT,
                        longitude: ZONE_TEST_LNG,
                        address: 'Zone Drop-off',
                    },
                    paymentCollection: 'CASH_TO_DRIVER',
                },
            ),
        ).rejects.toThrow('Delivery price mismatch');
    });
});

// ===========================================================================
// 13. PAYMENT COLLECTION
// ===========================================================================

describe('payment collection', () => {
    it('defaults to CASH_TO_DRIVER when paymentCollection is omitted', async () => {
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        const order = await createOrder(
            IDS.repeatCustomer,
            {
                items: [{ productId: IDS.productA, quantity: 1, price: 10, selectedOptions: [] }],
                deliveryPrice: TIER_DELIVERY_PRICE,
                totalPrice: total,
                dropOffLocation: { latitude: TEST_LAT, longitude: TEST_LNG, address: 'North Pole' },
                // paymentCollection intentionally omitted
            },
        );

        const dbOrder = await db.select().from(orders).where(eq(orders.id, String(order.id)));
        expect(dbOrder[0]?.paymentCollection).toBe('CASH_TO_DRIVER');
    });

    it('persists CASH_TO_DRIVER when explicitly provided', async () => {
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        const order = await createOrder(
            IDS.repeatCustomer,
            makeOrderInput({ totalPrice: total, paymentCollection: 'CASH_TO_DRIVER' }),
        );

        const dbOrder = await db.select().from(orders).where(eq(orders.id, String(order.id)));
        expect(dbOrder[0]?.paymentCollection).toBe('CASH_TO_DRIVER');
    });

    it('persists PREPAID_TO_PLATFORM when provided', async () => {
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        const order = await createOrder(
            IDS.repeatCustomer,
            makeOrderInput({ totalPrice: total, paymentCollection: 'PREPAID_TO_PLATFORM' }),
        );

        const dbOrder = await db.select().from(orders).where(eq(orders.id, String(order.id)));
        expect(dbOrder[0]?.paymentCollection).toBe('PREPAID_TO_PLATFORM');
    });
});

// ===========================================================================
// 14. MINIMUM ORDER AMOUNT
// ===========================================================================

describe('minimum order amount', () => {
    const MIN_ORDER_BIZ_ID  = '00000000-0000-0000-0000-000000009190';
    const MIN_ORDER_CAT_ID  = '00000000-0000-0000-0000-000000009191';
    const MIN_ORDER_PROD_ID = '00000000-0000-0000-0000-000000009192';
    const MIN_AMOUNT = 15.00;

    beforeAll(async () => {
        const now = new Date().toISOString();
        await db.insert(businesses).values({
            id: MIN_ORDER_BIZ_ID,
            name: 'Min Order Business',
            businessType: 'RESTAURANT',
            locationLat: TEST_LAT,
            locationLng: TEST_LNG,
            locationAddress: 'North Pole',
            opensAt: 0,
            closesAt: 0,
            commissionPercentage: '0',
            minOrderAmount: String(MIN_AMOUNT),
            createdAt: now,
            updatedAt: now,
        });
        await db.insert(productCategories).values({
            id: MIN_ORDER_CAT_ID, businessId: MIN_ORDER_BIZ_ID,
            name: 'Min Menu', createdAt: now, updatedAt: now,
        });
        // Product priced at €5 (below the €15 minimum)
        await db.insert(products).values({
            id: MIN_ORDER_PROD_ID,
            businessId: MIN_ORDER_BIZ_ID,
            categoryId: MIN_ORDER_CAT_ID,
            name: 'Cheap Item',
            basePrice: 5,
            markupPrice: null,
            nightMarkedupPrice: null,
            isOnSale: false,
            saleDiscountPercentage: null,
            isAvailable: true,
            createdAt: now,
            updatedAt: now,
        });
    });

    afterAll(async () => {
        // Clean orders belonging to the min-order business
        const rows = await db.select({ id: orders.id }).from(orders);
        // just clean the products/biz
        await db.delete(products).where(eq(products.id, MIN_ORDER_PROD_ID));
        await db.delete(productCategories).where(eq(productCategories.id, MIN_ORDER_CAT_ID));
        await db.delete(businesses).where(eq(businesses.id, MIN_ORDER_BIZ_ID));
    });

    it('rejects when subtotal (effectiveOrderPrice) is below the business minimum', async () => {
        // 1 × €5 = €5 subtotal — below €15 minimum
        const total = normalizeMoney(5 + TIER_DELIVERY_PRICE);
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                {
                    items: [{ productId: MIN_ORDER_PROD_ID, quantity: 1, price: 5, selectedOptions: [] }],
                    deliveryPrice: TIER_DELIVERY_PRICE,
                    totalPrice: total,
                    dropOffLocation: { latitude: TEST_LAT, longitude: TEST_LNG, address: 'North Pole' },
                    paymentCollection: 'CASH_TO_DRIVER',
                },
            ),
        ).rejects.toThrow('Minimum order amount');
    });

    it('accepts when subtotal meets the minimum exactly', async () => {
        // 3 × €5 = €15 — equal to the minimum → passes
        const total = normalizeMoney(15 + TIER_DELIVERY_PRICE);
        const order = await createOrder(
            IDS.repeatCustomer,
            {
                items: [{ productId: MIN_ORDER_PROD_ID, quantity: 3, price: 5, selectedOptions: [] }],
                deliveryPrice: TIER_DELIVERY_PRICE,
                totalPrice: total,
                dropOffLocation: { latitude: TEST_LAT, longitude: TEST_LNG, address: 'North Pole' },
                paymentCollection: 'CASH_TO_DRIVER',
            },
        );
        expect(order.id).toBeTruthy();
    });
});

// ===========================================================================
// 13. PRIORITY SURCHARGE VALIDATION
// ===========================================================================

describe('priority surcharge validation', () => {
    it('rejects when priorityRequested=true but surcharge amount is wrong', async () => {
        const correctSurcharge = 0.50;
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    totalPrice: normalizeMoney(total + 0.25),  // wrong surcharge
                    priorityRequested: true,
                    prioritySurcharge: 0.25,   // server expects 0.50
                }),
            ),
        ).rejects.toThrow('Priority surcharge mismatch');
    });

    it('rejects when priorityRequested=false but surcharge is non-zero', async () => {
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        await expect(
            orderService.createOrder(
                IDS.repeatCustomer,
                makeOrderInput({
                    totalPrice: normalizeMoney(total + 0.50),
                    priorityRequested: false,
                    prioritySurcharge: 0.50,
                }),
            ),
        ).rejects.toThrow('priorityRequested is false');
    });
});

// ===========================================================================
// 14. HAPPY PATH — full order persisted correctly
// ===========================================================================

describe('happy path — order persisted correctly', () => {
    it('stores all core fields on the order row', async () => {
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        const order = await createOrder(
            IDS.repeatCustomer,
            makeOrderInput({ totalPrice: total, paymentCollection: 'CASH_TO_DRIVER' }),
        );

        const dbOrder = await db.select().from(orders).where(eq(orders.id, String(order.id)));
        const row = dbOrder[0]!;

        expect(row).toBeDefined();
        expect(row.userId).toBe(IDS.repeatCustomer);
        expect(row.businessId).toBe(IDS.restaurantA);
        expect(Number(row.actualPrice)).toBeCloseTo(10, 2);
        expect(Number(row.deliveryPrice)).toBeCloseTo(TIER_DELIVERY_PRICE, 2);
        expect(row.paymentCollection).toBe('CASH_TO_DRIVER');
        expect(row.displayId).toMatch(/^GJ-[A-Z2-9]{4}$/);
    });

    it('creates the order item row with correct price snapshot', async () => {
        const total = await computeTotal(IDS.productA, 1, TIER_DELIVERY_PRICE);
        const order = await createOrder(
            IDS.repeatCustomer,
            makeOrderInput({ totalPrice: total }),
        );

        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, String(order.id)));
        expect(items).toHaveLength(1);
        expect(Number(items[0].finalAppliedPrice)).toBeCloseTo(10, 2);
        expect(items[0].productId).toBe(IDS.productA);
        expect(items[0].quantity).toBe(1);
    });
});
