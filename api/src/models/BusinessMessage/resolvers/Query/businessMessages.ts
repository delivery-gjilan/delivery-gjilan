import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { businessMessages as businessMessagesTable } from '@/database/schema';
import { eq, desc } from 'drizzle-orm';

export const businessMessages: NonNullable<QueryResolvers['businessMessages']> = async (
    _parent: unknown,
    { businessUserId, limit = 50, offset = 0 }: { businessUserId: string; limit?: number; offset?: number },
    context: any,
) => {
    const { userData, db } = context;
    if (!userData?.userId) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

    const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN';
    if (!isAdmin) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

    try {
        const msgs = await db
            .select()
            .from(businessMessagesTable)
            .where(
                eq(businessMessagesTable.businessUserId, businessUserId),
            )
            .orderBy(desc(businessMessagesTable.createdAt))
            .limit(limit)
            .offset(offset);

        return msgs.reverse();
    } catch (err) {
        logger.error({ err }, 'businessMessages:query:failed');
        throw new GraphQLError('Failed to fetch messages');
    }
};
