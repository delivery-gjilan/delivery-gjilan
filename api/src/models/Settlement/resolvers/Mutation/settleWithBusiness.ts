import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlingService } from '@/services/SettlingService';
import { GraphQLError } from 'graphql';

export const settleWithBusiness: NonNullable<MutationResolvers['settleWithBusiness']> = async (
    _parent,
    { businessId, amount, paymentMethod, paymentReference, note },
    { db, userData }
): Promise<any> => {
    if (!userData?.userId || !['ADMIN', 'SUPER_ADMIN'].includes(userData.role!)) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    const service = new SettlingService(db);
    const result = await service.settleWithBusiness(
        businessId,
        amount,
        userData.userId,
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
