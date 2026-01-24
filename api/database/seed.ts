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
    {
        name: 'Fresh Market',
        type: 'MARKET' as const,
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
        opensAt: 420, // 07:00
        closesAt: 1260, // 21:00
        categories: [
            {
                name: 'Groceries',
                products: [
                    { name: 'Fresh Milk 1L', price: 1.99, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800&q=80', desc: 'Organic whole milk' },
                    { name: 'White Bread', price: 2.49, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80', desc: 'Freshly baked daily' },
                    { name: 'Farm Eggs (12)', price: 3.99, image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&q=80', desc: 'Free-range chicken eggs' },
                    { name: 'Cheddar Cheese 200g', price: 4.49, image: 'https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=800&q=80', desc: 'Aged cheddar' },
                    { name: 'Butter 250g', price: 3.49, image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&q=80', desc: 'Unsalted butter' },
                    { name: 'Tomatoes 1kg', price: 2.99, image: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800&q=80', desc: 'Fresh ripe tomatoes' },
                    { name: 'Bananas 1kg', price: 1.49, image: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=800&q=80', desc: 'Yellow bananas' },
                    { name: 'Chicken Breast 500g', price: 5.99, image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800&q=80', desc: 'Fresh chicken breast' },
                    { name: 'Pasta 500g', price: 1.99, image: 'https://images.unsplash.com/photo-1551462147-37cbd8be161a?w=800&q=80', desc: 'Italian spaghetti' },
                    { name: 'Olive Oil 500ml', price: 6.99, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80', desc: 'Extra virgin olive oil' },
                ],
            },
        ],
    },
    {
        name: 'Health Pharmacy',
        type: 'PHARMACY' as const,
        image: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=800&q=80',
        opensAt: 480, // 08:00
        closesAt: 1200, // 20:00
        categories: [
            {
                name: 'Medicines',
                products: [
                    { name: 'Paracetamol 500mg', price: 4.99, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80', desc: 'Pain relief tablets' },
                    { name: 'Ibuprofen 400mg', price: 5.49, image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80', desc: 'Anti-inflammatory' },
                    { name: 'Vitamin C 1000mg', price: 8.99, image: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=800&q=80', desc: 'Immune support' },
                    { name: 'Multivitamins', price: 12.99, image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=800&q=80', desc: 'Daily vitamins' },
                    { name: 'First Aid Kit', price: 15.99, image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=800&q=80', desc: 'Complete first aid supplies' },
                    { name: 'Cough Syrup', price: 6.99, image: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&q=80', desc: 'Cough relief' },
                    { name: 'Hand Sanitizer 500ml', price: 3.99, image: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=800&q=80', desc: 'Antibacterial gel' },
                    { name: 'Face Masks (50 pack)', price: 9.99, image: 'https://images.unsplash.com/photo-1584634430851-86dbd8c2c1a7?w=800&q=80', desc: 'Disposable masks' },
                    { name: 'Digital Thermometer', price: 14.99, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80', desc: 'Quick-read thermometer' },
                    { name: 'Blood Pressure Monitor', price: 39.99, image: 'https://images.unsplash.com/photo-1615486511484-92e172cc4fe0?w=800&q=80', desc: 'Digital BP monitor' },
                ],
            },
        ],
    },
    {
        name: 'Breakfast Club',
        type: 'RESTAURANT' as const,
        image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80',
        opensAt: 360, // 06:00
        closesAt: 840, // 14:00
        categories: [
            {
                name: 'Breakfast',
                products: [
                    { name: 'Pancake Stack', price: 7.99, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80', desc: 'Fluffy pancakes, syrup, butter' },
                    { name: 'French Toast', price: 8.49, image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&q=80', desc: 'Cinnamon, powdered sugar' },
                    { name: 'Eggs Benedict', price: 11.99, image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=800&q=80', desc: 'Poached eggs, hollandaise' },
                    { name: 'Avocado Toast', price: 9.99, image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&q=80', desc: 'Smashed avocado, sourdough' },
                    { name: 'Breakfast Burrito', price: 10.49, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80', desc: 'Eggs, bacon, cheese, salsa' },
                    { name: 'Omelette', price: 9.49, image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80', desc: 'Three eggs, choice of fillings' },
                    { name: 'Granola Bowl', price: 8.99, image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&q=80', desc: 'Yogurt, granola, fresh berries' },
                    { name: 'Bagel & Cream Cheese', price: 5.99, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80', desc: 'Fresh bagel, spread' },
                    { name: 'Waffles', price: 8.99, image: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&q=80', desc: 'Belgian waffles, toppings' },
                    { name: 'Full English Breakfast', price: 13.99, image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80', desc: 'Eggs, bacon, sausage, beans, toast' },
                ],
            },
        ],
    },
    {
        name: 'Dessert Paradise',
        type: 'RESTAURANT' as const,
        image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80',
        opensAt: 600, // 10:00
        closesAt: 1380, // 23:00
        categories: [
            {
                name: 'Desserts',
                products: [
                    { name: 'Chocolate Cake', price: 6.99, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80', desc: 'Rich chocolate layer cake' },
                    { name: 'Cheesecake', price: 7.49, image: 'https://images.unsplash.com/photo-1533134486753-c833f0ed4866?w=800&q=80', desc: 'New York style cheesecake' },
                    { name: 'Tiramisu', price: 7.99, image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=80', desc: 'Classic Italian dessert' },
                    { name: 'Apple Pie', price: 6.49, image: 'https://images.unsplash.com/photo-1535920527002-b35e96722eb9?w=800&q=80', desc: 'Homemade apple pie, vanilla ice cream' },
                    { name: 'Brownies', price: 5.99, image: 'https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=800&q=80', desc: 'Fudgy chocolate brownies' },
                    { name: 'Crème Brûlée', price: 8.49, image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=800&q=80', desc: 'Vanilla custard, caramelized sugar' },
                    { name: 'Macarons (6 pack)', price: 9.99, image: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=800&q=80', desc: 'Assorted French macarons' },
                    { name: 'Ice Cream Sundae', price: 6.99, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80', desc: 'Three scoops, toppings, whipped cream' },
                    { name: 'Lava Cake', price: 8.99, image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&q=80', desc: 'Molten chocolate center' },
                    { name: 'Panna Cotta', price: 7.49, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80', desc: 'Vanilla cream, berry compote' },
                ],
            },
        ],
    },
    {
        name: 'Asian Fusion',
        type: 'RESTAURANT' as const,
        image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80',
        opensAt: 660, // 11:00
        closesAt: 1380, // 23:00
        categories: [
            {
                name: 'Asian Cuisine',
                products: [
                    { name: 'Pad Thai', price: 11.99, image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&q=80', desc: 'Rice noodles, shrimp, peanuts' },
                    { name: 'Chicken Teriyaki', price: 12.49, image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80', desc: 'Grilled chicken, teriyaki sauce' },
                    { name: 'Beef Pho', price: 10.99, image: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=800&q=80', desc: 'Vietnamese beef noodle soup' },
                    { name: 'Spring Rolls', price: 7.99, image: 'https://images.unsplash.com/photo-1594756202469-9ff9799b2e4e?w=800&q=80', desc: 'Fresh vegetables, rice paper' },
                    { name: 'Fried Rice', price: 9.99, image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80', desc: 'Egg fried rice, vegetables' },
                    { name: 'Tom Yum Soup', price: 8.99, image: 'https://images.unsplash.com/photo-1561043433-aaf687c4cf04?w=800&q=80', desc: 'Spicy Thai soup, shrimp' },
                    { name: 'Dumplings (8 pcs)', price: 9.49, image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80', desc: 'Steamed pork dumplings' },
                    { name: 'Korean BBQ Bowl', price: 13.99, image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80', desc: 'Marinated beef, rice, kimchi' },
                    { name: 'Ramen Bowl', price: 11.49, image: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=800&q=80', desc: 'Tonkotsu broth, pork, egg' },
                    { name: 'Curry Chicken', price: 12.99, image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=800&q=80', desc: 'Thai green curry, coconut milk' },
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

        // Create categories and products
        for (const categoryData of restaurantData.categories) {
            const category: NewDbProductCategory = {
                businessId: createdBusiness.id,
                name: categoryData.name,
            };

            const [createdCategory] = await db.insert(productCategories).values(category).returning();

            // Create products for this category
            const productPromises = categoryData.products.map((productData) => {
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
                return db.insert(products).values(product);
            });

            await Promise.all(productPromises);
            console.log(`  📦 Added ${categoryData.products.length} products to ${categoryData.name}`);
        }
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${RESTAURANTS_DATA.length} businesses created`);
    console.log(`  - Each with 10 curated products`);
    console.log(`  - Total products: ${RESTAURANTS_DATA.length * 10}`);
    console.log('\n🔐 Admin credentials: admin@admin.com / 12345678\n');
}

seed()
    .catch((error) => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
