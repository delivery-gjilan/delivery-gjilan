import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { personalInventory } from '@/database/schema/personalInventory';
import { products } from '@/database/schema/products';
import { eq, and, sql } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

export const inventorySummary: NonNullable<QueryResolvers['inventorySummary']> = async (
    _parent,
    { businessId },
    ctx,
) => {
    if (ctx.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only super admins can view inventory', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const db = await getDB();

    const rows = await db
        .select({
            quantity: personalInventory.quantity,
            lowStockThreshold: personalInventory.lowStockThreshold,
        })
        .from(personalInventory)
        .innerJoin(products, eq(personalInventory.productId, products.id))
        .where(
            and(
                eq(personalInventory.businessId, businessId),
                eq(products.isDeleted, false),
            ),
        );

    let totalTrackedProducts = rows.length;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const row of rows) {
        totalStockValue += row.quantity;
        const threshold = row.lowStockThreshold ?? 2;
        if (row.quantity === 0) {
            outOfStockCount++;
        } else if (row.quantity <= threshold) {
            lowStockCount++;
        }
    }

    return {
        totalTrackedProducts,
        totalStockValue,
        lowStockCount,
        outOfStockCount,
    };
};
