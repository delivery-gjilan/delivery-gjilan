import type { QueryResolvers } from './../../../../generated/types.generated';

export const ordersByStatus: NonNullable<QueryResolvers['ordersByStatus']> = async (
    _parent,
    { status },
    { orderService },
) => {
    return orderService.getOrdersByStatus(status);
};
