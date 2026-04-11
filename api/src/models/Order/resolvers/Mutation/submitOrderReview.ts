import { and, eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { orderReviews, orders } from '@/database/schema';
import type { MutationResolvers } from './../../../../generated/types.generated';

const MAX_COMMENT_LENGTH = 1000;
const MAX_QUICK_FEEDBACK_ITEMS = 6;
const MAX_QUICK_FEEDBACK_ITEM_LENGTH = 80;

function normalizeComment(input?: string | null): string | null {
    const value = (input || '').trim();
    if (!value) return null;
    return value.slice(0, MAX_COMMENT_LENGTH);
}

function normalizeQuickFeedback(input?: string[] | null): string[] {
    if (!input || input.length === 0) return [];
    const unique = new Set<string>();

    for (const item of input) {
        const normalized = (item || '').trim().slice(0, MAX_QUICK_FEEDBACK_ITEM_LENGTH);
        if (!normalized) continue;
        unique.add(normalized);
        if (unique.size >= MAX_QUICK_FEEDBACK_ITEMS) break;
    }

    return [...unique];
}

export const submitOrderReview: NonNullable<MutationResolvers['submitOrderReview']> = async (
    _parent,
    { orderId, rating, comment, quickFeedback },
    { db, userData },
) => {
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new GraphQLError('Rating must be an integer between 1 and 5', {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }

    const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
    });

    if (!order) {
        throw new GraphQLError('Order not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    if (order.userId !== userData.userId) {
        throw new GraphQLError('You can only review your own order', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    if (order.status !== 'DELIVERED') {
        throw new GraphQLError('Only delivered orders can be reviewed', {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }

    const normalizedComment = normalizeComment(comment);
    const normalizedQuickFeedback = normalizeQuickFeedback(quickFeedback as string[] | null | undefined);

    const [saved] = await db
        .insert(orderReviews)
        .values({
            orderId: order.id,
            businessId: order.businessId,
            userId: userData.userId,
            rating,
            comment: normalizedComment,
            quickFeedback: normalizedQuickFeedback,
        })
        .onConflictDoUpdate({
            target: orderReviews.orderId,
            set: {
                rating,
                comment: normalizedComment,
                quickFeedback: normalizedQuickFeedback,
                updatedAt: new Date().toISOString(),
            },
            where: and(eq(orderReviews.orderId, order.id), eq(orderReviews.userId, userData.userId)),
        })
        .returning();

    if (!saved) {
        throw new GraphQLError('Unable to save review', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
    }

    return {
        ...saved,
        comment: saved.comment ?? null,
        quickFeedback: saved.quickFeedback ?? [],
        createdAt: new Date(saved.createdAt),
        updatedAt: new Date(saved.updatedAt),
    };
};
