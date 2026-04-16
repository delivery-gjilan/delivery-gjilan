import type   { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { driverMessages as driverMessagesTable, users as usersTable } from '@/database/schema';
import { pubsub, publish, topics } from '@/lib/pubsub';
import { and, asc, inArray, isNull } from 'drizzle-orm';

async function resolveFallbackAdminId(db: any): Promise<string | null> {
    const [admin] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(inArray(usersTable.role, ['SUPER_ADMIN', 'ADMIN']), isNull(usersTable.deletedAt)))
        .orderBy(asc(usersTable.createdAt))
        .limit(1);

    return admin?.id ?? null;
}

export const replyToDriverMessage: NonNullable<MutationResolvers['replyToDriverMessage']> = async (
    _parent: unknown,
    { adminId, body }: { adminId: string; body: string },
    context: any,
) => {
    const { userData, db } = context;
    if (!userData?.userId) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

    const isDriver = userData.role === 'DRIVER';
    if (!isDriver) throw new GraphQLError('Forbidden — only drivers can reply', { extensions: { code: 'FORBIDDEN' } });

    if (!body.trim()) throw new GraphQLError('Message body cannot be empty');

    const resolvedAdminId = adminId?.trim() || await resolveFallbackAdminId(db);
    if (!resolvedAdminId) {
        throw new GraphQLError('No admin available to receive this message', {
            extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
    }

    try {
        const [msg] = await db
            .insert(driverMessagesTable)
            .values({
                adminId: resolvedAdminId,
                driverId: userData.userId,
                senderRole: 'DRIVER',
                body: body.trim(),
                alertType: 'INFO',
            })
            .returning();

        const payload = {
            id: msg.id,
            adminId: msg.adminId,
            driverId: msg.driverId,
            senderRole: msg.senderRole as 'ADMIN' | 'DRIVER',
            body: msg.body,
            alertType: msg.alertType as 'INFO' | 'WARNING' | 'URGENT',
            readAt: msg.readAt ?? null,
            createdAt: msg.createdAt,
        };

        // Real-time: push to admin's subscription
        publish(pubsub, topics.adminMessage(resolvedAdminId, userData.userId), payload);
        // Real-time: also push back to driver's own subscription (optimistic consistency)
        publish(pubsub, topics.driverMessage(userData.userId), payload);
        // Real-time: broadcast to all admins for global notifications
        publish(pubsub, topics.adminAnyMessage(), payload);

        return msg;
    } catch (err) {
        logger.error({ err }, 'replyToDriverMessage:failed');
        throw new GraphQLError('Failed to send reply');
    }
};
