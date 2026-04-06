import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { orders, businesses } from '@/database/schema';
import { eq, and, gte, sql, count, sum, avg } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export const businessPerformanceStats: NonNullable<QueryResolvers['businessPerformanceStats']> = async (
    _parent,
    { days = 30 },
    { userData },
) => {
    if (!userData.role || !['SUPER_ADMIN', 'ADMIN'].includes(userData.role)) {
        throw AppError.forbidden();
    }

    const db = await getDB();

    const since = new Date();
    since.setDate(since.getDate() - (days ?? 30));
    const sinceIso = since.toISOString();

    const rows = await db
        .select({
            businessId: businesses.id,
            businessName: businesses.name,
            imageUrl: businesses.imageUrl,
            isFeatured: businesses.isFeatured,
            totalOrders: count(orders.id),
            totalRevenue: sql<number>`COALESCE(SUM(${orders.actualPrice}), 0)`,
            avgOrderValue: sql<number>`COALESCE(AVG(${orders.actualPrice}), 0)`,
        })
        .from(businesses)
        .leftJoin(
            orders,
            and(
                eq(orders.businessId, businesses.id),
                eq(orders.status, 'DELIVERED'),
                gte(orders.createdAt, sinceIso),
            ),
        )
        .groupBy(businesses.id, businesses.name, businesses.imageUrl, businesses.isFeatured)
        .orderBy(sql`SUM(${orders.actualPrice}) DESC NULLS LAST`);

    return rows.map((r) => ({
        businessId: r.businessId,
        businessName: r.businessName,
        imageUrl: r.imageUrl ?? null,
        isFeatured: r.isFeatured,
        totalOrders: Number(r.totalOrders),
        totalRevenue: Number(r.totalRevenue),
        avgOrderValue: Number(r.avgOrderValue),
    }));
};
