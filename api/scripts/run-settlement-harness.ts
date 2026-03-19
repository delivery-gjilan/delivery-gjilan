import 'dotenv/config';
import { and, eq, inArray } from 'drizzle-orm';
import { getDB } from '../database';
import {
    orderItemOptions,
    orderItems,
    orderPromotions,
    orders,
    products,
    promotionUsage,
    settlements,
} from '../database/schema';
import { AuthRepository } from '../src/repositories/AuthRepository';
import { OrderRepository } from '../src/repositories/OrderRepository';
import { ProductRepository } from '../src/repositories/ProductRepository';
import { pubsub } from '../src/lib/pubsub';
import { OrderService } from '../src/services/OrderService';
import { SettlementScenarioHarnessService } from '../src/services/SettlementScenarioHarnessService';

const COLORS = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
} as const;

const SYMBOLS = {
    pass: '✓',
    fail: '✗',
};

function paint(text: string, color: keyof typeof COLORS) {
    return `${COLORS[color]}${text}${COLORS.reset}`;
}

function printSummary(total: number, passed: number, failed: number) {
    const passText = paint(`${SYMBOLS.pass} ${passed} passed`, 'green');
    const failText = failed > 0
        ? paint(`${SYMBOLS.fail} ${failed} failed`, 'red')
        : paint(`${SYMBOLS.fail} ${failed} failed`, 'dim');

    console.log(`${paint('Settlement Harness Summary', 'bold')}`);
    console.log(`${paint(`Total: ${total}`, 'cyan')} | ${passText} | ${failText}`);
}

type CheckResult = {
    id: string;
    name: string;
    passed: boolean;
    details: string[];
    lookHere?: string;
};

function getEffectiveProductPrice(product: {
    basePrice: string | number;
    isOnSale?: boolean | null;
    salePrice?: string | number | null;
    markupPrice?: string | number | null;
    nightMarkedupPrice?: string | number | null;
}) {
    const nowHour = new Date().getHours();
    const isNightHours = nowHour >= 20 || nowHour < 6;

    const basePrice = Number(product.basePrice ?? 0);
    const salePrice = product.salePrice != null ? Number(product.salePrice) : null;
    const markupPrice = product.markupPrice != null ? Number(product.markupPrice) : null;
    const nightMarkedupPrice = product.nightMarkedupPrice != null ? Number(product.nightMarkedupPrice) : null;

    if (product.isOnSale && salePrice != null) {
        return salePrice;
    }
    if (isNightHours && nightMarkedupPrice != null) {
        return nightMarkedupPrice;
    }
    if (markupPrice != null) {
        return markupPrice;
    }
    return basePrice;
}

function countMismatchCategories(mismatches: string[]) {
    let missingExpected = 0;
    let unexpected = 0;
    for (const mismatch of mismatches) {
        if (mismatch.includes('Missing expected settlement')) missingExpected += 1;
        if (mismatch.includes('Unexpected settlement')) unexpected += 1;
    }
    return { missingExpected, unexpected };
}

