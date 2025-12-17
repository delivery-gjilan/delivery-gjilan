import type { MutationResolvers } from './../../../../generated/types.generated';

export const updateOrderStatus: NonNullable<MutationResolvers['updateOrderStatus']> = async (
    _parent,
    { id, status },
    { orderService, pubsub },
) => {
    console.log('Updating order status:', id, status);
    const order = await orderService.updateOrderStatus(id, status);
    console.log(`[Server] Publishing to channel: orderStatusUpdated:${id}`);
    pubsub.publish(`orderStatusUpdated:${id}`, order);
    return order;
};
