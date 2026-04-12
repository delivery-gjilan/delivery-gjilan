import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { orderCoverageLogs } from '@/database/schema/orderCoverageLogs';
import { orderItems } from '@/database/schema/orderItems';
import { orders } from '@/database/schema/orders';
import { products } from '@/database/schema/products';
import { personalInventory } from '@/database/schema/personalInventory';
import { eq, and, sql, gte, lte, inArray } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const inventoryEarnings: NonNullable<QueryResolvers['inventoryEarnings']> = async (
    _parent,
    { businessId, startDate, endDate },
    ctx,
) => {
    if (ctx.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only super admins can view inventory earnings', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const db = await getDB();

    // Build date conditions for coverage logs
    const conditions = [
        eq(orderCoverageLogs.deducted, true),
    ];

    if (startDate) {
        conditions.push(gte(orderCoverageLogs.createdAt, startDate));
    }
    if (endDate) {
        conditions.push(lte(orderCoverageLogs.createdAt, endDate));
    }

    // Get all deducted coverage logs with order item pricing
    const logs = await db
        .select({
            productId: orderCoverageLogs.productId,
            orderId: orderCoverageLogs.orderId,
            fromStock: orderCoverageLogs.fromStock,
            createdAt: orderCoverageLogs.createdAt,
        })
        .from(orderCoverageLogs)
        .innerJoin(orders, eq(orderCoverageLogs.orderId, orders.id))
        .where(and(
            ...conditions,
            eq(orders.businessId, businessId),
        ));

    if (logs.length === 0) {
        return {
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            averageMargin: 0,
            totalUnitsSold: 0,
            orderCount: 0,
            products: [],
        };
    }

    // Get unique order IDs and product IDs
    const orderIds = [...new Set(logs.map((l) => l.orderId))];
    const productIds = [...new Set(logs.map((l) => l.productId))];

    // Get order items' snapshotted base prices for these orders/products
    const itemRows = await db
        .select({
            orderId: orderItems.orderId,
            productId: orderItems.productId,
            quantity: orderItems.quantity,
            basePrice: orderItems.basePrice,
        })
        .from(orderItems)
        .where(
            and(
                inArray(orderItems.orderId, orderIds),
                inArray(orderItems.productId, productIds),
            ),
        );

    // Build price map: (orderId, productId) → weighted unit price
    const priceKey = (oid: string, pid: string) => `${oid}:${pid}`;
    const priceMap = new Map<string, { totalValue: number; totalQty: number }>();
    for (const item of itemRows) {
        const key = priceKey(item.orderId, item.productId);
        const existing = priceMap.get(key);
        if (existing) {
            existing.totalValue += item.basePrice * item.quantity;
            existing.totalQty += item.quantity;
        } else {
            priceMap.set(key, {
                totalValue: item.basePrice * item.quantity,
                totalQty: item.quantity,
            });
        }
    }

    // Get current cost prices from inventory
    const inventoryRows = await db
        .select({
            productId: personalInventory.productId,
            costPrice: personalInventory.costPrice,
        })
        .from(personalInventory)
        .where(eq(personalInventory.businessId, businessId));

    const costMap = new Map<string, number>();
    for (const inv of inventoryRows) {
        costMap.set(inv.productId, Number(inv.costPrice ?? 0));
    }

    // Get product details
    const productRows = await db
        .select({
            id: products.id,
            name: products.name,
            imageUrl: products.imageUrl,
        })
        .from(products)
        .where(inArray(products.id, productIds));

    const productMap = new Map<string, { name: string; imageUrl: string | null }>();
    for (const p of productRows) {
        productMap.set(p.id, { name: p.name, imageUrl: p.imageUrl });
    }

    // Aggregate per product
    const productEarnings = new Map<string, {
        unitsSold: number;
        revenue: number;
        cost: number;
    }>();

    for (const log of logs) {
        const key = priceKey(log.orderId, log.productId);
        const price = priceMap.get(key);
        if (!price || price.totalQty === 0) continue;

        const unitPrice = price.totalValue / price.totalQty;
        const revenue = unitPrice * log.fromStock;
        const unitCost = costMap.get(log.productId) ?? 0;
        const cost = unitCost * log.fromStock;

        const existing = productEarnings.get(log.productId);
        if (existing) {
            existing.unitsSold += log.fromStock;
            existing.revenue += revenue;
            existing.cost += cost;
        } else {
            productEarnings.set(log.productId, {
                unitsSold: log.fromStock,
                revenue,
                cost,
            });
        }
    }

    // Build response
    let totalRevenue = 0;
    let totalCost = 0;
    let totalUnitsSold = 0;
    const productsList: any[] = [];

    for (const [productId, data] of productEarnings) {
        const info = productMap.get(productId);
        const profit = data.revenue - data.cost;
        const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;

        totalRevenue += data.revenue;
        totalCost += data.cost;
        totalUnitsSold += data.unitsSold;

        productsList.push({
            productId,
            productName: info?.name ?? 'Unknown Product',
            productImageUrl: info?.imageUrl ?? null,
            unitsSold: data.unitsSold,
            revenue: Number(data.revenue.toFixed(2)),
            cost: Number(data.cost.toFixed(2)),
            profit: Number(profit.toFixed(2)),
            margin: Number(margin.toFixed(1)),
        });
    }

    // Sort by revenue descending
    productsList.sort((a, b) => b.revenue - a.revenue);

    const totalProfit = totalRevenue - totalCost;
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
        averageMargin: Number(averageMargin.toFixed(1)),
        totalUnitsSold,
        orderCount: orderIds.length,
        products: productsList,
    };
};