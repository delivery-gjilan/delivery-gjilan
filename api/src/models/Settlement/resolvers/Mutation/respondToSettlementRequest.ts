import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRequestRepository } from '@/repositories/SettlementRequestRepository';
import { SettlingService } from '@/services/SettlingService';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { drivers as driversTable } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const respondToSettlementRequest: NonNullable<
    MutationResolvers['respondToSettlementRequest']
> = async (_parent, { requestId, action, reason }, ctx): Promise<any> => {
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

    if (existing.status !== 'PENDING') {
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
        let paymentId: string;

        if (entityType === 'BUSINESS' && existing.businessId) {
            const settleResult = await settlingService.settleWithBusiness(
                existing.businessId,
                requestedAmount,
                userData.userId,
            );
            paymentId = settleResult.paymentId;

            logger.info(
                {
                    requestId,
                    businessId: existing.businessId,
                    requestedAmount,
                    settledCount: settleResult.settledCount,
                    netAmount: settleResult.netAmount,
                    remainderAmount: settleResult.remainderAmount,
                    paymentId,
                },
                'settlementRequest:accept — settled business via SettlingService',
            );
        } else if (entityType === 'DRIVER' && existing.driverId) {
            const settleResult = await settlingService.settleWithDriver(
                existing.driverId,
                userData.userId,
                requestedAmount,
            );
            paymentId = settleResult.paymentId;

            logger.info(
                {
                    requestId,
                    driverId: existing.driverId,
                    requestedAmount,
                    settledCount: settleResult.settledCount,
                    netAmount: settleResult.netAmount,
                    remainderAmount: settleResult.remainderAmount,
                    paymentId,
                },
                'settlementRequest:accept — settled driver via SettlingService',
            );
        } else {
            throw new GraphQLError('Invalid settlement request: missing entity ID', {
                extensions: { code: 'BAD_REQUEST' },
            });
        }

        const updated = await repo.accept(requestId, userData.userId, paymentId);

        // Notify admins
        try {
            if (notificationService) {
                const entityLabel = entityType === 'BUSINESS' ? 'Business' : 'Driver';
                await notificationService.sendToTopic('admins', {
                    title: 'Settlement Accepted',
                    body: `${entityLabel} accepted settlement of €${requestedAmount.toFixed(2)}.`,
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

    // REJECT
    const updated = await repo.reject(requestId, userData.userId, reason);

    try {
        if (notificationService) {
            const entityLabel = entityType === 'BUSINESS' ? 'Business' : 'Driver';
            await notificationService.sendToTopic('admins', {
                title: 'Settlement Rejected',
                body: `${entityLabel} rejected settlement of €${Number(existing.amount).toFixed(2)}. Reason: ${reason ?? 'No reason provided'}`,
                data: {
                    type: 'SETTLEMENT_REQUEST_REJECTED',
                    requestId,
                    screen: 'settlements',
                },
            });
        }
    } catch (err) {
        logger.error({ err, requestId }, 'settlementRequest:reject — failed to notify admin (non-fatal)');
    }

    return updated;
};
