import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementRequestRepository } from '@/repositories/SettlementRequestRepository';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';
import { drivers as driversTable } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const createSettlementRequest: NonNullable<
    MutationResolvers['createSettlementRequest']
> = async (_parent, { businessId, driverId, amount, note }, ctx): Promise<any> => {
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

    // Must provide exactly one of businessId or driverId
    if (!businessId && !driverId) {
        throw new GraphQLError('Provide either businessId or driverId', {
            extensions: { code: 'BAD_REQUEST' },
        });
    }
    if (businessId && driverId) {
        throw new GraphQLError('Provide only one of businessId or driverId, not both', {
            extensions: { code: 'BAD_REQUEST' },
        });
    }

    const entityType = driverId ? 'DRIVER' : 'BUSINESS';

    // For drivers, the input driverId may be a user ID. Resolve to driver record ID.
    let resolvedDriverId = driverId ?? null;
    if (driverId) {
        const driverRecord = await db.query.drivers.findFirst({
            where: eq(driversTable.userId, driverId),
        });
        if (driverRecord) {
            resolvedDriverId = driverRecord.id;
        }
    }

    // Check that there is no existing PENDING request for this entity
    const repo = new SettlementRequestRepository(db);
    const existing = await repo.getMany({
        businessId: businessId ?? undefined,
        driverId: resolvedDriverId ?? undefined,
        status: 'PENDING',
        limit: 1,
    });
    if (existing.length > 0) {
        throw new GraphQLError('There is already a pending settlement request for this entity', {
            extensions: { code: 'BAD_REQUEST' },
        });
    }

    const request = await repo.create({
        entityType,
        businessId: businessId ?? null,
        driverId: resolvedDriverId,
        amount,
        note,
    });

    // Push notification
    try {
        if (notificationService) {
            if (entityType === 'BUSINESS' && businessId) {
                const ownerUserIds = await repo.findBusinessOwnerUserIds(businessId);
                if (ownerUserIds.length > 0) {
                    await notificationService.sendToUsersByAppType(
                        ownerUserIds,
                        'BUSINESS',
                        {
                            title: 'Settlement Request',
                            body: `Admin is requesting a settlement of €${Number(amount).toFixed(2)}. Tap to review.`,
                            data: {
                                type: 'SETTLEMENT_REQUEST',
                                requestId: request.id,
                                amount: String(amount),
                                screen: 'finances',
                            },
                            timeSensitive: true,
                        },
                        'ADMIN_ALERT',
                    );
                }
            } else if (entityType === 'DRIVER' && resolvedDriverId) {
                const driverUserId = await repo.findDriverUserId(resolvedDriverId);
                if (driverUserId) {
                    await notificationService.sendToUsersByAppType(
                        [driverUserId],
                        'DRIVER',
                        {
                            title: 'Settlement Request',
                            body: `Admin is requesting a settlement of €${Number(amount).toFixed(2)}. Tap to review.`,
                            data: {
                                type: 'SETTLEMENT_REQUEST',
                                requestId: request.id,
                                amount: String(amount),
                                screen: 'earnings',
                            },
                            timeSensitive: true,
                        },
                        'ADMIN_ALERT',
                    );
                }
            }
        }
    } catch (err) {
        logger.error(
            { err, requestId: request.id },
            'settlementRequest:create — failed to send push notifications (non-fatal)',
        );
    }

    return request;
};
