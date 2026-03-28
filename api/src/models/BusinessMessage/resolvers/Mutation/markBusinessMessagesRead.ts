import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { businessMessages as businessMessagesTable } from '@/database/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

export const markBusinessMessagesRead: NonNullable<MutationResolvers['markBusinessMessagesRead']> = async (
    _parent: unknown,
    { otherUserId }: { otherUserId: string },
    context: any,
) => {
    const { userData, db } = context;
    if (!userData?.userId) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

    const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN';
    const isBusinessUser =
        userData.role === 'BUSINESS_OWNER' ||
        userData.role === 'BUSINESS_EMPLOYEE';

    try {
        if (isAdmin) {
            // Admin marks business user's messages as read
            await db
                .update(businessMessagesTable)
                .set({ readAt: sql`CURRENT_TIMESTAMP` })
                .where(
                    and(
                        eq(businessMessagesTable.adminId, userData.userId),
                        eq(businessMessagesTable.businessUserId, otherUserId),
                        eq(businessMessagesTable.senderRole, 'BUSINESS'),
                        isNull(businessMessagesTable.readAt),
                    ),
                );
        } else if (isBusinessUser) {
            // Business user marks admin's messages as read
            await db
                .update(businessMessagesTable)
                .set({ readAt: sql`CURRENT_TIMESTAMP` })
                .where(
                    and(
                        eq(businessMessagesTable.adminId, otherUserId),
                        eq(businessMessagesTable.businessUserId, userData.userId),
                        eq(businessMessagesTable.senderRole, 'ADMIN'),
                        isNull(businessMessagesTable.readAt),
                    ),
                );
        } else {
            throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
        }

        return true;
    } catch (err) {
        logger.error({ err }, 'markBusinessMessagesRead:failed');
        throw new GraphQLError('Failed to mark messages as read');
    }
};
