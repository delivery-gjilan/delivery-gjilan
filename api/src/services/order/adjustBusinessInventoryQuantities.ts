import type { DbType } from '@/database';
import type { Order } from '@/generated/types.generated';
import { orderCoverageLogs } from '@/database/schema/orderCoverageLogs';
import { products } from '@/database/schema/products';
import { storeSettings } from '@/database/schema/storeSettings';
import { eq, and, inArray, isNotNull } from 'drizzle-orm';

/**
 * Adjusts order item quantities for business users when inventory mode is enabled.
 *
 * When stock has been deducted (via deductOrderStock), business users should only
 * see the fromMarket portion of each item — the part they need to pick from the
 * market.  Items fully covered by stock (fromMarket === 0) are removed entirely.
 *
 * Adopted catalog products (sourceProductId != null) are always removed from the
 * business view — the adopting business doesn't prepare them; the source market does.
 *
 * Coverage logs are per-product, but order items can have the same product
 * multiple times (with different options).  We distribute the fromMarket budget
 * sequentially across matching items.
 */
export async function adjustBusinessInventoryQuantities(
    db: DbType,
    orders: Order[],
    businessId: string,
): Promise<Order[]> {
    if (orders.length === 0) return orders;

    // Check if inventory mode is enabled (single-row table)
    const settings = await db.query.storeSettings.findFirst({
        columns: { inventoryModeEnabled: true },
    });
    if (!settings?.inventoryModeEnabled) return orders;

    // Collect all product IDs across all orders to check for adopted products
    const allProductIds = new Set<string>();
    for (const order of orders) {
        for (const biz of order.businesses ?? []) {
            for (const item of biz.items) {
                allProductIds.add(String(item.productId));
            }
        }
    }

    // Find which products are adopted (have sourceProductId)
    const adoptedProducts = allProductIds.size > 0
        ? await db
              .select({ id: products.id })
              .from(products)
              .where(and(inArray(products.id, [...allProductIds]), isNotNull(products.sourceProductId)))
        : [];
    const adoptedProductIds = new Set(adoptedProducts.map((p) => p.id));

    // Fetch coverage logs for all orders where stock was deducted
    const orderIds = orders.map((o) => String(o.id));
    const logs = await db
        .select({
            orderId: orderCoverageLogs.orderId,
            productId: orderCoverageLogs.productId,
            fromMarket: orderCoverageLogs.fromMarket,
        })
        .from(orderCoverageLogs)
        .where(and(inArray(orderCoverageLogs.orderId, orderIds), eq(orderCoverageLogs.deducted, true)));

    // Index: orderId -> productId -> fromMarket
    const coverageMap = new Map<string, Map<string, number>>();
    for (const log of logs) {
        let orderMap = coverageMap.get(log.orderId);
        if (!orderMap) {
            orderMap = new Map();
            coverageMap.set(log.orderId, orderMap);
        }
        orderMap.set(log.productId, log.fromMarket);
    }

    // If no adopted products and no coverage logs, nothing to adjust
    if (adoptedProductIds.size === 0 && logs.length === 0) return orders;

    return orders.map((order) => {
        const orderCoverage = coverageMap.get(String(order.id));

        const adjustedBusinesses = (order.businesses ?? []).map((biz) => {
            // Only adjust items for the requesting business
            if (biz.business.id !== businessId) return biz;

            // Track remaining fromMarket budget per product for sequential distribution
            const marketBudget = new Map<string, number>();
            if (orderCoverage) {
                for (const [productId, fromMarket] of orderCoverage) {
                    marketBudget.set(productId, fromMarket);
                }
            }

            const adjustedItems = [];
            for (const item of biz.items) {
                const pid = String(item.productId);

                // Adopted catalog products — business doesn't prepare these
                if (adoptedProductIds.has(pid)) continue;

                const hasCoverage = orderCoverage?.has(pid);
                if (!hasCoverage) {
                    // No coverage record for this product — keep as-is
                    adjustedItems.push(item);
                    continue;
                }

                const remaining = marketBudget.get(pid) ?? 0;
                if (remaining <= 0) {
                    // All market budget consumed or fully from stock — remove item
                    continue;
                }

                const adjustedQty = Math.min(item.quantity, remaining);
                marketBudget.set(pid, remaining - adjustedQty);
                adjustedItems.push({ ...item, quantity: adjustedQty });
            }

            return { ...biz, items: adjustedItems };
        });

        return { ...order, businesses: adjustedBusinesses };
    });
}
