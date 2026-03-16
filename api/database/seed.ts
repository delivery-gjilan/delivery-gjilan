import { getDB } from '.';
import { businesses, NewDbBusiness } from './schema/businesses';
import { businessHours } from './schema/businessHours';
import { productCategories, NewDbProductCategory } from './schema/productCategories';
import { productSubcategories, NewDbProductSubcategory } from './schema/productSubcategories';
import { products, NewDbProduct } from './schema/products';
import { orders, NewDbOrder } from './schema/orders';
import { orderItems, NewDbOrderItem } from './schema/orderItems';
import { users } from './schema/users';
import { drivers } from './schema/drivers';
import { promotions, userPromotions, promotionBusinessEligibility, userPromoMetadata } from './schema/promotions';
import { settlements } from './schema/settlements';
import { hashPassword } from '@/lib/utils/authUtils';
import { sql } from 'drizzle-orm';

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
    console.log('🌱 Seeding database...');
    const { faker } = await import('@faker-js/faker');
    const db = await getDB();

    // Clear existing data
    await db.delete(products);
    await db.delete(productSubcategories);
    await db.delete(productCategories);
    await db.delete(promotionBusinessEligibility);
    await db.delete(userPromotions);
    await db.delete(userPromoMetadata);
    await db.delete(promotions);
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

    // Create driver users and linked driver profiles
    const seededDrivers = [
        { firstName: 'Liridon', lastName: 'Berisha', email: 'driver1@demo.com' },
        { firstName: 'Arben', lastName: 'Krasniqi', email: 'driver2@demo.com' },
        { firstName: 'Dren', lastName: 'Hoxha', email: 'driver3@demo.com' },
    ];

    for (const [index, driverSeed] of seededDrivers.entries()) {
        const driverUserId = faker.string.uuid();
        const driverPassword = await hashPassword('12345678');

        await db.insert(users).values({
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

        await db.insert(drivers).values({
            userId: driverUserId,
            driverLat: 42.6629 + (index * 0.01),
            driverLng: 21.4694 + (index * 0.01),
            onlinePreference: true,
            connectionStatus: 'CONNECTED',
            commissionPercentage: '20',
            maxActiveOrders: '2',
            lastHeartbeatAt: new Date().toISOString(),
            lastLocationUpdate: new Date().toISOString(),
        });
    }

    console.log('🚗 Created 3 test drivers (driver1@demo.com, driver2@demo.com, driver3@demo.com)');

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

        // Seed per-day schedule (Mon-Sat open, Sunday closed)
        const scheduleSlots = [];
        for (let day = 1; day <= 6; day++) { // Mon(1) - Sat(6)
            scheduleSlots.push({
                businessId: createdBusiness.id,
                dayOfWeek: day,
                opensAt: restaurantData.opensAt,
                closesAt: restaurantData.closesAt,
            });
        }
        await db.insert(businessHours).values(scheduleSlots);
        console.log(`  🕐 Added ${scheduleSlots.length}-day schedule`);

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

    // Create market with products
    for (const marketData of MARKET_DATA) {
        const business: NewDbBusiness = {
            name: marketData.name,
            imageUrl: marketData.image,
            businessType: marketData.type,
            locationLat: 42.4635,
            locationLng: 21.4694,
            locationAddress: 'Gjilan, Kosovo',
            opensAt: marketData.opensAt,
            closesAt: marketData.closesAt,
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
                opensAt: marketData.opensAt,
                closesAt: marketData.closesAt,
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
                        price: productData.price,
                        isAvailable: Math.random() > 0.05,
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

                console.log(`  🛒 Added ${subcategoryData.products.length} products to ${subcategoryData.name}`);
            }
        }

        createdBusinesses.push({
            id: createdBusiness.id,
            name: createdBusiness.name,
            products: businessProducts,
        });
    }

    // ------------------------------
    // Seed promotions (compatible with `promotions` schema)
    // ------------------------------
    try {
        const [exampleBusiness] = await db.select().from(businesses).limit(1);
        const businessId = exampleBusiness?.id ?? null;

        // First-order auto-applied free delivery promo (no code)
        const [firstOrderPromo] = await db.insert(promotions).values({
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
        }).returning();

        // Global percentage promo
        const [percentagePromo] = await db.insert(promotions).values({
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
        }).returning();

        // Fixed discount promo
        const [fixedPromo] = await db.insert(promotions).values({
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
        }).returning();

        // Business-specific promo if a business exists
        if (businessId) {
            const [bizPromo] = await db.insert(promotions).values({
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
            }).returning();

            await db.insert(promotionBusinessEligibility).values({
                promotionId: bizPromo.id,
                businessId,
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

    // Create test orders and settlements
    try {
        const businessList = await db.select().from(businesses).limit(10);
        const driverList = await db.select().from(drivers).limit(5);
        const customerList = await db.select().from(users).where(sql`${users.role} = 'CUSTOMER'`).limit(5);

        if (businessList.length > 0 && driverList.length > 0 && customerList.length > 0) {
            // Create delivered orders + matching settlements
            for (let i = 0; i < 15; i++) {
                const randomBusiness = businessList[Math.floor(Math.random() * businessList.length)];
                const randomDriver = driverList[Math.floor(Math.random() * driverList.length)];
                const randomCustomer = customerList[Math.floor(Math.random() * customerList.length)];

                if (!randomBusiness || !randomDriver || !randomCustomer) {
                    continue;
                }

                const orderAmount = Number((20 + Math.random() * 80).toFixed(2));
                const deliveryFee = 3.5;
                const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();

                const [newOrder] = await db.insert(orders).values({
                    displayId: `GJ-S${String(i + 1).padStart(3, '0')}`,
                    userId: randomCustomer.id,
                    driverId: randomDriver.userId,
                    price: orderAmount,
                    deliveryPrice: deliveryFee,
                    status: 'DELIVERED',
                    dropoffLat: 42.4635,
                    dropoffLng: 21.4694,
                    dropoffAddress: 'Gjilan, Kosovo',
                    deliveredAt: createdAt,
                    orderDate: createdAt,
                }).returning();

                if (!newOrder) {
                    continue;
                }

                // Business settlement (platform receivable)
                const businessPlatformMarkup = Number((orderAmount * 0.15).toFixed(2));
                const businessPaid = Math.random() > 0.6;
                await db.insert(settlements).values({
                    type: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    businessId: randomBusiness.id,
                    orderId: newOrder.id,
                    amount: businessPlatformMarkup,
                    status: businessPaid ? 'PAID' : 'PENDING',
                    createdAt,
                    paidAt: businessPaid ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString() : null,
                    paymentReference: businessPaid ? `PAY-${Date.now()}-${i}` : null,
                    paymentMethod: businessPaid ? 'BANK_TRANSFER' : null,
                    ruleSnapshot: {
                        appliedRules: [
                            {
                                ruleId: 'platform-markup',
                                ruleType: 'PLATFORM_MARKUP',
                                config: { percentage: 15 },
                                activeSince: createdAt,
                                capturedAt: createdAt,
                            },
                        ],
                    },
                    calculationDetails: {
                        orderSubtotal: orderAmount,
                        deliveryFee,
                        itemsBreakdown: [],
                        rulesApplied: [
                            {
                                ruleType: 'PLATFORM_MARKUP',
                                description: '15% platform markup',
                                baseAmount: orderAmount,
                                percentage: 15,
                                amount: businessPlatformMarkup,
                                direction: 'RECEIVABLE',
                            },
                        ],
                        totalReceivable: businessPlatformMarkup,
                        totalPayable: 0,
                        netAmount: businessPlatformMarkup,
                        currency: 'EUR',
                    },
                });

                // Driver settlement (platform receivable from delivery fee share)
                const driverCommission = Number((deliveryFee * 0.8).toFixed(2));
                const driverPaid = Math.random() > 0.5;
                await db.insert(settlements).values({
                    type: 'DRIVER',
                    direction: 'RECEIVABLE',
                    driverId: randomDriver.id,
                    orderId: newOrder.id,
                    amount: driverCommission,
                    status: driverPaid ? 'PAID' : 'PENDING',
                    createdAt,
                    paidAt: driverPaid ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString() : null,
                    paymentReference: driverPaid ? `DRV-${Date.now()}-${i}` : null,
                    paymentMethod: driverPaid ? 'WALLET' : null,
                    ruleSnapshot: {
                        appliedRules: [
                            {
                                ruleId: 'driver-commission',
                                ruleType: 'DRIVER_COMMISSION',
                                config: { percentage: 80 },
                                activeSince: createdAt,
                                capturedAt: createdAt,
                            },
                        ],
                    },
                    calculationDetails: {
                        orderSubtotal: orderAmount,
                        deliveryFee,
                        itemsBreakdown: [],
                        rulesApplied: [
                            {
                                ruleType: 'DRIVER_COMMISSION',
                                description: '80% driver commission',
                                baseAmount: deliveryFee,
                                percentage: 80,
                                amount: driverCommission,
                                direction: 'RECEIVABLE',
                            },
                        ],
                        totalReceivable: driverCommission,
                        totalPayable: 0,
                        netAmount: driverCommission,
                        currency: 'EUR',
                    },
                });
            }

            console.log('[SEED] ✅ Created 15 delivered orders with settlements');
            console.log('[SEED]   - 15 business settlements');
            console.log('[SEED]   - 15 driver settlements');
        } else {
            console.warn('[SEED] Settlements skipped: missing businesses, drivers, or customers');
        }
    } catch (err) {
        console.warn('[SEED] Settlements seed skipped or error:', err);
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
    console.log('  Admin: admin@admin.com / 12345678');
    console.log('  Customer: artshabani2002@gmail.com / 12345678');
    console.log('  Drivers: driver1@demo.com, driver2@demo.com, driver3@demo.com / 12345678\n');
}

seed()
    .catch((error) => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
