import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { businessMessages as businessMessagesTable } from '@/database/schema';
import { eq, desc } from 'drizzle-orm';

export const myBusinessMessages: NonNullable<QueryResolvers['myBusinessMessages']> = async (
    _parent: unknown,
    { limit = 50, offset = 0 }: { limit?: number; offset?: number },
    context: any,
) => {
    const { userData, db } = context;
    if (!userData?.userId) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

    const isBusinessUser =
        userData.role === 'BUSINESS_OWNER' ||
        userData.role === 'BUSINESS_EMPLOYEE';
    if (!isBusinessUser) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

    try {
        const msgs = await db
            .select()
            .from(businessMessagesTable)
            .where(eq(businessMessagesTable.businessUserId, userData.userId))
            .orderBy(desc(businessMessagesTable.createdAt))
            .limit(limit)
            .offset(offset);

        return msgs.reverse();
    } catch (err) {
        logger.error({ err }, 'myBusinessMessages:query:failed');
        throw new GraphQLError('Failed to fetch messages');
    }
};
