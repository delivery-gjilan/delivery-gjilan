import type { QueryResolvers } from './../../../../generated/types.generated';
import { SettlementRequestRepository } from '@/repositories/SettlementRequestRepository';
import { GraphQLError } from 'graphql';
import { drivers as driversTable } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const settlementRequests: NonNullable<QueryResolvers['settlementRequests']> = async (
    _parent,
    { businessId, driverId, entityType, status, limit, offset },
    { db, userData },
) => {
    if (!userData?.role) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    const repo = new SettlementRequestRepository(db);

    // Business users are scoped to their own businessId automatically
    let resolvedBusinessId =
        userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE'
            ? (userData.businessId ?? businessId ?? undefined)
            : (businessId ?? undefined);

    // Driver users are scoped to their own driverId
    let resolvedDriverId = driverId ?? undefined;
    if (userData.role === 'DRIVER' && userData.userId) {
        const driverRecord = await db.query.drivers.findFirst({
            where: eq(driversTable.userId, userData.userId),
        });
        if (driverRecord) {
            resolvedDriverId = driverRecord.id;
        }
    }

    return repo.getMany({
        businessId: resolvedBusinessId,
        driverId: resolvedDriverId,
        entityType: entityType ?? undefined,
        status: status ?? undefined,
        limit: limit ?? 50,
        offset: offset ?? 0,
    });
};
