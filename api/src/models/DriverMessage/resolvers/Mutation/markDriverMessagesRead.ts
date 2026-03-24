import type   { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { driverMessages as driverMessagesTable } from '@/database/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

export const markDriverMessagesRead: NonNullable<MutationResolvers['markDriverMessagesRead']> = async (
    _parent: unknown,
    { otherUserId }: { otherUserId: string },
    context: any,
) => {
    const { userData, db } = context;
    if (!userData?.userId) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

    const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN';
    const isDriver = userData.role === 'DRIVER';

    try {
        if (isAdmin) {
            // Admin marks driver's messages as read
            await db
                .update(driverMessagesTable)
                .set({ readAt: sql`CURRENT_TIMESTAMP` })
                .where(
                    and(
                        eq(driverMessagesTable.adminId, userData.userId),
                        eq(driverMessagesTable.driverId, otherUserId),
                        eq(driverMessagesTable.senderRole, 'DRIVER'),
                        isNull(driverMessagesTable.readAt),
                    ),
                );
        } else if (isDriver) {
            // Driver marks admin's messages as read
            await db
                .update(driverMessagesTable)
                .set({ readAt: sql`CURRENT_TIMESTAMP` })
                .where(
                    and(
                        eq(driverMessagesTable.adminId, otherUserId),
                        eq(driverMessagesTable.driverId, userData.userId),
                        eq(driverMessagesTable.senderRole, 'ADMIN'),
                        isNull(driverMessagesTable.readAt),
                    ),
                );
        } else {
            throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
        }

        return true;
    } catch (err) {
        logger.error({ err }, 'markDriverMessagesRead:failed');
        throw new GraphQLError('Failed to mark messages as read');
    }
};
