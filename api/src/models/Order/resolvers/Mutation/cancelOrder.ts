import type { MutationResolvers } from './../../../../generated/types.generated';

export const cancelOrder: NonNullable<MutationResolvers['cancelOrder']> = async (_parent, { id }, { orderService }) => {
    return await orderService.cancelOrder(id);
};
