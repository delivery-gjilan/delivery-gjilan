import { getDB } from '.';
import { businesses, NewDbBusiness } from './schema/businesses';
import { productCategories, NewDbProductCategory } from './schema/productCategories';
import { productSubcategories, NewDbProductSubcategory } from './schema/productSubcategories';
import { products, NewDbProduct } from './schema/products';
import { orders, NewDbOrder } from './schema/orders';
import { orderItems, NewDbOrderItem } from './schema/orderItems';
import { users } from './schema/users';
import { hashPassword } from '@/lib/utils/authUtils';
import { OrderStatus } from '@/generated/types.generated';

// Restaurant data with curated products and realistic images
const RESTAURANTS_DATA = [
    {
        name: 'Casbas Pizza',
        type: 'RESTAURANT' as const,
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
        opensAt: 600, // 10:00
        closesAt: 1380, // 23:00
        categories: [
            {
                name: 'Pizza',
                products: [
                    { name: 'Margherita Pizza', price: 8.99, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', desc: 'Classic tomato, mozzarella, basil' },
                    { name: 'Pepperoni Pizza', price: 10.99, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80', desc: 'Spicy pepperoni, mozzarella, tomato sauce' },
                    { name: 'Hawaiian Pizza', price: 11.49, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', desc: 'Ham, pineapple, cheese' },
                    { name: 'Quattro Formaggi', price: 12.99, image: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800&q=80', desc: 'Four cheese blend' },
                    { name: 'Vegetarian Pizza', price: 10.49, image: 'https://images.unsplash.com/photo-1511689660979-10d2b1aada49?w=800&q=80', desc: 'Fresh vegetables, cheese' },
                    { name: 'BBQ Chicken Pizza', price: 13.49, image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80', desc: 'Grilled chicken, BBQ sauce, red onions' },
                    { name: 'Diavola Pizza', price: 11.99, image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&q=80', desc: 'Spicy salami, chili flakes' },
                    { name: 'Seafood Pizza', price: 14.99, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80', desc: 'Shrimp, calamari, mussels' },
                    { name: 'Truffle Pizza', price: 16.99, image: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96a47?w=800&q=80', desc: 'Truffle oil, mushrooms, mozzarella' },
                    { name: 'Meat Lovers Pizza', price: 14.49, image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&q=80', desc: 'Pepperoni, sausage, bacon, ham' },
                ],
            },
        ],
    },
    {
        name: 'Pano Gourmet',
        type: 'RESTAURANT' as const,
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
        opensAt: 480, // 08:00
        closesAt: 1320, // 22:00
        categories: [
            {
                name: 'Burgers',
                products: [
                    { name: 'Classic Burger', price: 9.99, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', desc: 'Beef patty, lettuce, tomato, onion' },
                    { name: 'Cheeseburger', price: 10.99, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80', desc: 'Double cheese, special sauce' },
                    { name: 'Bacon Burger', price: 12.49, image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&q=80', desc: 'Crispy bacon, cheddar cheese' },
                    { name: 'Veggie Burger', price: 9.49, image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=800&q=80', desc: 'Plant-based patty, fresh veggies' },
                    { name: 'BBQ Burger', price: 11.99, image: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=800&q=80', desc: 'BBQ sauce, onion rings, bacon' },
                    { name: 'Chicken Burger', price: 10.49, image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&q=80', desc: 'Grilled chicken, mayo, lettuce' },
                    { name: 'Mushroom Swiss Burger', price: 11.49, image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80', desc: 'Sautéed mushrooms, Swiss cheese' },
                    { name: 'Spicy Jalapeño Burger', price: 11.99, image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=800&q=80', desc: 'Jalapeños, pepper jack cheese' },
                    { name: 'Double Patty Burger', price: 14.99, image: 'https://images.unsplash.com/photo-1551615593-ef5fe247e8f7?w=800&q=80', desc: 'Two beef patties, double cheese' },
                    { name: 'Gourmet Truffle Burger', price: 16.99, image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&q=80', desc: 'Truffle aioli, arugula, parmesan' },
                ],
            },
        ],
    },
    {
        name: 'Sushi Garden',
        type: 'RESTAURANT' as const,
        image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=80',
        opensAt: 660, // 11:00
        closesAt: 1380, // 23:00
        categories: [
            {
                name: 'Sushi Rolls',
                products: [
                    { name: 'California Roll', price: 8.99, image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=80', desc: 'Crab, avocado, cucumber' },
                    { name: 'Spicy Tuna Roll', price: 9.99, image: 'https://images.unsplash.com/photo-1617196035040-8f0d5c001683?w=800&q=80', desc: 'Tuna, spicy mayo, cucumber' },
                    { name: 'Philadelphia Roll', price: 10.49, image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=800&q=80', desc: 'Salmon, cream cheese, avocado' },
                    { name: 'Dragon Roll', price: 13.99, image: 'https://images.unsplash.com/photo-1563612116625-3012372fccce?w=800&q=80', desc: 'Eel, avocado, cucumber, eel sauce' },
                    { name: 'Rainbow Roll', price: 14.49, image: 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=800&q=80', desc: 'Assorted fish over California roll' },
                    { name: 'Salmon Avocado Roll', price: 9.49, image: 'https://images.unsplash.com/photo-1607247098731-5bf6416d2e08?w=800&q=80', desc: 'Fresh salmon, avocado' },
                    { name: 'Tempura Shrimp Roll', price: 11.99, image: 'https://images.unsplash.com/photo-1582450871972-ab5ca641643d?w=800&q=80', desc: 'Crispy shrimp tempura, avocado' },
                    { name: 'Vegetable Roll', price: 7.99, image: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&q=80', desc: 'Cucumber, avocado, carrot' },
                    { name: 'Spicy Salmon Roll', price: 10.99, image: 'https://images.unsplash.com/photo-1615361200141-f45040d2a75d?w=800&q=80', desc: 'Salmon, spicy mayo, scallions' },
                    { name: 'Eel Avocado Roll', price: 12.49, image: 'https://images.unsplash.com/photo-1564489563601-c53cfc451e93?w=800&q=80', desc: 'Grilled eel, avocado, sesame' },
                ],
            },
        ],
    },
    {
        name: 'Pasta House',
        type: 'RESTAURANT' as const,
        image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80',
        opensAt: 660, // 11:00
        closesAt: 1380, // 23:00
        categories: [
            {
                name: 'Pasta',
                products: [
                    { name: 'Spaghetti Carbonara', price: 12.99, image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80', desc: 'Creamy sauce, bacon, parmesan' },
                    { name: 'Fettuccine Alfredo', price: 11.99, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80', desc: 'Rich cream sauce, butter, parmesan' },
                    { name: 'Penne Arrabbiata', price: 10.99, image: 'https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=800&q=80', desc: 'Spicy tomato sauce, garlic' },
                    { name: 'Lasagna Bolognese', price: 13.99, image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&q=80', desc: 'Layers of pasta, meat sauce, cheese' },
                    { name: 'Pesto Pasta', price: 11.49, image: 'https://images.unsplash.com/photo-1622973536968-3ead9e780960?w=800&q=80', desc: 'Basil pesto, pine nuts, parmesan' },
                    { name: 'Seafood Linguine', price: 15.99, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80', desc: 'Shrimp, mussels, white wine sauce' },
                    { name: 'Ravioli', price: 12.49, image: 'https://images.unsplash.com/photo-1587740896339-96a76170508d?w=800&q=80', desc: 'Ricotta filled, marinara sauce' },
                    { name: 'Aglio e Olio', price: 9.99, image: 'https://images.unsplash.com/photo-1621647061270-96c4c5916d37?w=800&q=80', desc: 'Garlic, olive oil, chili flakes' },
                    { name: 'Truffle Pasta', price: 17.99, image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80', desc: 'Black truffle, cream, mushrooms' },
                    { name: 'Gnocchi Sorrentina', price: 13.49, image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=800&q=80', desc: 'Potato dumplings, tomato, mozzarella' },
                ],
            },
        ],
    },
    {
        name: 'Taco Fiesta',
        type: 'RESTAURANT' as const,
        image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=800&q=80',
        opensAt: 660, // 11:00
        closesAt: 1380, // 23:00
        categories: [
            {
                name: 'Tacos',
                products: [
                    { name: 'Beef Tacos', price: 8.99, image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=800&q=80', desc: 'Seasoned beef, lettuce, cheese' },
                    { name: 'Chicken Tacos', price: 8.49, image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=80', desc: 'Grilled chicken, salsa, cilantro' },
                    { name: 'Fish Tacos', price: 10.99, image: 'https://images.unsplash.com/photo-1599974336143-5da6ab4e6160?w=800&q=80', desc: 'Crispy fish, cabbage slaw, lime' },
                    { name: 'Carnitas Tacos', price: 9.99, image: 'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?w=800&q=80', desc: 'Slow-cooked pork, onions, cilantro' },
                    { name: 'Shrimp Tacos', price: 11.49, image: 'https://images.unsplash.com/photo-1613514785940-daed07799d9b?w=800&q=80', desc: 'Grilled shrimp, chipotle mayo' },
                    { name: 'Veggie Tacos', price: 7.99, image: 'https://images.unsplash.com/photo-1512838243191-e81e8f66f1fd?w=800&q=80', desc: 'Black beans, corn, avocado' },
                    { name: 'Al Pastor Tacos', price: 9.49, image: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=800&q=80', desc: 'Marinated pork, pineapple' },
                    { name: 'Barbacoa Tacos', price: 10.49, image: 'https://images.unsplash.com/photo-1599974551050-4be19960b97c?w=800&q=80', desc: 'Tender beef, consommé' },
                    { name: 'Chorizo Tacos', price: 9.99, image: 'https://images.unsplash.com/photo-1584208633869-e080a1f4f49c?w=800&q=80', desc: 'Spicy sausage, potatoes' },
                    { name: 'Baja Tacos', price: 11.99, image: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=800&q=80', desc: 'Beer-battered fish, cabbage' },
                ],
            },
        ],
    },
];

async function seed() {
    console.log('🌱 Seeding database...');
    const { faker } = await import('@faker-js/faker');
    const db = await getDB();

    // Clear existing data
    await db.delete(products);
    await db.delete(productSubcategories);
    await db.delete(productCategories);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(businesses);
    await db.delete(users);

    console.log('🧹 Cleared existing data');

    // Create super admin user
    const hashedPassword = await hashPassword('12345678');
    const adminUserId = faker.string.uuid();
    await db.insert(users).values({
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

    console.log('👤 Created super admin user (admin@admin.com / 12345678)');

    // Create specific customer user for testing
    const specificCustomerId = faker.string.uuid();
    const specificCustomerPassword = await hashPassword('12345678');
    await db.insert(users).values({
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

    console.log('👤 Created test customer user (artshabani2002@gmail.com / 12345678)');

    // Create additional test customer users
    const customerUsers = [specificCustomerId]; // Include the specific customer
    for (let i = 0; i < 2; i++) {
        const customerId = faker.string.uuid();
        const customerPassword = await hashPassword('12345678');
        await db.insert(users).values({
            id: customerId,
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            email: faker.internet.email(),
            password: customerPassword,
            role: 'CUSTOMER',
            emailVerified: true,
            phoneVerified: true,
            signupStep: 'COMPLETED',
        });
        customerUsers.push(customerId);
    }

    console.log('👥 Created 3 test customer users total');

    // Store created businesses and their products
    const createdBusinesses: Array<{ id: string; name: string; products: Array<{ id: string; name: string; price: number }> }> = [];

    // Create restaurants with products
    for (const restaurantData of RESTAURANTS_DATA) {
        const business: NewDbBusiness = {
            name: restaurantData.name,
            imageUrl: restaurantData.image,
            businessType: restaurantData.type,
            locationLat: 42.6629 + (Math.random() - 0.5) * 0.1, // Gjilan, Kosovo area
            locationLng: 21.4694 + (Math.random() - 0.5) * 0.1,
            locationAddress: faker.location.streetAddress(),
            opensAt: restaurantData.opensAt,
            closesAt: restaurantData.closesAt,
            isActive: true,
        };

        const [createdBusiness] = await db.insert(businesses).values(business).returning();
        console.log(`🏪 Created business: ${createdBusiness.name}`);

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
                    price: productData.price,
                    isAvailable: Math.random() > 0.1, // 90% available
                    isOnSale: isOnSale,
                    salePrice: isOnSale ? productData.price * 0.85 : null,
                };
                const [createdProduct] = await db.insert(products).values(product).returning();
                businessProducts.push({
                    id: createdProduct.id,
                    name: createdProduct.name,
                    price: createdProduct.price,
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

    // Create 3 test orders, each from a single restaurant
    console.log('\n📝 Creating test orders...');
    
    const orderStatuses: OrderStatus[] = ['PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY'];
    const now = new Date();

    for (let i = 0; i < 3; i++) {
        const customerUserId = customerUsers[i];
        const selectedBusiness = createdBusinesses[i % createdBusinesses.length];
        
        // Select 2-4 random products from this business
        const numProducts = 2 + Math.floor(Math.random() * 3); // 2-4 products
        const selectedProducts = faker.helpers.shuffle(selectedBusiness.products).slice(0, numProducts);
        
        // Calculate order totals
        let price = 0;
        const orderItemsData: NewDbOrderItem[] = [];
        
        selectedProducts.forEach((product) => {
            const quantity = 1 + Math.floor(Math.random() * 3); // 1-3 quantity
            const itemPrice = product.price * quantity;
            price += itemPrice;
            
            orderItemsData.push({
                productId: product.id,
                quantity: quantity,
                price: product.price,
            });
        });
        
        const deliveryPrice = 2.5;
        const totalPrice = price + deliveryPrice;
        
        // Create order with timestamp offset (most recent first)
        const orderDate = new Date(now.getTime() - (i * 60 * 60 * 1000)); // Each order 1 hour apart
        
        const order: NewDbOrder = {
            userId: customerUserId,
            price: price,
            deliveryPrice: deliveryPrice,
            dropoffLat: 42.6629 + (Math.random() - 0.5) * 0.05,
            dropoffLng: 21.4694 + (Math.random() - 0.5) * 0.05,
            dropoffAddress: faker.location.streetAddress(),
            status: orderStatuses[i],
            orderDate: orderDate.toISOString(),
        };
        
        const [createdOrder] = await db.insert(orders).values(order).returning();
        
        // Link order items to the order
        for (const itemData of orderItemsData) {
            await db.insert(orderItems).values({
                ...itemData,
                orderId: createdOrder.id,
            });
        }
        
        console.log(`  📋 Order ${i + 1}: ${selectedBusiness.name} - ${selectedProducts.length} items - $${totalPrice.toFixed(2)} - ${orderStatuses[i]}`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${RESTAURANTS_DATA.length} businesses created`);
    console.log(`  - Each with 10 curated products`);
    console.log(`  - Total products: ${RESTAURANTS_DATA.length * 10}`);
    console.log(`  - 3 test customer users created`);
    console.log(`  - 3 test orders created (each from a single restaurant)`);
    console.log('\n🔐 Credentials:');
    console.log('  Admin: admin@admin.com / 12345678');
    console.log('  Customer: artshabani2002@gmail.com / 12345678\n');
}

seed()
    .catch((error) => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
