import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { personalInventory } from '@/database/schema/personalInventory';
import { orderItems } from '@/database/schema/orderItems';
import { orders } from '@/database/schema/orders';
import { products } from '@/database/schema/products';
import { orderCoverageLogs } from '@/database/schema/orderCoverageLogs';
import { eq, and, sql, inArray } from 'drizzle-orm';
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

    // Get order items with source product resolution
    const items = await db
        .select({
            productId: orderItems.productId,
            quantity: orderItems.quantity,
            productName: products.name,
            productImageUrl: products.imageUrl,
            sourceProductId: products.sourceProductId,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, orderId));

    // For adopted products, resolve the inventory product ID (sourceProductId)
    // and collect the source business IDs for inventory lookups
    const sourceProductIds = new Set<string>();
    const inventoryProductMap = new Map<string, string>(); // productId → inventory lookup ID
    for (const item of items) {
        const invId = item.sourceProductId ?? item.productId;
        inventoryProductMap.set(item.productId, invId);
        sourceProductIds.add(invId);
    }

    // If any adopted products exist, fetch source product business IDs
    const sourceBusinessIds = new Set<string>([businessId]);
    const adoptedSourceIds = [...sourceProductIds].filter((sid) =>
        items.some((i) => i.sourceProductId && (i.sourceProductId === sid)),
    );
    if (adoptedSourceIds.length > 0) {
        const sourceProducts = await db
            .select({ id: products.id, businessId: products.businessId })
            .from(products)
            .where(inArray(products.id, adoptedSourceIds));
        for (const sp of sourceProducts) {
            sourceBusinessIds.add(sp.businessId);
        }
    }

    // Aggregate quantities — keyed by INVENTORY product ID
    const aggregated = new Map<string, { productName: string; productImageUrl: string | null; totalQty: number; orderProductId: string }>();
    for (const item of items) {
        const invId = inventoryProductMap.get(item.productId)!;
        const existing = aggregated.get(invId);
        if (existing) {
            existing.totalQty += item.quantity;
        } else {
            aggregated.set(invId, {
                productName: item.productName,
                productImageUrl: item.productImageUrl,
                totalQty: item.quantity,
                orderProductId: item.productId,
            });
        }
    }

    // Get inventory across all relevant businesses
    const inventoryRows = await db
        .select({
            productId: personalInventory.productId,
            quantity: personalInventory.quantity,
            businessId: personalInventory.businessId,
        })
        .from(personalInventory)
        .where(inArray(personalInventory.businessId, [...sourceBusinessIds]));

    const inventoryMap = new Map<string, { quantity: number; businessId: string }>();
    for (const inv of inventoryRows) {
        inventoryMap.set(inv.productId, { quantity: inv.quantity, businessId: inv.businessId });
    }

    // Calculate coverage and deduct
    const coverageItems: any[] = [];
    let fullyOwnedCount = 0;
    let partiallyOwnedCount = 0;
    let marketOnlyCount = 0;
    const now = new Date().toISOString();

    for (const [productId, agg] of aggregated) {
        const inv = inventoryMap.get(productId);
        const ownedQty = inv?.quantity ?? 0;
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
        if (fromStock > 0 && inv) {
            const newQty = Math.max(0, ownedQty - fromStock);
            await db
                .update(personalInventory)
                .set({ quantity: newQty, updatedAt: now })
                .where(
                    and(
                        eq(personalInventory.businessId, inv.businessId),
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
