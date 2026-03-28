import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRequestRepository } from '@/repositories/SettlementRequestRepository';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';

export const createSettlementRequest: NonNullable<
    MutationResolvers['createSettlementRequest']
> = async (_parent, { businessId, amount, periodStart, periodEnd, note }, ctx) => {
    const { db, userData, notificationService } = ctx;

    if (!userData?.role) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    const adminRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (!adminRoles.includes(userData.role)) {
        throw new GraphQLError('Forbidden — only admins can create settlement requests', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const repo = new SettlementRequestRepository(db);

    const request = await repo.create({
        businessId,
        requestedByUserId: userData.userId ?? null,
        amount,
        periodStart,
        periodEnd,
        note,
    });

    // Push notification to all business owners of this business
    try {
        const ownerUserIds = await repo.findBusinessOwnerUserIds(businessId);
        if (ownerUserIds.length > 0 && notificationService) {
            await notificationService.sendToUsersByAppType(
                ownerUserIds,
                'BUSINESS',
                {
                    title: '💳 Settlement Request',
                    body: `Admin is requesting a settlement of €${Number(amount).toFixed(2)}. Tap to review and approve.`,
                    data: {
                        type: 'SETTLEMENT_REQUEST',
                        requestId: request.id,
                        amount: String(amount),
                        periodStart,
                        periodEnd,
                        screen: 'finances',
                    },
                    timeSensitive: true,
                },
                'ADMIN_ALERT',
            );
        }
    } catch (err) {
        logger.error(
            { err, requestId: request.id },
            'settlementRequest:create — failed to send push notifications (non-fatal)',
        );
    }

    return request;
};
