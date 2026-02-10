import type { MutationResolvers } from './../../../../generated/types.generated';

export const assignDriverToOrder: NonNullable<MutationResolvers['assignDriverToOrder']> = async (
    _parent,
    { id, driverId },
    { orderService, authService, userData },
) => {
    console.log('Assigning driver to order:', id, driverId);

    const role = userData?.role;
    if (!role || role !== 'SUPER_ADMIN') {
        throw new Error('Only super admins can assign drivers to orders');
    }

    // If driverId is provided, validate that it's a driver
    if (driverId) {
        const driver = await authService.authRepository.findById(driverId);
        if (!driver) {
            throw new Error('Driver not found');
        }
        if (driver.role !== 'DRIVER') {
            throw new Error('Specified user is not a driver');
        }
    }

    const order = await orderService.assignDriverToOrder(id, driverId);

    // Get the order to find the user ID for publishing
    const dbOrder = await orderService.orderRepository.findById(id);
    if (dbOrder) {
        // Publish to user's channel for real-time updates
        await orderService.publishUserOrders(dbOrder.userId);
        
        // Publish to all admins for real-time updates
        await orderService.publishAllOrders();
    }

    return order;
};