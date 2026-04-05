import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlingService } from '@/services/SettlingService';
import { GraphQLError } from 'graphql';
import { drivers as driversTable } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const settleWithDriver: NonNullable<MutationResolvers['settleWithDriver']> = async (
    _parent,
    { driverId, amount, paymentMethod, paymentReference, note },
    { db, userData }
) => {
    if (!userData?.userId) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    // The input driverId may be a user ID (from the admin panel's drivers query).
    // Look up the actual driver record ID.
    let resolvedDriverId = driverId;
    const driverRecord = await db.query.drivers.findFirst({
        where: eq(driversTable.userId, driverId),
    });
    if (driverRecord) {
        resolvedDriverId = driverRecord.id;
    }

    const service = new SettlingService(db);
    const result = await service.settleWithDriver(
        resolvedDriverId,
        userData.userId,
        amount ?? undefined,
        paymentMethod ?? undefined,
        paymentReference ?? undefined,
        note ?? undefined,
    );

    return {
        paymentId: result.paymentId,
        settledCount: result.settledCount,
        netAmount: result.netAmount,
        direction: result.direction,
        remainderAmount: result.remainderAmount,
        remainderSettlementId: result.remainderSettlementId,
    };
};
