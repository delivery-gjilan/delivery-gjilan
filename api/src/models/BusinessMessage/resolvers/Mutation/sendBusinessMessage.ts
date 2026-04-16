import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { businessMessages as businessMessagesTable } from '@/database/schema';
import { pubsub, publish, topics } from '@/lib/pubsub';
import { notifyBusinessUserNewAdminMessage } from '@/services/orderNotifications';

export const sendBusinessMessage: NonNullable<MutationResolvers['sendBusinessMessage']> = async (
    _parent: unknown,
    { businessUserId, body, alertType }: { businessUserId: string; body: string; alertType: 'INFO' | 'WARNING' | 'URGENT' },
    context: any,
) => {
    const { userData, db, notificationService } = context;
    if (!userData?.userId) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

    const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN';
    if (!isAdmin) throw new GraphQLError('Forbidden — only admins can send messages to business users', { extensions: { code: 'FORBIDDEN' } });

    if (!body.trim()) throw new GraphQLError('Message body cannot be empty');

    try {
        const [msg] = await db
            .insert(businessMessagesTable)
            .values({
                adminId: userData.userId,
                businessUserId,
                senderRole: 'ADMIN',
                body: body.trim(),
                alertType,
            })
            .returning();

        const payload = {
            id: msg.id,
            adminId: msg.adminId,
            businessUserId: msg.businessUserId,
            senderRole: msg.senderRole as 'ADMIN' | 'BUSINESS',
            body: msg.body,
            alertType: msg.alertType as 'INFO' | 'WARNING' | 'URGENT',
            readAt: msg.readAt ?? null,
            createdAt: msg.createdAt,
        };

        // Real-time: push to business user's subscription
        publish(pubsub, topics.businessMessage(businessUserId), payload);
        // Real-time: push to admin's own subscription (keeps admin chat in sync across tabs)
        publish(pubsub, topics.adminBusinessMessage(userData.userId, businessUserId), payload);
        // Real-time: broadcast to all admins for global notifications
        publish(pubsub, topics.adminAnyBusinessMessage(), payload);

        // Push notification to business user
        notifyBusinessUserNewAdminMessage(notificationService, businessUserId, body, alertType);

        return msg;
    } catch (err) {
        logger.error({ err }, 'sendBusinessMessage:failed');
        throw new GraphQLError('Failed to send message');
    }
};
