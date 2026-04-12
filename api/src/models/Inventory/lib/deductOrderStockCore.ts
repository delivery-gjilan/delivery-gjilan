/**
 * Core stock-deduction logic for a delivered order.
 *
 * Calculates per-item coverage (fromStock / fromMarket), decrements
 * personal_inventory quantities, and writes/updates order_coverage_logs.
 *
 * Idempotent: already-deducted items are skipped via onConflictDoUpdate.
 * Can be called automatically (on DELIVERED) or manually (admin override).
 */

import type { DbType } from '@/database';
import { personalInventory } from '@/database/schema/personalInventory';
import { orderItems } from '@/database/schema/orderItems';
import { orders } from '@/database/schema/orders';
import { products } from '@/database/schema/products';
import { orderCoverageLogs } from '@/database/schema/orderCoverageLogs';
import { eq, and, inArray } from 'drizzle-orm';

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

    // Get order items with source product resolution (for adopted products)
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

    // Aggregate quantities keyed by inventory product ID
    const aggregated = new Map<string, {
        productName: string;
        productImageUrl: string | null;
        totalQty: number;
    }>();
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
            });
        }
    }

    // Load inventory for all relevant businesses
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

    // Calculate coverage, deduct, and log
    const coverageItems: CoverageItem[] = [];
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
        let status: CoverageItem['status'];

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

        // Only deduct if not already deducted for this item
        const shouldDeduct = fromStock > 0 && inv && !alreadyDeductedSet.has(productId);
        if (shouldDeduct) {
            const newQty = Math.max(0, ownedQty - fromStock);
            await db
                .update(personalInventory)
                .set({ quantity: newQty, updatedAt: now })
                .where(
                    and(
                        eq(personalInventory.businessId, inv!.businessId),
                        eq(personalInventory.productId, productId),
                    ),
                );
        }

        // Upsert coverage log — skip if already deducted (creation-time log is canonical)
        if (!alreadyDeductedSet.has(productId)) {
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
