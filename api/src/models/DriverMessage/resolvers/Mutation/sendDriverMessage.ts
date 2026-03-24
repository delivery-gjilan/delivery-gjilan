import type   { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { driverMessages as driverMessagesTable } from '@/database/schema';
import { pubsub, publish, topics } from '@/lib/pubsub';
import { notifyDriverNewAdminMessage } from '@/services/orderNotifications';
import { sql } from 'drizzle-orm';

export const sendDriverMessage: NonNullable<MutationResolvers['sendDriverMessage']> = async (
    _parent: unknown,
    { driverId, body, alertType }: { driverId: string; body: string; alertType: 'INFO' | 'WARNING' | 'URGENT' },
    context: any,
) => {
    const { userData, db, notificationService } = context;
    if (!userData?.userId) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

    const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN';
    if (!isAdmin) throw new GraphQLError('Forbidden — only admins can send messages to drivers', { extensions: { code: 'FORBIDDEN' } });

    if (!body.trim()) throw new GraphQLError('Message body cannot be empty');

    try {
        const [msg] = await db
            .insert(driverMessagesTable)
            .values({
                adminId: userData.userId,
                driverId,
                senderRole: 'ADMIN',
                body: body.trim(),
                alertType,
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

        // Real-time: push to driver's subscription
        publish(pubsub, topics.driverMessage(driverId), payload);
        // Real-time: push to admin's own subscription (keeps admin chat in sync across tabs)
        publish(pubsub, topics.adminMessage(userData.userId, driverId), payload);

        // Push notification to driver
        notifyDriverNewAdminMessage(notificationService, driverId, body, alertType);

        return msg;
    } catch (err) {
        logger.error({ err }, 'sendDriverMessage:failed');
        throw new GraphQLError('Failed to send message');
    }
};
