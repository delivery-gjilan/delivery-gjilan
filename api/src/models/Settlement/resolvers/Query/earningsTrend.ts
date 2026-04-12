import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { settlements } from '@/database/schema';
import { isPlatformAdmin } from '@/lib/utils/permissions';

export const earningsTrend: NonNullable<QueryResolvers['earningsTrend']> = async (
    _parent,
    { type, businessId, driverId, startDate, endDate },
    { db, userData },
) => {
    if (!userData?.userId || !isPlatformAdmin(userData.role)) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    const conditions = [
        gte(settlements.createdAt, startDate as any),
        lte(settlements.createdAt, endDate as any),
    ];
    if (type) conditions.push(eq(settlements.type, type));
    if (businessId) conditions.push(eq(settlements.businessId, businessId));
    if (driverId) conditions.push(eq(settlements.driverId, driverId));

    const dateExpr = sql`DATE(${settlements.createdAt})`;

    const rows = await db
        .select({
            date: sql<string>`${dateExpr}::TEXT`,
            receivable: sql<number>`COALESCE(SUM(CASE WHEN ${settlements.direction} = 'RECEIVABLE' THEN CAST(${settlements.amount} AS NUMERIC) ELSE 0 END), 0)::FLOAT`,
            payable: sql<number>`COALESCE(SUM(CASE WHEN ${settlements.direction} = 'PAYABLE' THEN CAST(${settlements.amount} AS NUMERIC) ELSE 0 END), 0)::FLOAT`,
            net: sql<number>`COALESCE(SUM(CASE WHEN ${settlements.direction} = 'RECEIVABLE' THEN CAST(${settlements.amount} AS NUMERIC) ELSE -CAST(${settlements.amount} AS NUMERIC) END), 0)::FLOAT`,
            count: sql<number>`COUNT(*)::INT`,
        })
        .from(settlements)
        .where(and(...conditions))
        .groupBy(dateExpr)
        .orderBy(dateExpr);

    return rows;
};
