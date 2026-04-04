/**
 * Stress-test seed script.
 * Creates isolated test accounts (prefixed with `stress_`) for k6 load tests.
 * Safe to re-run — idempotent via upsertUser.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/seed-stress-test.ts
 *
 * Output:
 *   Writes tests/k6/fixtures.json so k6 scripts can read credentials/IDs.
 */

import { getDB } from '../database';
import { businesses, NewDbBusiness } from '../database/schema/businesses';
import { businessHours } from '../database/schema/businessHours';
import { productCategories } from '../database/schema/productCategories';
import { products, NewDbProduct } from '../database/schema/products';
import { users, NewDbUser } from '../database/schema/users';
import { drivers } from '../database/schema/drivers';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../src/lib/utils/authUtils';
import * as fs from 'fs';
import * as path from 'path';

const STRESS_PASSWORD = 'StressTest123!';
const CUSTOMER_COUNT = 30;
const DRIVER_COUNT = 5;
const BUSINESS_COUNT = 5;
const PRODUCTS_PER_BUSINESS = 6;

// Gjilan city centre bounding box
const GJILAN = { lat: 42.4604, lng: 21.4694 };
function jitter(base: number, range: number) {
    return base + (Math.random() * range * 2 - range);
}

async function upsertUser(db: Awaited<ReturnType<typeof getDB>>, data: NewDbUser) {
    const existing = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existing.length > 0) return existing[0]!;
    const [created] = await db.insert(users).values(data).returning();
    return created!;
}

