import type { MutationResolvers } from './../../../../generated/types.generated';
export const createOrder: NonNullable<MutationResolvers['createOrder']> = async (
    _parent,
    { input },
    { userData, orderService },
) => {
    if (!userData.userId) {
        throw new Error('Unauthorized');
    }
    return await orderService.createOrder(userData.userId, input);
};
