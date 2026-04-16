import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { businessMessages as businessMessagesTable, users as usersTable } from '@/database/schema';
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

    const resolvedAdminId = adminId?.trim() || await resolveFallbackAdminId(db);
    if (!resolvedAdminId) {
        throw new GraphQLError('No admin available to receive this message', {
            extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
    }

    try {
        const [msg] = await db
            .insert(businessMessagesTable)
            .values({
                adminId: resolvedAdminId,
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
        publish(pubsub, topics.adminBusinessMessage(resolvedAdminId, userData.userId), payload);
        // Real-time: also push back to business user's own subscription (optimistic consistency)
        publish(pubsub, topics.businessMessage(userData.userId), payload);
        // Real-time: broadcast to all admins for global notifications
        publish(pubsub, topics.adminAnyBusinessMessage(), payload);

        return msg;
    } catch (err) {
        logger.error({ err }, 'replyToBusinessMessage:failed');
        throw new GraphQLError('Failed to send reply');
    }
};
