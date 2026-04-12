import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { personalInventory } from '@/database/schema/personalInventory';
import { orderItems } from '@/database/schema/orderItems';
import { orders } from '@/database/schema/orders';
import { products } from '@/database/schema/products';
import { orderCoverageLogs } from '@/database/schema/orderCoverageLogs';
import { eq, and, sql } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const deductOrderStock: NonNullable<MutationResolvers['deductOrderStock']> = async (
    _parent,
    { orderId },
    ctx,
) => {
    if (ctx.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only super admins can deduct stock', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const db = await getDB();

    // Check if already deducted
    const existingLogs = await db
        .select()
        .from(orderCoverageLogs)
        .where(and(eq(orderCoverageLogs.orderId, orderId), eq(orderCoverageLogs.deducted, true)));

    if (existingLogs.length > 0) {
        throw new GraphQLError('Stock has already been deducted for this order', {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }

    // Get order info
    const orderRows = await db
        .select({ businessId: orders.businessId })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

    if (!orderRows.length) {
        throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
    }

    const businessId = orderRows[0].businessId;

    // Get order items
    const items = await db
        .select({
            productId: orderItems.productId,
            quantity: orderItems.quantity,
            productName: products.name,
            productImageUrl: products.imageUrl,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, orderId));

    // Aggregate quantities
    const aggregated = new Map<string, { productName: string; productImageUrl: string | null; totalQty: number }>();
    for (const item of items) {
        const existing = aggregated.get(item.productId);
        if (existing) {
            existing.totalQty += item.quantity;
        } else {
            aggregated.set(item.productId, {
                productName: item.productName,
                productImageUrl: item.productImageUrl,
                totalQty: item.quantity,
            });
        }
    }

    // Get inventory
    const inventoryRows = await db
        .select({
            productId: personalInventory.productId,
            quantity: personalInventory.quantity,
        })
        .from(personalInventory)
        .where(eq(personalInventory.businessId, businessId));

    const inventoryMap = new Map<string, number>();
    for (const inv of inventoryRows) {
        inventoryMap.set(inv.productId, inv.quantity);
    }

    // Calculate coverage and deduct
    const coverageItems: any[] = [];
    let fullyOwnedCount = 0;
    let partiallyOwnedCount = 0;
    let marketOnlyCount = 0;
    const now = new Date().toISOString();

    for (const [productId, agg] of aggregated) {
        const ownedQty = inventoryMap.get(productId) ?? 0;
        const qty = agg.totalQty;
        let fromStock: number;
        let fromMarket: number;
        let status: string;

        if (ownedQty >= qty) {
            fromStock = qty;
            fromMarket = 0;
            status = 'FULLY_OWNED';
            fullyOwnedCount++;
        } else if (ownedQty > 0) {
            fromStock = ownedQty;
            fromMarket = qty - ownedQty;
            status = 'PARTIALLY_OWNED';
            partiallyOwnedCount++;
        } else {
            fromStock = 0;
            fromMarket = qty;
            status = 'MARKET_ONLY';
            marketOnlyCount++;
        }

        // Deduct from inventory if there's stock to deduct
        if (fromStock > 0) {
            const newQty = Math.max(0, ownedQty - fromStock);
            await db
                .update(personalInventory)
                .set({ quantity: newQty, updatedAt: now })
                .where(
                    and(
                        eq(personalInventory.businessId, businessId),
                        eq(personalInventory.productId, productId),
                    ),
                );
        }

        // Log the coverage
        await db
            .insert(orderCoverageLogs)
            .values({
                orderId,
                productId,
                orderedQty: qty,
                fromStock,
                fromMarket,
                deducted: fromStock > 0,
                deductedAt: fromStock > 0 ? now : null,
                createdAt: now,
            })
            .onConflictDoUpdate({
                target: [orderCoverageLogs.orderId, orderCoverageLogs.productId],
                set: {
                    fromStock,
                    fromMarket,
                    deducted: fromStock > 0,
                    deductedAt: fromStock > 0 ? now : null,
                },
            });

        coverageItems.push({
            productId,
            productName: agg.productName,
            productImageUrl: agg.productImageUrl,
            orderedQty: qty,
            fromStock,
            fromMarket,
            status,
            deducted: fromStock > 0,
        });
    }

    const totalItems = coverageItems.length;

    return {
        orderId,
        items: coverageItems,
        totalItems,
        fullyOwnedCount,
        partiallyOwnedCount,
        marketOnlyCount,
        allFromStock: marketOnlyCount === 0 && partiallyOwnedCount === 0,
        allFromMarket: fullyOwnedCount === 0 && partiallyOwnedCount === 0,
        deducted: true,
    };
};
