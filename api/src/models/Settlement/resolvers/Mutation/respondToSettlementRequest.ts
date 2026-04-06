import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRequestRepository } from '@/repositories/SettlementRequestRepository';
import { SettlingService } from '@/services/SettlingService';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { drivers as driversTable } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const respondToSettlementRequest: NonNullable<
    MutationResolvers['respondToSettlementRequest']
> = async (_parent, { requestId, action, disputeReason }, ctx): Promise<any> => {
    const { db, userData, notificationService } = ctx;

    if (!userData?.userId) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    const allowedRoles = ['BUSINESS_OWNER', 'BUSINESS_EMPLOYEE', 'DRIVER', 'ADMIN', 'SUPER_ADMIN'];
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

    // Authorization: scope check based on entity type
    const entityType = existing.entityType ?? 'BUSINESS';

    if (entityType === 'BUSINESS') {
        if (
            (userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE') &&
            existing.businessId !== userData.businessId
        ) {
            throw new GraphQLError('Forbidden — this request belongs to a different business', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    } else if (entityType === 'DRIVER') {
        if (userData.role === 'DRIVER') {
            // Verify this driver owns the request
            const driverRecord = await db.query.drivers.findFirst({
                where: eq(driversTable.userId, userData.userId),
            });
            if (!driverRecord || driverRecord.id !== existing.driverId) {
                throw new GraphQLError('Forbidden — this request belongs to a different driver', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
        }
    }

    if (action === 'ACCEPT') {
        const requestedAmount = Number(existing.amount ?? 0);
        const settlingService = new SettlingService(db);

        if (entityType === 'BUSINESS' && existing.businessId) {
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
                'settlementRequest:accept — settled business via SettlingService',
            );
        } else if (entityType === 'DRIVER' && existing.driverId) {
            const settleResult = await settlingService.settleWithDriver(
                existing.driverId,
                userData.userId,
                requestedAmount,
                'SETTLEMENT_REQUEST_ACCEPTED',
                `request:${requestId}`,
            );

            logger.info(
                {
                    requestId,
                    driverId: existing.driverId,
                    requestedAmount,
                    settledCount: settleResult.settledCount,
                    netAmount: settleResult.netAmount,
                    remainderAmount: settleResult.remainderAmount,
                    paymentId: settleResult.paymentId,
                },
                'settlementRequest:accept — settled driver via SettlingService',
            );
        }

        const updated = await repo.accept(requestId, userData.userId);

        // Notify admins
        try {
            if (notificationService) {
                const entityLabel = entityType === 'BUSINESS' ? 'Business' : 'Driver';
                await notificationService.sendToTopic('admins', {
                    title: 'Settlement Accepted',
                    body: `${entityLabel} accepted settlement of EUR ${requestedAmount.toFixed(2)}.`,
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
            const entityLabel = entityType === 'BUSINESS' ? 'Business' : 'Driver';
            await notificationService.sendToTopic('admins', {
                title: 'Settlement Disputed',
                body: `${entityLabel} disputed settlement of EUR ${Number(existing.amount).toFixed(2)}. Reason: ${disputeReason ?? 'No reason provided'}`,
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
