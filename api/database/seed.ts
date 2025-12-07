import { getDB } from '.';
import { businesses, NewDbBusiness } from './schema/businesses';
import { productCategories, NewDbProductCategory } from './schema/productCategories';
import { productSubcategories, NewDbProductSubcategory } from './schema/productSubcategories';
import { products, NewDbProduct } from './schema/products';
import { faker } from '@faker-js/faker';

async function seed() {
    console.log('🌱 Seeding database...');

    const db = await getDB();

    // Clear existing data
    await db.delete(products);
    await db.delete(productSubcategories);
    await db.delete(productCategories);
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

    console.log(`Seeded ${businessesData.length} businesses`);
    console.log(`Seeded ${categoriesData.length} categories`);
    console.log(`Seeded ${subcategoriesData.length} subcategories`);
    console.log(`Seeded ${productsData.length} products`);
    console.log('Seeding complete!');
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
