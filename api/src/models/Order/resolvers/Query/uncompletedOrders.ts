import type { QueryResolvers } from './../../../../generated/types.generated';
export const uncompletedOrders: NonNullable<QueryResolvers['uncompletedOrders']> = async (
    _parent,
    _arg,
    { orderService, userData },
) => {
    return orderService.getUserUncompletedOrders(userData.userId!);
};
