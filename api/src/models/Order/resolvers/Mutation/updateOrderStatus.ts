import type { MutationResolvers } from './../../../../generated/types.generated';

export const updateOrderStatus: NonNullable<MutationResolvers['updateOrderStatus']> = async (
    _parent,
    { id, status },
    { orderService, userData },
) => {
    console.log('Updating order status:', id, status);
    const order = await orderService.updateOrderStatus(id, status);
    console.log(`[Server] Publishing to channel: orderStatusUpdated:${id}`);
    console.log('publishing to haha:', userData);
    await orderService.publishUserOrders(userData.userId!);
    return order;
};
