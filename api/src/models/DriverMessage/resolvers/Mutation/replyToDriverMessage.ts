import type   { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { driverMessages as driverMessagesTable } from '@/database/schema';
import { pubsub, publish, topics } from '@/lib/pubsub';

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

    try {
        const [msg] = await db
            .insert(driverMessagesTable)
            .values({
                adminId,
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
        publish(pubsub, topics.adminMessage(adminId, userData.userId), payload);
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
