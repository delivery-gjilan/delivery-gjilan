import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { personalInventory } from '@/database/schema/personalInventory';
import { orderItems } from '@/database/schema/orderItems';
import { orders } from '@/database/schema/orders';
import { products } from '@/database/schema/products';
import { storeSettings } from '@/database/schema/storeSettings';
import { orderCoverageLogs } from '@/database/schema/orderCoverageLogs';
import { eq, and, sql } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const orderCoverage: NonNullable<QueryResolvers['orderCoverage']> = async (
    _parent,
    { orderId },
    ctx,
) => {
    if (ctx.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only super admins can view order coverage', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const db = await getDB();

    // Check if inventory mode is enabled
    const settings = await db
        .select({ inventoryModeEnabled: storeSettings.inventoryModeEnabled })
        .from(storeSettings)
        .where(eq(storeSettings.id, 'default'))
        .limit(1);

    if (!settings.length || !settings[0].inventoryModeEnabled) {
        return null;
    }

    // Get the order with its business
    const orderRows = await db
        .select({ businessId: orders.businessId })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

    if (!orderRows.length) {
        throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
    }

    const businessId = orderRows[0].businessId;

    // Check for existing coverage log
    const existingLogs = await db
        .select()
        .from(orderCoverageLogs)
        .where(eq(orderCoverageLogs.orderId, orderId));

    // Get order items with product info
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

    // Aggregate quantities for same product (e.g. same product with different options)
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

    // Get inventory for this business
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

    // Build existing log map
    const logMap = new Map<string, { deducted: boolean }>();
    for (const log of existingLogs) {
        logMap.set(log.productId, { deducted: log.deducted });
    }

    // Calculate coverage
    const coverageItems: any[] = [];
    let fullyOwnedCount = 0;
    let partiallyOwnedCount = 0;
    let marketOnlyCount = 0;

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

        const logEntry = logMap.get(productId);

        coverageItems.push({
            productId,
            productName: agg.productName,
            productImageUrl: agg.productImageUrl,
            orderedQty: qty,
            fromStock,
            fromMarket,
            status,
            deducted: logEntry?.deducted ?? false,
        });
    }

    const totalItems = coverageItems.length;
    const allDeducted = existingLogs.length > 0 && existingLogs.every((l) => l.deducted);

    return {
        orderId,
        items: coverageItems,
        totalItems,
        fullyOwnedCount,
        partiallyOwnedCount,
        marketOnlyCount,
        allFromStock: marketOnlyCount === 0 && partiallyOwnedCount === 0,
        allFromMarket: fullyOwnedCount === 0 && partiallyOwnedCount === 0,
        deducted: allDeducted,
    };
};
