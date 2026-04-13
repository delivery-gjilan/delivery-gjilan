import { and, desc, eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { orderReviews } from '@/database/schema';
import type { QueryResolvers } from './../../../../generated/types.generated';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export const adminOrderReviews: NonNullable<QueryResolvers['adminOrderReviews']> = async (
    _parent,
    { businessId, rating, limit, offset },
    { db, userData },
) => {
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    if (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Admin access required', { extensions: { code: 'FORBIDDEN' } });
    }

    const safeLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const safeOffset = Math.max(offset ?? 0, 0);

    const conditions = [
        eq(orderReviews.businessId, businessId),
        ...(rating != null ? [eq(orderReviews.rating, rating)] : []),
    ];

    const rows = await db.query.orderReviews.findMany({
        where: and(...conditions),
        orderBy: [desc(orderReviews.createdAt)],
        limit: safeLimit,
        offset: safeOffset,
        with: { user: true },
    });

    return rows.map((row) => ({
        ...row,
        comment: row.comment ?? null,
        quickFeedback: row.quickFeedback ?? [],
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        user: row.user
            ? {
                  id: row.user.id,
                  firstName: row.user.firstName,
                  lastName: row.user.lastName,
                  phoneNumber: row.user.phoneNumber ?? null,
              }
            : null,
    }));
};
