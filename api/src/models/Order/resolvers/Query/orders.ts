import type { QueryResolvers } from './../../../../generated/types.generated';

export const orders: NonNullable<QueryResolvers['orders']> = async (_parent, _args, { orderService }) => {
    return orderService.getAllOrders();
};
