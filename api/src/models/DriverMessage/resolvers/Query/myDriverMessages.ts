import type   { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { driverMessages as driverMessagesTable } from '@/database/schema';
import { eq, or, desc } from 'drizzle-orm';

export const myDriverMessages: NonNullable<QueryResolvers['myDriverMessages']> = async (
    _parent: unknown,
    { limit = 50, offset = 0 }: { limit?: number; offset?: number },
    context: any,
) => {
    const { userData, db } = context;
    if (!userData?.userId) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

    const isDriver = userData.role === 'DRIVER';
    if (!isDriver) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

    try {
        const msgs = await db
            .select()
            .from(driverMessagesTable)
            .where(eq(driverMessagesTable.driverId, userData.userId))
            .orderBy(desc(driverMessagesTable.createdAt))
            .limit(limit)
            .offset(offset);

        return msgs.reverse();
    } catch (err) {
        logger.error({ err }, 'myDriverMessages:query:failed');
        throw new GraphQLError('Failed to fetch messages');
    }
};
