import { getDB } from '.';
import { businesses, NewDbBusiness } from './schema/businesses';
import { businessHours } from './schema/businessHours';
import { productCategories, NewDbProductCategory } from './schema/productCategories';
import { productSubcategories, NewDbProductSubcategory } from './schema/productSubcategories';
import { products, NewDbProduct } from './schema/products';

import { users } from './schema/users';
import { drivers } from './schema/drivers';
import { promotions, userPromotions, promotionBusinessEligibility, userPromoMetadata } from './schema/promotions';
import { settlementRules } from './schema/settlementRules';
import { hashPassword } from '@/lib/utils/authUtils';
import { sql, eq } from 'drizzle-orm';

const OPEN_12_AM = 0; // 12:00 AM
const CLOSE_11_59_PM = 1439; // 11:59 PM

// Restaurant data with curated products and realistic images
const RESTAURANTS_DATA = [
    {
        name: 'Cima',
        type: 'RESTAURANT' as const,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
        lat: 42.466873,
        lng: 21.460266,
        categories: [
            {
                name: 'Burgers',
                products: [
                    { name: 'Hamburger', price: 2.00, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', desc: 'Classic hamburger' },
                    { name: 'Chicken Burger', price: 2.00, image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&q=80', desc: 'Crispy chicken burger' },
                ],
            },
        ],
    },
];

const MARKET_DATA = [
    {
        name: 'Arti Market',
        type: 'MARKET' as const,
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
        opensAt: 480, // 08:00
        closesAt: 1320, // 22:00
        categories: [
            {
                name: 'Produce',
                subcategories: [
                    {
                        name: 'Fruits',
                        products: [
                            { name: 'Bananas (1kg)', price: 1.29, image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&q=80', desc: 'Fresh ripe bananas' },
                            { name: 'Apples (1kg)', price: 2.49, image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800&q=80', desc: 'Crisp red apples' },
                        ],
                    },
                    {
                        name: 'Vegetables',
                        products: [
                            { name: 'Tomatoes (1kg)', price: 2.19, image: 'https://images.unsplash.com/photo-1561136594-7f68413baa99?w=800&q=80', desc: 'Juicy vine tomatoes' },
                            { name: 'Cucumbers (1kg)', price: 1.59, image: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=800&q=80', desc: 'Fresh cucumbers' },
                            { name: 'Lettuce', price: 1.09, image: 'https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=800&q=80', desc: 'Crisp green lettuce' },
                            { name: 'Potatoes (2kg)', price: 2.99, image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&q=80', desc: 'Golden potatoes' },
                        ],
                    },
                ],
            },
            {
                name: 'Dairy',
                subcategories: [
                    {
                        name: 'Milk & Yogurt',
                        products: [
                            { name: 'Milk 1L', price: 1.19, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80', desc: 'Fresh whole milk' },
                            { name: 'Greek Yogurt', price: 1.49, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80', desc: 'Plain Greek yogurt 500g' },
                        ],
                    },
                    {
                        name: 'Cheese & Eggs',
                        products: [
                            { name: 'Cheddar Cheese', price: 2.79, image: 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=800&q=80', desc: 'Cheddar block 200g' },
                            { name: 'Mozzarella', price: 2.19, image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=800&q=80', desc: 'Fresh mozzarella' },
                            { name: 'Butter', price: 2.29, image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&q=80', desc: 'Creamy butter 250g' },
                            { name: 'Eggs (10 pack)', price: 2.49, image: 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?w=800&q=80', desc: 'Free-range eggs' },
                        ],
                    },
                ],
            },
            {
                name: 'Bakery',
                subcategories: [
                    {
                        name: 'Bread',
                        products: [
                            { name: 'White Bread', price: 1.29, image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&q=80', desc: 'Soft sliced bread' },
                            { name: 'Whole Wheat Bread', price: 1.49, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80', desc: 'Whole wheat loaf' },
                            { name: 'Pita Bread', price: 1.19, image: 'https://images.unsplash.com/photo-1604908553728-95b6b0b2b4f6?w=800&q=80', desc: 'Soft pita bread' },
                        ],
                    },
                    {
                        name: 'Pastries',
                        products: [
                            { name: 'Croissant', price: 0.99, image: 'https://images.unsplash.com/photo-1542834369-f10ebf06d3cb?w=800&q=80', desc: 'Buttery croissant' },
                            { name: 'Bagels (4 pack)', price: 2.39, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80', desc: 'Fresh baked bagels' },
                            { name: 'Muffins (4 pack)', price: 2.89, image: 'https://images.unsplash.com/photo-1519682577862-22b62b24e493?w=800&q=80', desc: 'Blueberry muffins' },
                        ],
                    },
                ],
            },
            {
                name: 'Beverages',
                subcategories: [
                    {
                        name: 'Soft Drinks',
                        products: [
                            { name: 'Mineral Water 1.5L', price: 0.89, image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&q=80', desc: 'Sparkling mineral water' },
                            { name: 'Cola 2L', price: 1.79, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800&q=80', desc: 'Classic cola' },
                            { name: 'Iced Tea 1.5L', price: 1.59, image: 'https://images.unsplash.com/photo-1527169402691-feff5539e52c?w=800&q=80', desc: 'Peach iced tea' },
                            { name: 'Energy Drink', price: 1.49, image: 'https://images.unsplash.com/photo-1607622750671-6cd9a99f3a57?w=800&q=80', desc: 'Energy boost 250ml' },
                            { name: 'Lemonade 1L', price: 1.39, image: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9c?w=800&q=80', desc: 'Fresh squeezed lemonade' },
                            { name: 'Sprite 2L', price: 1.79, image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800&q=80', desc: 'Lemon-lime soda' },
                            { name: 'Fanta Orange 2L', price: 1.79, image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=80', desc: 'Orange flavored soda' },
                            { name: 'Pepsi 2L', price: 1.79, image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&q=80', desc: 'Classic Pepsi cola' },
                            { name: 'Ginger Ale 1.5L', price: 1.69, image: 'https://images.unsplash.com/photo-1574256788355-8f6f0f20063c?w=800&q=80', desc: 'Refreshing ginger ale' },
                            { name: 'Tonic Water 1L', price: 1.29, image: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80', desc: 'Quinine tonic water' },
                            { name: 'Mountain Dew 1.5L', price: 1.79, image: 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=800&q=80', desc: 'Citrus blast soda' },
                        ],
                    },
                    {
                        name: 'Juices & Coffee',
                        products: [
                            { name: 'Orange Juice', price: 2.19, image: 'https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=800&q=80', desc: '100% orange juice' },
                            { name: 'Coffee Beans 250g', price: 4.99, image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80', desc: 'Medium roast coffee beans' },
                            { name: 'Apple Juice 1L', price: 2.29, image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&q=80', desc: 'Pure apple juice' },
                            { name: 'Cranberry Juice 1L', price: 2.49, image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=800&q=80', desc: 'Tart cranberry juice' },
                            { name: 'Pineapple Juice 1L', price: 2.39, image: 'https://images.unsplash.com/photo-1589820296156-2454bb8a6ad1?w=800&q=80', desc: 'Tropical pineapple juice' },
                            { name: 'Instant Coffee 100g', price: 3.99, image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80', desc: 'Premium instant coffee' },
                            { name: 'Green Tea Box', price: 3.49, image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=80', desc: '20 green tea bags' },
                            { name: 'Espresso Capsules 10pk', price: 4.49, image: 'https://images.unsplash.com/photo-1592663527359-cf6642f54cff?w=800&q=80', desc: 'Compatible espresso pods' },
                            { name: 'Mango Juice 1L', price: 2.49, image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800&q=80', desc: 'Sweet mango nectar' },
                            { name: 'Grape Juice 1L', price: 2.39, image: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=800&q=80', desc: '100% grape juice' },
                        ],
                    },
                ],
            },
        ],
    },
];

async function seed() {
    console.log('🌱 Seeding database (idempotent — safe to re-run)...');
    const { faker } = await import('@faker-js/faker');
    const db = await getDB();

    // ── Helper: find-or-create user by email ──
    async function upsertUser(data: any) {
        const existing = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
        if (existing.length > 0) return existing[0];
        const [created] = await db.insert(users).values(data).returning();
        return created;
    }

    // Create super admin user
    const hashedPassword = await hashPassword('asdasdasd');
    const adminUserId = faker.string.uuid();
    await upsertUser({
        id: adminUserId,
        firstName: 'Admin',
        lastName: 'Admin',
        email: 'admin@admin.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        emailVerified: true,
        phoneVerified: true,
        signupStep: 'COMPLETED',
    });

    console.log('👤 Admin user ready (admin@admin.com / asdasdasd)');

    // Create specific customer user for testing
    const specificCustomerId = faker.string.uuid();
    const specificCustomerPassword = await hashPassword('asdasdasd');
    await upsertUser({
        id: specificCustomerId,
        firstName: 'Art',
        lastName: 'Shabani',
        email: 'artshabani2002@gmail.com',
        password: specificCustomerPassword,
        role: 'CUSTOMER',
        emailVerified: true,
        phoneVerified: true,
        signupStep: 'COMPLETED',
    });

    console.log('👤 Test customer ready (artshabani2002@gmail.com / asdasdasd)');

    // Create additional test customer users
    const customerUsers = [specificCustomerId]; // Include the specific customer
    for (let i = 0; i < 2; i++) {
        const customerId = faker.string.uuid();
        const customerPassword = await hashPassword('asdasdasd');
        const email = `testcustomer${i + 1}@demo.com`;
        const user = await upsertUser({
            id: customerId,
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            email,
            password: customerPassword,
            role: 'CUSTOMER',
            emailVerified: true,
            phoneVerified: true,
            signupStep: 'COMPLETED',
        });
        customerUsers.push(user.id);
    }

    console.log('👥 3 test customer users ready');

    // Create driver users and linked driver profiles
    const seededDrivers = [
        { firstName: 'Liridon', lastName: 'Berisha', email: 'driver1@demo.com' },
        { firstName: 'Arben', lastName: 'Krasniqi', email: 'driver2@demo.com' },
        { firstName: 'Dren', lastName: 'Hoxha', email: 'driver3@demo.com' },
    ];

    for (const [index, driverSeed] of seededDrivers.entries()) {
        const driverUserId = faker.string.uuid();
        const driverPassword = await hashPassword('asdasdasd');

        const user = await upsertUser({
            id: driverUserId,
            firstName: driverSeed.firstName,
            lastName: driverSeed.lastName,
            email: driverSeed.email,
            password: driverPassword,
            role: 'DRIVER',
            emailVerified: true,
            phoneVerified: true,
            signupStep: 'COMPLETED',
        });

        // Upsert driver profile
        const existingDriver = await db.select().from(drivers).where(eq(drivers.userId, user.id)).limit(1);
        if (existingDriver.length === 0) {
            await db.insert(drivers).values({
                userId: user.id,
                driverLat: 42.4604 + (index * 0.005),
                driverLng: 21.4694 + (index * 0.005),
                onlinePreference: true,
                connectionStatus: 'CONNECTED',
                commissionPercentage: '20',
                maxActiveOrders: '2',
                lastHeartbeatAt: new Date().toISOString(),
                lastLocationUpdate: new Date().toISOString(),
            });
        }
    }

    console.log('🚗 3 test drivers ready (driver1@demo.com, driver2@demo.com, driver3@demo.com)');

    // Store created businesses and their products
    const createdBusinesses: Array<{ id: string; name: string; products: Array<{ id: string; name: string; price: number }> }> = [];

    // Create restaurants with products
    for (const restaurantData of RESTAURANTS_DATA) {
        // Skip if business already exists
        const existingBiz = await db.select().from(businesses).where(eq(businesses.name, restaurantData.name)).limit(1);
        if (existingBiz.length > 0) {
            console.log(`🏪 Business already exists: ${restaurantData.name} — skipping`);
            createdBusinesses.push({ id: existingBiz[0].id, name: existingBiz[0].name, products: [] });
            continue;
        }

        const business: NewDbBusiness = {
            name: restaurantData.name,
            imageUrl: restaurantData.image,
            businessType: restaurantData.type,
            locationLat: restaurantData.lat,
            locationLng: restaurantData.lng,
            locationAddress: faker.location.streetAddress() + ', Gjilan',
            opensAt: OPEN_12_AM,
            closesAt: CLOSE_11_59_PM,
            isActive: true,
        };

        const [createdBusiness] = await db.insert(businesses).values(business).returning();
        console.log(`🏪 Created business: ${createdBusiness.name}`);

        // Seed per-day schedule (all 7 days)
        const scheduleSlots = [];
        for (let day = 0; day <= 6; day++) { // Sun(0) - Sat(6)
            scheduleSlots.push({
                businessId: createdBusiness.id,
                dayOfWeek: day,
                opensAt: OPEN_12_AM,
                closesAt: CLOSE_11_59_PM,
            });
        }
        await db.insert(businessHours).values(scheduleSlots);
        console.log('  🕐 Added 7-day schedule');

        const businessProducts: Array<{ id: string; name: string; price: number }> = [];

        // Create categories and products
        for (const categoryData of restaurantData.categories) {
            const category: NewDbProductCategory = {
                businessId: createdBusiness.id,
                name: categoryData.name,
            };

            const [createdCategory] = await db.insert(productCategories).values(category).returning();

            // Create products for this category
            for (const productData of categoryData.products) {
                const isOnSale = Math.random() > 0.7;
                const product: NewDbProduct = {
                    businessId: createdBusiness.id,
                    categoryId: createdCategory.id,
                    subcategoryId: null,
                    name: productData.name,
                    description: productData.desc,
                    imageUrl: productData.image,
                    basePrice: productData.price,
                    isAvailable: Math.random() > 0.1, // 90% available
                    isOnSale: isOnSale,
                    salePrice: isOnSale ? productData.price * 0.85 : null,
                };
                const [createdProduct] = await db.insert(products).values(product).returning();

                businessProducts.push({
                    id: createdProduct.id,
                    name: createdProduct.name,
                    price: createdProduct.basePrice,
                });
            }

            console.log(`  📦 Added ${categoryData.products.length} products to ${categoryData.name}`);
        }

        createdBusinesses.push({
            id: createdBusiness.id,
            name: createdBusiness.name,
            products: businessProducts,
        });
    }

    // Create market with products
    for (const marketData of MARKET_DATA) {
        // Skip if business already exists
        const existingBiz = await db.select().from(businesses).where(eq(businesses.name, marketData.name)).limit(1);
        if (existingBiz.length > 0) {
            console.log(`🏪 Market already exists: ${marketData.name} — skipping`);
            createdBusinesses.push({ id: existingBiz[0].id, name: existingBiz[0].name, products: [] });
            continue;
        }

        const business: NewDbBusiness = {
            name: marketData.name,
            imageUrl: marketData.image,
            businessType: marketData.type,
            locationLat: 42.4604 + (Math.random() - 0.5) * 0.025, // Gjilan city ~1.4km spread
            locationLng: 21.4694 + (Math.random() - 0.5) * 0.035,
            locationAddress: faker.location.streetAddress() + ', Gjilan',
            opensAt: OPEN_12_AM,
            closesAt: CLOSE_11_59_PM,
            isActive: true,
        };

        const [createdBusiness] = await db.insert(businesses).values(business).returning();
        console.log(`🏪 Created market: ${createdBusiness.name}`);

        // Seed per-day schedule (all 7 days for a market)
        const marketScheduleSlots = [];
        for (let day = 0; day <= 6; day++) {
            marketScheduleSlots.push({
                businessId: createdBusiness.id,
                dayOfWeek: day,
                opensAt: OPEN_12_AM,
                closesAt: CLOSE_11_59_PM,
            });
        }
        await db.insert(businessHours).values(marketScheduleSlots);
        console.log(`  🕐 Added 7-day schedule`);

        const businessProducts: Array<{ id: string; name: string; price: number }> = [];

        for (const categoryData of marketData.categories) {
            const category: NewDbProductCategory = {
                businessId: createdBusiness.id,
                name: categoryData.name,
            };

            const [createdCategory] = await db.insert(productCategories).values(category).returning();

            const createdSubcategories = new Map<string, string>();

            for (const subcategoryData of categoryData.subcategories) {
                const subcategory: NewDbProductSubcategory = {
                    categoryId: createdCategory.id,
                    name: subcategoryData.name,
                };

                const [createdSubcategory] = await db.insert(productSubcategories).values(subcategory).returning();
                createdSubcategories.set(subcategoryData.name, createdSubcategory.id);

                for (const productData of subcategoryData.products) {
                    const isOnSale = Math.random() > 0.7;
                    const subcategoryId = createdSubcategories.get(subcategoryData.name) ?? null;
                    const product: NewDbProduct = {
                        businessId: createdBusiness.id,
                        categoryId: createdCategory.id,
                        subcategoryId,
                        name: productData.name,
                        description: productData.desc,
                        imageUrl: productData.image,
                        basePrice: productData.price,
                        isAvailable: Math.random() > 0.05,
                        isOnSale: isOnSale,
                        salePrice: isOnSale ? productData.price * 0.85 : null,
                    };
                    const [createdProduct] = await db.insert(products).values(product).returning();

                    businessProducts.push({
                        id: createdProduct.id,
                        name: createdProduct.name,
                        price: createdProduct.basePrice,
                    });
                }

                console.log(`  🛒 Added ${subcategoryData.products.length} products to ${subcategoryData.name}`);
            }
        }

        createdBusinesses.push({
            id: createdBusiness.id,
            name: createdBusiness.name,
            products: businessProducts,
        });
    }

    // Create a business admin assigned to Cima
    const cimaBusiness = createdBusinesses.find((business) => business.name === 'Cima');
    if (cimaBusiness) {
        const cimaAdminPassword = await hashPassword('asdasdasd');
        await upsertUser({
            id: faker.string.uuid(),
            firstName: 'Cima',
            lastName: 'Admin',
            email: 'cima@gmail.com',
            password: cimaAdminPassword,
            role: 'BUSINESS_OWNER',
            businessId: cimaBusiness.id,
            emailVerified: true,
            phoneVerified: true,
            signupStep: 'COMPLETED',
        });

        console.log('👤 Cima business admin ready (cima@gmail.com / asdasdasd)');
    }

    // ------------------------------
    // Seed promotions (compatible with `promotions` schema)
    // ------------------------------
    try {
        const existingPromos = await db.select({ code: promotions.code }).from(promotions);
        const existingCodes = new Set(existingPromos.map((p) => p.code));

        const [exampleBusiness] = await db.select().from(businesses).limit(1);
        const businessId = exampleBusiness?.id ?? null;

        // First-order auto-applied free delivery promo (no code) – check by name
        const existingFirstOrder = await db.select().from(promotions).where(eq(promotions.name, 'First Order Free Delivery')).limit(1);
        const firstOrderPromo = existingFirstOrder[0] ?? (await db.insert(promotions).values({
            code: null,
            name: 'First Order Free Delivery',
            description: 'Free delivery for users on their first order (auto-applied)',
            type: 'FREE_DELIVERY',
            target: 'FIRST_ORDER',
            discountValue: null,
            maxDiscountCap: null,
            minOrderAmount: 0,
            spendThreshold: null,
            thresholdReward: null,
            maxGlobalUsage: null,
            maxUsagePerUser: 1,
            currentGlobalUsage: 0,
            isStackable: false,
            priority: 100,
            isActive: true,
            creatorType: 'PLATFORM',
            creatorId: null,
        }).returning())[0];

        // Global percentage promo
        const percentagePromo = existingCodes.has('WELCOME20')
            ? (await db.select().from(promotions).where(eq(promotions.code, 'WELCOME20')).limit(1))[0]
            : (await db.insert(promotions).values({
            code: 'WELCOME20',
            name: 'Welcome 20% Off',
            description: '20% off your order (up to 50€)',
            type: 'PERCENTAGE',
            target: 'ALL_USERS',
            discountValue: 20.0,
            maxDiscountCap: 50.0,
            minOrderAmount: 0,
            spendThreshold: null,
            thresholdReward: null,
            maxGlobalUsage: 10000,
            maxUsagePerUser: 1,
            currentGlobalUsage: 0,
            isStackable: false,
            priority: 50,
            isActive: true,
            creatorType: 'PLATFORM',
            creatorId: null,
        }).returning())[0];

        // Fixed discount promo
        const fixedPromo = existingCodes.has('EURO3OFF')
            ? (await db.select().from(promotions).where(eq(promotions.code, 'EURO3OFF')).limit(1))[0]
            : (await db.insert(promotions).values({
            code: 'EURO3OFF',
            name: '3€ Off',
            description: 'Flat 3€ off on orders over 10€',
            type: 'FIXED_AMOUNT',
            target: 'ALL_USERS',
            discountValue: 3.0,
            maxDiscountCap: null,
            minOrderAmount: 10.0,
            spendThreshold: null,
            thresholdReward: null,
            maxGlobalUsage: 5000,
            maxUsagePerUser: 3,
            currentGlobalUsage: 0,
            isStackable: true,
            priority: 40,
            isActive: true,
            creatorType: 'PLATFORM',
            creatorId: null,
        }).returning())[0];

        // Business-specific promo if a business exists
        if (businessId) {
            const bizPromo = existingCodes.has('BIZ10')
                ? (await db.select().from(promotions).where(eq(promotions.code, 'BIZ10')).limit(1))[0]
                : (await db.insert(promotions).values({
                code: 'BIZ10',
                name: 'Business 10% Off',
                description: '10% off for a specific business',
                type: 'PERCENTAGE',
                target: 'CONDITIONAL',
                discountValue: 10.0,
                maxDiscountCap: 20.0,
                minOrderAmount: 0,
                spendThreshold: null,
                thresholdReward: null,
                maxGlobalUsage: 2000,
                maxUsagePerUser: 2,
                currentGlobalUsage: 0,
                isStackable: false,
                priority: 60,
                isActive: true,
                creatorType: 'PLATFORM',
                creatorId: null,
            }).returning())[0];

            await db.insert(promotionBusinessEligibility).values({
                promotionId: bizPromo.id,
                businessId: businessId,
            }).onConflictDoNothing();
        }

        // Assign an example promo to a sample user if present
        const sampleUser = (await db.select().from(users).limit(1)).at(0);
        if (sampleUser) {
            await db.insert(userPromotions).values({
                userId: sampleUser.id,
                promotionId: fixedPromo.id,
                assignedBy: sampleUser.id,
                expiresAt: null,
                usageCount: 0,
                isActive: true,
            }).onConflictDoNothing();

            await db.insert(userPromoMetadata).values({
                userId: sampleUser.id,
                hasUsedFirstOrderPromo: false,
                totalPromotionsUsed: 0,
                totalSavings: 0,
            }).onConflictDoNothing();
        }

        console.log('[SEED] Promotions seeded.');
    } catch (err) {
        console.warn('[SEED] Promotions seed skipped or error:', err);
    }

    // ------------------------------
    // Seed settlement rule for Cima (20% commission)
    // ------------------------------
    try {
        const cimaEntry = createdBusinesses.find((biz) => biz.name === 'Cima');
        if (cimaEntry) {
            const existingRule = await db
                .select()
                .from(settlementRules)
                .where(eq(settlementRules.businessId, cimaEntry.id))
                .limit(1);
            if (existingRule.length === 0) {
                await db.insert(settlementRules).values({
                    name: '20% commission on subtotal',
                    entityType: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    amountType: 'PERCENT',
                    amount: '20',
                    appliesTo: 'SUBTOTAL',
                    businessId: cimaEntry.id,
                    isActive: true,
                    notes: 'Platform commission for Cima restaurant',
                });
                console.log('[SEED] ✅ Created 20% commission settlement rule for Cima');
            } else {
                console.log('[SEED] ⏭️  Settlement rule for Cima already exists — skipping');
            }
        }
        console.log('[SEED] Settlement rule for Cima seeded.');
    } catch (err) {
        console.warn('[SEED] Settlement rule seed skipped or error:', err);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    const totalBusinesses = RESTAURANTS_DATA.length + MARKET_DATA.length;
    const totalProducts =
        RESTAURANTS_DATA.reduce((sum, b) => sum + b.categories.reduce((cSum, c) => cSum + c.products.length, 0), 0) +
        MARKET_DATA.reduce(
            (sum, b) => sum + b.categories.reduce((cSum, c) => cSum + c.subcategories.reduce((sSum, s) => sSum + s.products.length, 0), 0),
            0,
        );
    console.log(`  - ${totalBusinesses} businesses created`);
    console.log(`  - Total products: ${totalProducts}`);
    console.log(`  - 3 test customer users created`);
    console.log('\n🔐 Credentials:');
    console.log('  Admin: admin@admin.com / asdasdasd');
    console.log('  Cima Business Admin: cima@gmail.com / asdasdasd');
    console.log('  Customer: artshabani2002@gmail.com / asdasdasd');
    console.log('  Drivers: driver1@demo.com, driver2@demo.com, driver3@demo.com / asdasdasd\n');
}

seed()
    .catch((error) => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
