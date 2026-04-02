import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';

export const createOrder: NonNullable<MutationResolvers['createOrder']> = async (
    _parent,
    { input },
    context,
) => {
    const { userData, orderService } = context;
    if (!userData.userId) {
        throw AppError.unauthorized();
    }
    return await orderService.createOrderWithSideEffects(userData.userId, input, context);
};
