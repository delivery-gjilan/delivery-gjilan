import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRequestRepository } from '@/repositories/SettlementRequestRepository';
import { SettlingService } from '@/services/SettlingService';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';

export const respondToSettlementRequest: NonNullable<
    MutationResolvers['respondToSettlementRequest']
> = async (_parent, { requestId, action, disputeReason }, ctx) => {
    const { db, userData, notificationService } = ctx;

    if (!userData?.userId) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    const allowedRoles = ['BUSINESS_OWNER', 'BUSINESS_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'];
    if (!userData.role || !allowedRoles.includes(userData.role)) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
    }

    const repo = new SettlementRequestRepository(db);

    const existing = await repo.getById(requestId);
    if (!existing) {
        throw new GraphQLError('Settlement request not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    if (existing.status !== 'PENDING_APPROVAL') {
        throw new GraphQLError(
            `Cannot respond to a request with status ${existing.status}`,
            { extensions: { code: 'BAD_REQUEST' } },
        );
    }

    // Business users can only respond to their own requests
    if (
        (userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE') &&
        existing.businessId !== userData.businessId
    ) {
        throw new GraphQLError('Forbidden — this request belongs to a different business', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    if (action === 'ACCEPT') {
        const requestedAmount = Number(existing.amount ?? 0);

        // Use the SettlingService to settle ALL unsettled settlements for this
        // business, with the request amount as the payment.
        const settlingService = new SettlingService(db);
        const settleResult = await settlingService.settleWithBusiness(
            existing.businessId,
            requestedAmount,
            userData.userId,
            'SETTLEMENT_REQUEST_ACCEPTED',
            `request:${requestId}`,
        );

        logger.info(
            {
                requestId,
                businessId: existing.businessId,
                requestedAmount,
                settledCount: settleResult.settledCount,
                netAmount: settleResult.netAmount,
                remainderAmount: settleResult.remainderAmount,
                paymentId: settleResult.paymentId,
            },
            'settlementRequest:accept — settled via SettlingService',
        );

        const updated = await repo.accept(requestId, userData.userId);

        // Notify admins (via topic) that the request was accepted
        try {
            if (notificationService) {
                await notificationService.sendToTopic('admins', {
                    title: '✅ Settlement Accepted',
                    body: `Business accepted settlement of €${requestedAmount.toFixed(2)}. ${settleResult.settledCount} settlement(s) settled.${settleResult.remainderAmount > 0 ? ` Remainder: €${settleResult.remainderAmount.toFixed(2)}` : ''}`,
                    data: {
                        type: 'SETTLEMENT_REQUEST_ACCEPTED',
                        requestId,
                        screen: 'settlements',
                    },
                });
            }
        } catch (err) {
            logger.error({ err, requestId }, 'settlementRequest:accept — failed to notify admin (non-fatal)');
        }

        return updated;
    }

    // DISPUTE
    const updated = await repo.dispute(requestId, userData.userId, disputeReason);

    try {
        if (notificationService) {
            await notificationService.sendToTopic('admins', {
                title: '⚠️ Settlement Disputed',
                body: `Business disputed settlement of €${Number(existing.amount).toFixed(2)}. Reason: ${disputeReason ?? 'No reason provided'}`,
                data: {
                    type: 'SETTLEMENT_REQUEST_DISPUTED',
                    requestId,
                    screen: 'settlements',
                },
            });
        }
    } catch (err) {
        logger.error({ err, requestId }, 'settlementRequest:dispute — failed to notify admin (non-fatal)');
    }

    return updated;
};
