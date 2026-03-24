import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { businessMessages as businessMessagesTable, users } from '@/database/schema';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';

export const businessMessageThreads: NonNullable<QueryResolvers['businessMessageThreads']> = async (
    _parent: unknown,
    _args: unknown,
    context: any,
) => {
    const { userData, db } = context;
    if (!userData?.userId) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

    const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN';
    if (!isAdmin) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

    try {
        // Get all distinct business users this admin has messaged
        const rows = await db
            .selectDistinctOn([businessMessagesTable.businessUserId], {
                businessUserId: businessMessagesTable.businessUserId,
                firstName: users.firstName,
                lastName: users.lastName,
                lastMessageId: businessMessagesTable.id,
                lastBody: businessMessagesTable.body,
                lastAlertType: businessMessagesTable.alertType,
                lastSenderRole: businessMessagesTable.senderRole,
                lastReadAt: businessMessagesTable.readAt,
                lastCreatedAt: businessMessagesTable.createdAt,
            })
            .from(businessMessagesTable)
            .innerJoin(users, eq(businessMessagesTable.businessUserId, users.id))
            .where(eq(businessMessagesTable.adminId, userData.userId))
            .orderBy(businessMessagesTable.businessUserId, desc(businessMessagesTable.createdAt));

        // Count unread per business user (messages from business not yet read by admin)
        const threads = await Promise.all(
            rows.map(async (row: any) => {
                const [{ count }] = await db
                    .select({ count: sql<number>`count(*)::int` })
                    .from(businessMessagesTable)
                    .where(
                        and(
                            eq(businessMessagesTable.adminId, userData.userId),
                            eq(businessMessagesTable.businessUserId, row.businessUserId),
                            eq(businessMessagesTable.senderRole, 'BUSINESS'),
                            isNull(businessMessagesTable.readAt),
                        ),
                    );

                return {
                    businessUserId: row.businessUserId,
                    businessUserName: `${row.firstName} ${row.lastName}`,
                    unreadCount: Number(count ?? 0),
                    lastMessage: {
                        id: row.lastMessageId,
                        adminId: userData.userId,
                        businessUserId: row.businessUserId,
                        senderRole: row.lastSenderRole,
                        body: row.lastBody,
                        alertType: row.lastAlertType,
                        readAt: row.lastReadAt,
                        createdAt: row.lastCreatedAt,
                    },
                };
            }),
        );

        return threads;
    } catch (err) {
        logger.error({ err }, 'businessMessageThreads:query:failed');
        throw new GraphQLError('Failed to fetch message threads');
    }
};
