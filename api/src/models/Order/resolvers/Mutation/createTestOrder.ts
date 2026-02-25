import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { orders, orderItems, deliveryPricingTiers } from '@/database/schema';
import { businesses as businessesTable, products as productsTable } from '@/database/schema';
import { users as usersTable } from '@/database/schema';
import { eq, asc } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const createTestOrder: NonNullable<MutationResolvers['createTestOrder']> = async (
    _parent,
    _args,
    context,
) => {
    const { orderService } = context;
    const db = await getDB();

    // 1. Find Casbas Pizza
    const [casbasPizza] = await db
        .select()
        .from(businessesTable)
        .where(eq(businessesTable.name, 'Casbas Pizza'));

    if (!casbasPizza) {
        throw new GraphQLError('Casbas Pizza not found in database. Please run seed first.');
    }

    // 2. Get products from Casbas Pizza
    const casbasProducts = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.businessId, casbasPizza.id));

    if (casbasProducts.length === 0) {
        throw new GraphQLError('No products found for Casbas Pizza.');
    }

    // 3. Find a random CUSTOMER user
    const customerUsers = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.role, 'CUSTOMER'));

    if (customerUsers.length === 0) {
        throw new GraphQLError('No customer users found in database.');
    }

    const randomCustomer = customerUsers[Math.floor(Math.random() * customerUsers.length)];

    // 4. Pick 1-3 random products
    const numProducts = Math.floor(Math.random() * 3) + 1;
    const shuffled = [...casbasProducts].sort(() => Math.random() - 0.5);
    const selectedProducts = shuffled.slice(0, numProducts);

    // 5. Calculate totals
    const itemsData = selectedProducts.map((product) => ({
        productId: product.id,
        quantity: Math.floor(Math.random() * 2) + 1,
        price: Number(product.isOnSale && product.salePrice ? product.salePrice : product.price),
    }));

    const orderPrice = itemsData.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Calculate delivery price from tiers (use test dropoff → business distance)
    const dropoffLat = 42.4602;
    const dropoffLng = 21.4691;
    let deliveryPrice = 1.5; // fallback

    const tiers = await db
        .select()
        .from(deliveryPricingTiers)
        .where(eq(deliveryPricingTiers.isActive, true))
        .orderBy(asc(deliveryPricingTiers.sortOrder));

    if (tiers.length > 0) {
        const R = 6371;
        const dLat = ((dropoffLat - casbasPizza.locationLat) * Math.PI) / 180;
        const dLng = ((dropoffLng - casbasPizza.locationLng) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((casbasPizza.locationLat * Math.PI) / 180) *
                Math.cos((dropoffLat * Math.PI) / 180) *
                Math.sin(dLng / 2) ** 2;
        const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const matched = tiers.find((t) => {
            if (t.maxDistanceKm === null) return distanceKm >= t.minDistanceKm;
            return distanceKm >= t.minDistanceKm && distanceKm < t.maxDistanceKm;
        });
        if (matched) deliveryPrice = matched.price;
        else deliveryPrice = tiers[tiers.length - 1].price;
    }

    // 6. Create order directly in DB (bypass business hours / promo validation)
    const [createdOrder] = await db
        .insert(orders)
        .values({
            userId: randomCustomer.id,
            price: orderPrice,
            deliveryPrice,
            status: 'PENDING',
            dropoffLat: 42.4602,
            dropoffLng: 21.4691,
            dropoffAddress: 'Rr. Adem Jashari, Gjilan',
        })
        .returning();

    // 7. Insert order items
    await db.insert(orderItems).values(
        itemsData.map((item) => ({
            orderId: createdOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
        })),
    );

    // 8. Publish updates for real-time subscriptions
    await orderService.publishUserOrders(randomCustomer.id);
    await orderService.publishAllOrders();

    // 9. Return the order through the normal mapping
    const dbOrder = await orderService.orderRepository.findById(createdOrder.id);
    if (!dbOrder) {
        throw new GraphQLError('Failed to retrieve created test order.');
    }

    return orderService.mapToOrderPublic(dbOrder);
};