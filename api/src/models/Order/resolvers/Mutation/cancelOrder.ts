import type { MutationResolvers } from './../../../../generated/types.generated';

export const cancelOrder: NonNullable<MutationResolvers['cancelOrder']> = async (
    _parent,
    { id },
    { orderService, userData },
) => {
    const order = await orderService.cancelOrder(id);
    
    // Find the order to get the user ID
    const dbOrder = await orderService.orderRepository.findById(id);
    if (dbOrder) {
        await orderService.publishUserOrders(dbOrder.userId);
    }
    
    // Publish to all admins for real-time updates
    await orderService.publishAllOrders();
    
    return order;
};
