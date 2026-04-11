import { desc, eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { orderReviews } from '@/database/schema';
import type { QueryResolvers } from './../../../../generated/types.generated';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export const businessOrderReviews: NonNullable<QueryResolvers['businessOrderReviews']> = async (
    _parent,
    { limit, offset },
    { db, userData },
) => {
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    if (userData.role !== 'BUSINESS_OWNER' && userData.role !== 'BUSINESS_EMPLOYEE') {
        throw new GraphQLError('Only business users can view order reviews', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    if (!userData.businessId) {
        throw new GraphQLError('Business user must be associated with a business', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const safeLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const safeOffset = Math.max(offset ?? 0, 0);

    const rows = await db.query.orderReviews.findMany({
        where: eq(orderReviews.businessId, userData.businessId),
        orderBy: [desc(orderReviews.createdAt)],
        limit: safeLimit,
        offset: safeOffset,
    });

    return rows.map((row) => ({
        ...row,
        comment: row.comment ?? null,
        quickFeedback: row.quickFeedback ?? [],
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
    }));
};
