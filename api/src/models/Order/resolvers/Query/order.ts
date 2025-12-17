import type { QueryResolvers } from './../../../../generated/types.generated';

export const order: NonNullable<QueryResolvers['order']> = async (_parent, { id }, { orderService }) => {
    return await orderService.getOrderById(id);
};