async function main() {
    console.log('🔧 Seeding stress-test fixtures...\n');
    const db = await getDB();
    const hashedPassword = await hashPassword(STRESS_PASSWORD);

    // ── Customers ────────────────────────────────────────────────────────────
    const customerCredentials: Array<{ email: string; password: string; id: string }> = [];

    for (let i = 1; i <= CUSTOMER_COUNT; i++) {
        const email = `stress_customer_${i}@test.local`;
        const user = await upsertUser(db, {
            id: require('crypto').randomUUID(),
            firstName: `Customer`,
            lastName: `${i}`,
            email,
            password: hashedPassword,
            role: 'CUSTOMER',
            emailVerified: true,
            phoneVerified: true,
            signupStep: 'COMPLETED',
        });
        customerCredentials.push({ email, password: STRESS_PASSWORD, id: user.id });
    }
    console.log(`✅ ${CUSTOMER_COUNT} stress customers ready`);

    // ── Drivers ──────────────────────────────────────────────────────────────
    const driverCredentials: Array<{ email: string; password: string; id: string; driverId?: string }> = [];

    for (let i = 1; i <= DRIVER_COUNT; i++) {
        const email = `stress_driver_${i}@test.local`;
        const user = await upsertUser(db, {
            id: require('crypto').randomUUID(),
            firstName: `Driver`,
            lastName: `${i}`,
            email,
            password: hashedPassword,
            role: 'DRIVER',
            emailVerified: true,
            phoneVerified: true,
            signupStep: 'COMPLETED',
        });

        // Upsert driver profile
        let existingDriver = await db.select().from(drivers).where(eq(drivers.userId, user.id)).limit(1);
        if (existingDriver.length === 0) {
            await db.insert(drivers).values({
                userId: user.id,
                driverLat: jitter(GJILAN.lat, 0.02),
                driverLng: jitter(GJILAN.lng, 0.02),
                onlinePreference: true,
                connectionStatus: 'CONNECTED',
                commissionPercentage: '20',
                maxActiveOrders: '3',
                lastHeartbeatAt: new Date().toISOString(),
                lastLocationUpdate: new Date().toISOString(),
            });
            existingDriver = await db.select().from(drivers).where(eq(drivers.userId, user.id)).limit(1);
        }

        driverCredentials.push({
            email,
            password: STRESS_PASSWORD,
            id: user.id,
            driverId: existingDriver[0]?.id,
        });
    }
    console.log(`✅ ${DRIVER_COUNT} stress drivers ready`);

    // ── Businesses + Products ─────────────────────────────────────────────────
    const businessFixtures: Array<{
        id: string;
        name: string;
        products: Array<{ id: string; name: string; price: number }>;
    }> = [];

    const BUSINESS_OWNER_EMAIL = 'stress_owner@test.local';
    const owner = await upsertUser(db, {
        id: require('crypto').randomUUID(),
        firstName: 'Stress',
        lastName: 'Owner',
        email: BUSINESS_OWNER_EMAIL,
        password: hashedPassword,
        role: 'BUSINESS_OWNER',
        emailVerified: true,
        phoneVerified: true,
        signupStep: 'COMPLETED',
    });

    for (let b = 1; b <= BUSINESS_COUNT; b++) {
        const bizName = `Stress Restaurant ${b}`;

        const existingBiz = await db.select().from(businesses).where(eq(businesses.name, bizName)).limit(1);
        let bizId: string;

        if (existingBiz.length > 0) {
            bizId = existingBiz[0]!.id;
            console.log(`  ⚡ Business already exists: ${bizName}`);
        } else {
            const [createdBiz] = await db
                .insert(businesses)
                .values({
                    name: bizName,
                    description: `Auto-generated stress test business #${b}`,
                    businessType: 'RESTAURANT',
                    locationLat: jitter(GJILAN.lat, 0.01),
                    locationLng: jitter(GJILAN.lng, 0.01),
                    locationAddress: `Gjilan Street ${b}`,
                    opensAt: 0,
                    closesAt: 1439,
                    isActive: true,
                    isTemporarilyClosed: false,
                    avgPrepTimeMinutes: 15,
                    commissionPercentage: '15',
                    minOrderAmount: '2',
                    ownerId: owner.id,
                } as NewDbBusiness)
                .returning();
            bizId = createdBiz!.id;

            // Add 24/7 schedule for all 7 days
            const scheduleSlots = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
                businessId: bizId,
                dayOfWeek: day,
                opensAt: 0,
                closesAt: 1439,
            }));
            await db.insert(businessHours).values(scheduleSlots);
        }

        // Category + products
        const existingCat = await db
            .select()
            .from(productCategories)
            .where(eq(productCategories.businessId, bizId))
            .limit(1);

        let categoryId: string;
        if (existingCat.length > 0) {
            categoryId = existingCat[0]!.id;
        } else {
            const [cat] = await db
                .insert(productCategories)
                .values({ businessId: bizId, name: 'Main Menu', sortOrder: 0 })
                .returning();
            categoryId = cat!.id;
        }

        const existingProducts = await db
            .select()
            .from(products)
            .where(eq(products.businessId, bizId));

        const bizProducts: Array<{ id: string; name: string; price: number }> = [];

        if (existingProducts.length > 0) {
            for (const p of existingProducts) {
                bizProducts.push({ id: p.id, name: p.name, price: Number(p.basePrice) });
            }
        } else {
            const PRODUCT_NAMES = [
                'Burger', 'Pizza Slice', 'Kebab', 'Salad', 'Wrap', 'Fries',
                'Sandwich', 'Pasta', 'Soup', 'Grilled Chicken',
            ];

            for (let p = 0; p < PRODUCTS_PER_BUSINESS; p++) {
                const name = PRODUCT_NAMES[p % PRODUCT_NAMES.length]!;
                const price = +(2.5 + p * 0.5).toFixed(2);
                const [prod] = await db
                    .insert(products)
                    .values({
                        businessId: bizId,
                        categoryId,
                        name: `${name} (Stress)`,
                        description: `Stress test product ${p + 1}`,
                        basePrice: price,
                        markupPrice: +(price * 1.1).toFixed(2),
                        isAvailable: true,
                        sortOrder: p,
                    } satisfies NewDbProduct)
                    .returning();
                bizProducts.push({ id: prod!.id, name: prod!.name, price });
            }
        }

        businessFixtures.push({ id: bizId, name: bizName, products: bizProducts });
    }
    console.log(`✅ ${BUSINESS_COUNT} stress businesses + products ready`);

    // ── Write fixtures.json ───────────────────────────────────────────────────
    const fixtures = {
        apiUrl: 'http://localhost:4000',
        password: STRESS_PASSWORD,
        stressSecret: process.env.STRESS_TEST_SECRET ?? '',
        customers: customerCredentials,
        drivers: driverCredentials,
        businesses: businessFixtures,
        // Pre-built valid order payloads, one per business
        sampleOrders: businessFixtures.map((biz) => {
            const product = biz.products[0]!;
            const markupPrice = +(product.price * 1.1).toFixed(2);
            // The local stress fixture currently targets the default delivery fee path.
            // Keep deliveryPrice aligned with the server-authoritative value so the
            // benchmark measures order creation work instead of validation failures.
            const expectedDelivery = 2.0;
            return {
                businessId: biz.id,
                payload: {
                    items: [
                        {
                            productId: product.id,
                            price: markupPrice,
                            quantity: 1,
                            notes: '',
                            selectedOptions: [],
                        },
                    ],
                    totalPrice: +(markupPrice + expectedDelivery).toFixed(2),
                    deliveryPrice: expectedDelivery,
                    dropOffLocation: {
                        latitude: jitter(GJILAN.lat, 0.01),
                        longitude: jitter(GJILAN.lng, 0.01),
                        address: 'Stress Test Drop-off, Gjilan',
                    },
                    paymentCollection: 'CASH_TO_DRIVER',
                },
            };
        }),
    };

    const outDir = path.resolve(__dirname, '../tests/k6');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'fixtures.json');
    fs.writeFileSync(outPath, JSON.stringify(fixtures, null, 2));

    console.log(`\n📦 Fixtures written → ${outPath}`);
    console.log(`\n🎯 Ready to run k6 tests against http://localhost:4000`);
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
