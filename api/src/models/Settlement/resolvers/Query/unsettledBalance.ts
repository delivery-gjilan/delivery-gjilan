import type { QueryResolvers } from './../../../../generated/types.generated';
import { SettlementRepository } from '@/repositories/SettlementRepository';
import { drivers as driversTable } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const unsettledBalance: NonNullable<QueryResolvers['unsettledBalance']> = async (
    _parent,
    { entityType, entityId },
    { db }
) => {
    let resolvedId = entityId;

    // The input entityId may be a user ID for drivers (from admin panel).
    // Look up the actual driver record ID.
    if (entityType === 'DRIVER') {
        const driverRecord = await db.query.drivers.findFirst({
            where: eq(driversTable.userId, entityId),
        });
        if (driverRecord) {
            resolvedId = driverRecord.id;
        }
    }

    const repo = new SettlementRepository(db);
    return repo.getUnsettledBalance(entityType as 'DRIVER' | 'BUSINESS', resolvedId);
};
