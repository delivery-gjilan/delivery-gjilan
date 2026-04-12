/**
 * Core stock-deduction logic for a delivered order.
 *
 * Uses order_items.inventory_quantity as the CANONICAL allocation decided at
 * order-creation time. This prevents re-deriving coverage from current inventory
 * (which may have changed since creation) in the case the post-creation deduction
 * step failed to write coverage logs.
 *
 * Idempotent: already-deducted items are skipped.
 * Can be called automatically (on DELIVERED) or manually (admin override).
 */

import type { DbType } from '@/database';
import { personalInventory } from '@/database/schema/personalInventory';
import { orderItems } from '@/database/schema/orderItems';
import { orders } from '@/database/schema/orders';
import { products } from '@/database/schema/products';
import { orderCoverageLogs } from '@/database/schema/orderCoverageLogs';
import { eq, and, inArray, sql } from 'drizzle-orm';

export interface CoverageItem {
    productId: string;
    productName: string;
    productImageUrl: string | null;
    orderedQty: number;
    fromStock: number;
    fromMarket: number;
    status: 'FULLY_OWNED' | 'PARTIALLY_OWNED' | 'MARKET_ONLY';
    deducted: boolean;
}

export interface OrderCoverageResult {
    orderId: string;
    items: CoverageItem[];
    totalItems: number;
    fullyOwnedCount: number;
    partiallyOwnedCount: number;
    marketOnlyCount: number;
    allFromStock: boolean;
    allFromMarket: boolean;
    deducted: boolean;
}

export async function deductOrderStockCore(orderId: string, db: DbType): Promise<OrderCoverageResult> {
    // Get order business
    const orderRows = await db
        .select({ businessId: orders.businessId })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

    if (!orderRows.length) {
        throw new Error(`Order not found: ${orderId}`);
    }

    const businessId = orderRows[0].businessId;

    // Get order items with canonical inventory_quantity (set at creation time).
    // This is the authoritative allocation — we never re-derive fromStock from
    // current inventory levels, which may have changed since the order was placed.
    const items = await db
        .select({
            productId: orderItems.productId,
            quantity: orderItems.quantity,
            inventoryQuantity: orderItems.inventoryQuantity,
            productName: products.name,
            productImageUrl: products.imageUrl,
            sourceProductId: products.sourceProductId,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, orderId));

    // Build inventory lookup map: orderProductId → inventory product ID
    const sourceProductIds = new Set<string>();
    const inventoryProductMap = new Map<string, string>();
    for (const item of items) {
        const invId = item.sourceProductId ?? item.productId;
        inventoryProductMap.set(item.productId, invId);
        sourceProductIds.add(invId);
    }

    // Resolve source business IDs for adopted products
    const sourceBusinessIds = new Set<string>([businessId]);
    const adoptedSourceIds = [...sourceProductIds].filter((sid) =>
        items.some((i) => i.sourceProductId && i.sourceProductId === sid),
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

    // Aggregate per inventory product ID, summing quantities and inventory allocations
    const aggregated = new Map<string, {
        productName: string;
        productImageUrl: string | null;
        totalQty: number;
        totalFromStock: number; // canonical: from order_items.inventory_quantity
    }>();
    for (const item of items) {
        const invId = inventoryProductMap.get(item.productId)!;
        const existing = aggregated.get(invId);
        if (existing) {
            existing.totalQty += item.quantity;
            existing.totalFromStock += item.inventoryQuantity ?? 0;
        } else {
            aggregated.set(invId, {
                productName: item.productName,
                productImageUrl: item.productImageUrl,
                totalQty: item.quantity,
                totalFromStock: item.inventoryQuantity ?? 0,
            });
        }
    }

    // Load inventory for all relevant businesses (only needed to locate the row to decrement)
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

    // Check which items were already deducted (idempotency guard per item)
    const alreadyDeducted = await db
        .select({ productId: orderCoverageLogs.productId })
        .from(orderCoverageLogs)
        .where(and(eq(orderCoverageLogs.orderId, orderId), eq(orderCoverageLogs.deducted, true)));
    const alreadyDeductedSet = new Set(alreadyDeducted.map((r) => r.productId));

    // Calculate coverage for all items first, then batch writes.
    // fromStock comes from order_items.inventory_quantity (canonical creation-time allocation),
    // NOT from current inventory levels. This ensures DELIVERED-time deduction always mirrors
    // what was originally promised even if stock changed in the interim.
    const coverageItems: CoverageItem[] = [];
    let fullyOwnedCount = 0;
    let partiallyOwnedCount = 0;
    let marketOnlyCount = 0;
    const now = new Date().toISOString();

    // Collect items that need deduction and log upsert in a single pass
    const itemsToDeduct: Array<{ businessId: string; productId: string; fromStock: number }> = [];
    const logsToUpsert: Array<{
        orderId: string; productId: string; orderedQty: number;
        fromStock: number; fromMarket: number; deducted: boolean; deductedAt: string | null;
    }> = [];

    for (const [productId, agg] of aggregated) {
        const inv = inventoryMap.get(productId);
        const qty = agg.totalQty;
        const fromStock = agg.totalFromStock;
        const fromMarket = qty - fromStock;
        let status: CoverageItem['status'];

        if (fromStock >= qty) {
            status = 'FULLY_OWNED';
            fullyOwnedCount++;
        } else if (fromStock > 0) {
            status = 'PARTIALLY_OWNED';
            partiallyOwnedCount++;
        } else {
            status = 'MARKET_ONLY';
            marketOnlyCount++;
        }

        const alreadyDone = alreadyDeductedSet.has(productId);

        if (!alreadyDone && fromStock > 0 && inv) {
            itemsToDeduct.push({ businessId: inv.businessId, productId, fromStock });
        }

        if (!alreadyDone) {
            logsToUpsert.push({
                orderId,
                productId,
                orderedQty: qty,
                fromStock,
                fromMarket,
                deducted: fromStock > 0,
                deductedAt: fromStock > 0 ? now : null,
            });
        }

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

    // Batch UPDATE personal_inventory — single round-trip for all items
    if (itemsToDeduct.length > 0) {
        const valuesList = itemsToDeduct.map(
            (e) => sql`(${e.businessId}::uuid, ${e.productId}::uuid, ${e.fromStock}::int)`,
        );
        await db.execute(sql`
            UPDATE personal_inventory AS pi
            SET quantity = GREATEST(0, pi.quantity - v.from_stock),
                updated_at = ${now}
            FROM (VALUES ${sql.join(valuesList, sql`, `)}) AS v(business_id, product_id, from_stock)
            WHERE pi.business_id = v.business_id
              AND pi.product_id = v.product_id
        `);
    }

    // Batch upsert coverage logs — single round-trip for all items
    if (logsToUpsert.length > 0) {
        await db
            .insert(orderCoverageLogs)
            .values(logsToUpsert.map((l) => ({ ...l, createdAt: now })))
            .onConflictDoUpdate({
                target: [orderCoverageLogs.orderId, orderCoverageLogs.productId],
                set: {
                    fromStock: sql`excluded.from_stock`,
                    fromMarket: sql`excluded.from_market`,
                    deducted: sql`excluded.deducted`,
                    deductedAt: sql`excluded.deducted_at`,
                },
            });
    }

    return {
        orderId,
        items: coverageItems,
        totalItems: coverageItems.length,
        fullyOwnedCount,
        partiallyOwnedCount,
        marketOnlyCount,
        allFromStock: marketOnlyCount === 0 && partiallyOwnedCount === 0,
        allFromMarket: fullyOwnedCount === 0 && partiallyOwnedCount === 0,
        deducted: true,
    };
}
