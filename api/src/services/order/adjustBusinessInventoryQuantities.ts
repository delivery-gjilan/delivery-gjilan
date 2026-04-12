import type { DbType } from '@/database';
import type { Order } from '@/generated/types.generated';
import { orderCoverageLogs } from '@/database/schema/orderCoverageLogs';
import { storeSettings } from '@/database/schema/storeSettings';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Adjusts order item quantities for business users when inventory mode is enabled.
 *
 * When stock has been deducted (via deductOrderStock), business users should only
 * see the fromMarket portion of each item — the part they need to pick from the
 * market.  Items fully covered by stock (fromMarket === 0) are removed entirely.
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

    if (logs.length === 0) return orders;

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

    return orders.map((order) => {
        const orderCoverage = coverageMap.get(String(order.id));
        if (!orderCoverage) return order;

        const adjustedBusinesses = (order.businesses ?? []).map((biz) => {
            // Only adjust items for the requesting business
            if (biz.business.id !== businessId) return biz;

            // Track remaining fromMarket budget per product for sequential distribution
            const marketBudget = new Map<string, number>();
            for (const [productId, fromMarket] of orderCoverage) {
                marketBudget.set(productId, fromMarket);
            }

            const adjustedItems = [];
            for (const item of biz.items) {
                const pid = String(item.productId);
                const hasCoverage = orderCoverage.has(pid);
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
