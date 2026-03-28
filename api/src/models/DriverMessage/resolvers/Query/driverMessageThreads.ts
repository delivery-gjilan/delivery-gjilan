import type   { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { driverMessages as driverMessagesTable, users } from '@/database/schema';
import { eq, and, isNull, ne, sql, desc } from 'drizzle-orm';

export const driverMessageThreads: NonNullable<QueryResolvers['driverMessageThreads']> = async (
    _parent: unknown,
    _args: unknown,
    context: any,
) => {
    const { userData, db } = context;
    if (!userData?.userId) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

    const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN';
    if (!isAdmin) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

    try {
        // Get all distinct drivers this admin has messaged
        const rows = await db
            .selectDistinctOn([driverMessagesTable.driverId], {
                driverId: driverMessagesTable.driverId,
                firstName: users.firstName,
                lastName: users.lastName,
                lastMessageId: driverMessagesTable.id,
                lastBody: driverMessagesTable.body,
                lastAlertType: driverMessagesTable.alertType,
                lastSenderRole: driverMessagesTable.senderRole,
                lastReadAt: driverMessagesTable.readAt,
                lastCreatedAt: driverMessagesTable.createdAt,
            })
            .from(driverMessagesTable)
            .innerJoin(users, eq(driverMessagesTable.driverId, users.id))
            .where(eq(driverMessagesTable.adminId, userData.userId))
            .orderBy(driverMessagesTable.driverId, desc(driverMessagesTable.createdAt));

        // Count unread per driver (messages from driver not yet read by admin)
        const threads = await Promise.all(
            rows.map(async (row: any) => {
                const [{ count }] = await db
                    .select({ count: sql<number>`count(*)::int` })
                    .from(driverMessagesTable)
                    .where(
                        and(
                            eq(driverMessagesTable.adminId, userData.userId),
                            eq(driverMessagesTable.driverId, row.driverId),
                            eq(driverMessagesTable.senderRole, 'DRIVER'),
                            isNull(driverMessagesTable.readAt),
                        ),
                    );

                return {
                    driverId: row.driverId,
                    driverName: `${row.firstName} ${row.lastName}`,
                    unreadCount: Number(count ?? 0),
                    lastMessage: {
                        id: row.lastMessageId,
                        adminId: userData.userId,
                        driverId: row.driverId,
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
        logger.error({ err }, 'driverMessageThreads:query:failed');
        throw new GraphQLError('Failed to fetch message threads');
    }
};
