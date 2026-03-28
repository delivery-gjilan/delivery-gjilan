import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { businessMessages as businessMessagesTable } from '@/database/schema';
import { pubsub, publish, topics } from '@/lib/pubsub';

export const replyToBusinessMessage: NonNullable<MutationResolvers['replyToBusinessMessage']> = async (
    _parent: unknown,
    { adminId, body }: { adminId: string; body: string },
    context: any,
) => {
    const { userData, db } = context;
    if (!userData?.userId) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });

    const isBusinessUser =
        userData.role === 'BUSINESS_OWNER' ||
        userData.role === 'BUSINESS_EMPLOYEE';
    if (!isBusinessUser) throw new GraphQLError('Forbidden — only business users can reply', { extensions: { code: 'FORBIDDEN' } });

    if (!body.trim()) throw new GraphQLError('Message body cannot be empty');

    try {
        const [msg] = await db
            .insert(businessMessagesTable)
            .values({
                adminId,
                businessUserId: userData.userId,
                senderRole: 'BUSINESS',
                body: body.trim(),
                alertType: 'INFO',
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

        // Real-time: push to admin's subscription
        publish(pubsub, topics.adminBusinessMessage(adminId, userData.userId), payload);
        // Real-time: also push back to business user's own subscription (optimistic consistency)
        publish(pubsub, topics.businessMessage(userData.userId), payload);

        return msg;
    } catch (err) {
        logger.error({ err }, 'replyToBusinessMessage:failed');
        throw new GraphQLError('Failed to send reply');
    }
};
