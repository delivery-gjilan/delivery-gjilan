import type   { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { driverMessages as driverMessagesTable } from '@/database/schema';
import { eq, and, or, desc } from 'drizzle-orm';

export const driverMessages: NonNullable<QueryResolvers['driverMessages']> = async (
    _parent: unknown,
    { driverId, limit = 50, offset = 0 }: { driverId: string; limit?: number; offset?: number },
    context: any,
) => {
    const { userData, db } = context;
    if (!userData?.userId) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

    const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN';
    if (!isAdmin) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

    try {
        const msgs = await db
            .select()
            .from(driverMessagesTable)
            .where(
                and(
                    eq(driverMessagesTable.adminId, userData.userId),
                    eq(driverMessagesTable.driverId, driverId),
                ),
            )
            .orderBy(desc(driverMessagesTable.createdAt))
            .limit(limit)
            .offset(offset);

        return msgs.reverse();
    } catch (err) {
        logger.error({ err }, 'driverMessages:query:failed');
        throw new GraphQLError('Failed to fetch messages');
    }
};
