import type { MutationResolvers } from './../../../../generated/types.generated';

export const cancelOrder: NonNullable<MutationResolvers['cancelOrder']> = async (
    _parent,
    { id },
    { orderService, userData },
) => {
    const order = await orderService.cancelOrder(id);
    await orderService.publishUserOrders(userData.userId!);
    return order;
};