async function runOrderCreationChecks(): Promise<CheckResult[]> {
    const db = await getDB();
    const authRepository = new AuthRepository(db as any);
    const productRepository = new ProductRepository(db as any);
    const orderRepository = new OrderRepository();
    const orderService = new OrderService(orderRepository, authRepository, productRepository, pubsub);

    const customerUserId = '00000000-0000-0000-0000-000000000101';
    const productAId = '00000000-0000-0000-0000-000000000401';
    const businessAId = '00000000-0000-0000-0000-000000000201';

    const [productA] = await db
        .select()
        .from(products)
        .where(eq(products.id, productAId));

    if (!productA) {
        return [{
            id: 'order-seed-data-available',
            name: 'Seed data is available for order creation checks',
            passed: false,
            details: ['Product A was not found. Settlement harness seed data may be missing.'],
            lookHere: 'src/services/SettlementScenarioHarnessService.ts',
        }];
    }

    const expectedDeliveryPrice: number = await (orderService as any).calculateExpectedDeliveryPrice({
        businessId: businessAId,
        dropoffLat: 42.463,
        dropoffLng: 21.469,
    });

    const subtotal = getEffectiveProductPrice(productA as any);
    const createdOrderIds: string[] = [];
    const results: CheckResult[] = [];

    async function runCheck(id: string, name: string, exec: () => Promise<void>, lookHere?: string) {
        try {
            await exec();
            results.push({ id, name, passed: true, details: [] });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            results.push({ id, name, passed: false, details: [message], lookHere });
        }
    }

    const makeInput = (overrides?: Record<string, unknown>) => ({
        items: [
            {
                productId: productAId,
                quantity: 1,
                price: subtotal,
                notes: null,
                selectedOptions: [],
                childItems: [],
            },
        ],
        dropOffLocation: {
            latitude: 42.463,
            longitude: 21.469,
            address: 'Order Creation Test Dropoff',
        },
        deliveryPrice: expectedDeliveryPrice,
        totalPrice: subtotal + expectedDeliveryPrice,
        promoCode: null,
        driverNotes: 'order-creation-test',
        ...overrides,
    });

    await runCheck(
        'order-default-payment-collection',
        'Create order defaults paymentCollection to CASH_TO_DRIVER',
        async () => {
            const order = await orderService.createOrder(customerUserId, makeInput() as any);
            createdOrderIds.push(String(order.id));
            if (order.paymentCollection !== 'CASH_TO_DRIVER') {
                throw new Error(`Expected CASH_TO_DRIVER, got ${order.paymentCollection}`);
            }
        },
        'src/services/OrderService.ts',
    );

    await runCheck(
        'order-explicit-prepaid-payment-collection',
        'Create order honors explicit PREPAID_TO_PLATFORM',
        async () => {
            const order = await orderService.createOrder(
                customerUserId,
                makeInput({ paymentCollection: 'PREPAID_TO_PLATFORM' }) as any,
            );
            createdOrderIds.push(String(order.id));
            if (order.paymentCollection !== 'PREPAID_TO_PLATFORM') {
                throw new Error(`Expected PREPAID_TO_PLATFORM, got ${order.paymentCollection}`);
            }
        },
        'src/services/OrderService.ts',
    );

    await runCheck(
        'order-delivery-price-validation',
        'Create order rejects mismatched delivery price',
        async () => {
            let failedAsExpected = false;
            try {
                await orderService.createOrder(
                    customerUserId,
                    makeInput({
                        deliveryPrice: expectedDeliveryPrice + 1,
                        totalPrice: subtotal + expectedDeliveryPrice + 1,
                    }) as any,
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                failedAsExpected = message.includes('Delivery price mismatch');
            }

            if (!failedAsExpected) {
                throw new Error('Expected delivery price mismatch error, but order was accepted or failed for a different reason.');
            }
        },
        'src/services/OrderService.ts',
    );

    await runCheck(
        'order-total-price-validation',
        'Create order rejects mismatched total price',
        async () => {
            let failedAsExpected = false;
            try {
                await orderService.createOrder(
                    customerUserId,
                    makeInput({ totalPrice: subtotal + expectedDeliveryPrice + 3 }) as any,
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                failedAsExpected = message.includes('Price mismatch');
            }

            if (!failedAsExpected) {
                throw new Error('Expected total price mismatch error, but order was accepted or failed for a different reason.');
            }
        },
        'src/services/OrderService.ts',
    );

    await runCheck(
        'order-invalid-promo-code',
        'Create order rejects invalid promo code',
        async () => {
            let failedAsExpected = false;
            try {
                await orderService.createOrder(
                    customerUserId,
                    makeInput({ promoCode: 'INVALID-CODE-TEST' }) as any,
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                failedAsExpected = message.includes('Invalid promo code');
            }

            if (!failedAsExpected) {
                throw new Error('Expected invalid promo code error, but order was accepted or failed for a different reason.');
            }
        },
        'src/services/OrderService.ts',
    );

    if (createdOrderIds.length > 0) {
        const rows = await db
            .select({ id: orderItems.id })
            .from(orderItems)
            .where(inArray(orderItems.orderId, createdOrderIds));
        const orderItemIds = rows.map((row) => row.id);

        await db.delete(orderPromotions).where(inArray(orderPromotions.orderId, createdOrderIds));
        await db.delete(promotionUsage).where(inArray(promotionUsage.orderId, createdOrderIds));
        await db.delete(settlements).where(inArray(settlements.orderId, createdOrderIds));

        if (orderItemIds.length > 0) {
            await db.delete(orderItemOptions).where(inArray(orderItemOptions.orderItemId, orderItemIds));
        }

        await db.delete(orderItems).where(inArray(orderItems.orderId, createdOrderIds));
        await db.delete(orders).where(inArray(orders.id, createdOrderIds));
    }

    return results;
}

async function main() {
    const db = await getDB();
    const service = new SettlementScenarioHarnessService(db as any);
    const result = await service.runHarness(null);

    console.log();
    printSummary(result.total, result.passedCount, result.failedCount);
    console.log();

    for (const scenario of result.results) {
        const symbol = scenario.passed ? paint(SYMBOLS.pass, 'green') : paint(SYMBOLS.fail, 'red');
        const label = scenario.passed ? paint('PASS', 'green') : paint('FAIL', 'red');
        console.log(
            `${symbol} ${label} ${scenario.scenarioId} ${paint('-', 'dim')} ${scenario.name} ${paint(`(expected ${scenario.expectedCount}, actual ${scenario.actualCount})`, 'dim')}`,
        );

        if (!scenario.passed) {
            const mismatchCategories = countMismatchCategories(scenario.mismatches);
            for (const mismatch of scenario.mismatches) {
                console.log(`   ${paint('-', 'yellow')} ${paint(mismatch, 'yellow')}`);
            }

            console.log(
                `   ${paint('Mismatch categories:', 'yellow')} missing expected=${mismatchCategories.missingExpected}, unexpected=${mismatchCategories.unexpected}`,
            );

            console.log(`   ${paint('Look here:', 'cyan')} src/services/SettlementScenarioHarnessService.ts (scenarioId: ${scenario.scenarioId})`);
            console.log('');
        }
    }

    console.log();

    const orderChecks = await runOrderCreationChecks();
    const failedOrderChecks = orderChecks.filter((check) => !check.passed);

    console.log(paint('Order Creation Checks', 'bold'));
    for (const check of orderChecks) {
        const symbol = check.passed ? paint(SYMBOLS.pass, 'green') : paint(SYMBOLS.fail, 'red');
        const label = check.passed ? paint('PASS', 'green') : paint('FAIL', 'red');
        console.log(`${symbol} ${label} ${check.id} ${paint('-', 'dim')} ${check.name}`);
        if (!check.passed) {
            for (const detail of check.details) {
                console.log(`   ${paint('-', 'yellow')} ${paint(detail, 'yellow')}`);
            }
            if (check.lookHere) {
                console.log(`   ${paint('Look here:', 'cyan')} ${check.lookHere}`);
            }
        }
    }

    console.log();

    const totalChecks = result.total + orderChecks.length;
    const totalPassed = result.passedCount + orderChecks.filter((c) => c.passed).length;
    const totalFailed = totalChecks - totalPassed;

    console.log(paint('Preflight Suite Summary', 'bold'));
    console.log(`${paint(`Total checks: ${totalChecks}`, 'cyan')} | ${paint(`${SYMBOLS.pass} ${totalPassed} passed`, 'green')} | ${totalFailed > 0 ? paint(`${SYMBOLS.fail} ${totalFailed} failed`, 'red') : paint(`${SYMBOLS.fail} ${totalFailed} failed`, 'dim')}`);

    const overallPassed = result.passed && failedOrderChecks.length === 0;

    if (!overallPassed) {
        const failedScenarioIds = result.results
            .filter((r) => !r.passed)
            .map((r) => r.scenarioId);
        const failedOrderCheckIds = failedOrderChecks.map((c) => c.id);

        console.error(paint('Preflight suite failed. Fix failing checks and re-run `npm run test:api:preflight`.', 'red'));
        if (failedScenarioIds.length > 0) {
            console.error(paint(`Failed settlement scenarios: ${failedScenarioIds.join(', ')}`, 'red'));
        }
        if (failedOrderCheckIds.length > 0) {
            console.error(paint(`Failed order checks: ${failedOrderCheckIds.join(', ')}`, 'red'));
        }
        process.exit(1);
    }

    console.log(paint('All preflight checks passed.', 'green'));
}

main().catch((error) => {
    console.error('[settlement-harness] error', error);
    process.exit(1);
});
