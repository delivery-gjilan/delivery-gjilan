import { getDB } from '.';
import { businesses, NewDbBusiness } from './schema/businesses';
import { productCategories, NewDbProductCategory } from './schema/productCategories';
import { productSubcategories, NewDbProductSubcategory } from './schema/productSubcategories';
import { products, NewDbProduct } from './schema/products';
import { orders, NewDbOrder } from './schema/orders';
import { orderItems, NewDbOrderItem } from './schema/orderItems';
import { faker } from '@faker-js/faker';

async function seed() {
    console.log('🌱 Seeding database...');

    const db = await getDB();

    // Clear existing data
    await db.delete(products);
    await db.delete(productSubcategories);
    await db.delete(productCategories);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(businesses);

    console.log('🧹 Cleared existing data');

    const businessesData: NewDbBusiness[] = [];
    const categoriesData: NewDbProductCategory[] = [];
    const subcategoriesData: NewDbProductSubcategory[] = [];
    const productsData: NewDbProduct[] = [];

    // Create 10 Businesses
    for (let i = 0; i < 10; i++) {
        const business: NewDbBusiness = {
            name: faker.company.name(),
            imageUrl: faker.image.url(),
            businessType: faker.helpers.arrayElement(['MARKET', 'PHARMACY', 'RESTAURANT']),
            locationLat: faker.location.latitude(),
            locationLng: faker.location.longitude(),
            locationAddress: faker.location.streetAddress(),
            opensAt: 480, // 08:00
            closesAt: 1320, // 22:00
            isActive: true,
        };
        const [createdBusiness] = await db.insert(businesses).values(business).returning();
        businessesData.push(createdBusiness);

        // Create 3-5 Categories per Business
        const numCategories = faker.number.int({ min: 3, max: 5 });
        for (let j = 0; j < numCategories; j++) {
            const category: NewDbProductCategory = {
                businessId: createdBusiness.id,
                name: faker.commerce.department(),
            };
            const [createdCategory] = await db.insert(productCategories).values(category).returning();
            categoriesData.push(createdCategory);

            // Create 2-4 Subcategories per Category
            const numSubcategories = faker.number.int({ min: 2, max: 4 });
            for (let k = 0; k < numSubcategories; k++) {
                const subcategory: NewDbProductSubcategory = {
                    categoryId: createdCategory.id,
                    name: faker.commerce.productAdjective(),
                };
                const [createdSubcategory] = await db.insert(productSubcategories).values(subcategory).returning();
                subcategoriesData.push(createdSubcategory);

                // Create 5-10 Products per Subcategory
                const numProducts = faker.number.int({ min: 5, max: 10 });
                for (let l = 0; l < numProducts; l++) {
                    const price = parseFloat(faker.commerce.price());
                    const product: NewDbProduct = {
                        businessId: createdBusiness.id,
                        categoryId: createdCategory.id,
                        subcategoryId: createdSubcategory.id,
                        name: faker.commerce.productName(),
                        description: faker.commerce.productDescription(),
                        imageUrl: faker.image.url(),
                        price: price,
                        isAvailable: faker.datatype.boolean(),
                        isOnSale: faker.datatype.boolean(),
                        salePrice: price * 0.8,
                    };
                    productsData.push(product);
                }
            }

            // Create some products without subcategory
            const numProductsNoSub = faker.number.int({ min: 2, max: 5 });
            for (let l = 0; l < numProductsNoSub; l++) {
                const price = parseFloat(faker.commerce.price());
                const product: NewDbProduct = {
                    businessId: createdBusiness.id,
                    categoryId: createdCategory.id,
                    subcategoryId: null,
                    name: faker.commerce.productName(),
                    description: faker.commerce.productDescription(),
                    imageUrl: faker.image.url(),
                    price: price,
                    isAvailable: faker.datatype.boolean(),
                    isOnSale: faker.datatype.boolean(),
                    salePrice: price * 0.8,
                };
                productsData.push(product);
            }
        }
    }

    if (productsData.length > 0) {
        await db.insert(products).values(productsData);
    }

    // Create 5 sample orders with different statuses
    const orderStatuses = ['PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    const allProducts = await db.select().from(products);

    for (let i = 0; i < 5; i++) {
        const orderPrice = parseFloat((Math.random() * 100 + 20).toFixed(2));
        const deliveryPrice = parseFloat((Math.random() * 10 + 2).toFixed(2));

        const order: NewDbOrder = {
            price: orderPrice,
            deliveryPrice: deliveryPrice,
            status: orderStatuses[i] as any,
            dropoffLat: faker.location.latitude(),
            dropoffLng: faker.location.longitude(),
            dropoffAddress: faker.location.streetAddress(),
            orderDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        };

        const [createdOrder] = await db.insert(orders).values(order).returning();

        // Add 2-5 random products to each order as items
        const numItems = faker.number.int({ min: 2, max: 5 });
        const selectedProducts = faker.helpers.shuffle(allProducts).slice(0, numItems);

        const orderItemsData: NewDbOrderItem[] = selectedProducts.map((product) => ({
            orderId: createdOrder.id,
            productId: product.id,
            price: product.price,
            quantity: faker.number.int({ min: 1, max: 3 }),
        }));

        await db.insert(orderItems).values(orderItemsData);
    }

    console.log(`Seeded ${businessesData.length} businesses`);
    console.log(`Seeded ${categoriesData.length} categories`);
    console.log(`Seeded ${subcategoriesData.length} subcategories`);
    console.log(`Seeded ${productsData.length} products`);
    console.log('Seeded 5 orders with items');
    console.log('Seeding complete!');
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
