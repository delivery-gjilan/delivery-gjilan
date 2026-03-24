import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlingService } from '@/services/SettlingService';
import { GraphQLError } from 'graphql';

export const settleWithDriver: NonNullable<MutationResolvers['settleWithDriver']> = async (
    _parent,
    { driverId },
    { db, userData }
) => {
    if (!userData?.userId) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    const service = new SettlingService(db);
    const result = await service.settleWithDriver(driverId, userData.userId);

    return {
        paymentId: result.paymentId,
        settledCount: result.settledCount,
        netAmount: result.netAmount,
        direction: result.direction,
        remainderAmount: result.remainderAmount,
        remainderSettlementId: result.remainderSettlementId,
    };
};
