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
    
    // Find the order to get the user ID
    const dbOrder = await orderService.orderRepository.findById(id);
    if (dbOrder) {
        await orderService.publishUserOrders(dbOrder.userId);
    }
    
    // Publish to all admins for real-time updates
    await orderService.publishAllOrders();
    
    return order;
};
