import type { MutationResolvers } from './../../../../generated/types.generated';

export const updateOrderStatus: NonNullable<MutationResolvers['updateOrderStatus']> = async (
    _parent,
    { id, status },
    { orderService, userData },
) => {
    console.log('Updating order status:', id, status);

    const role = userData?.role;
    if (!role) {
        throw new Error('Unauthorized');
    }

    const currentOrder = await orderService.getOrderById(id);
    if (!currentOrder) {
        throw new Error('Order not found');
    }

    const dbOrder = await orderService.orderRepository.findById(id);
    if (!dbOrder) {
        throw new Error('Order not found');
    }

    const currentStatus = currentOrder.status;

    const isSuperAdmin = role === 'SUPER_ADMIN';
    const isDriver = role === 'DRIVER';
    const isBusinessAdmin = role === 'BUSINESS_ADMIN';

    let order;

    if (isBusinessAdmin) {
        if (!userData.businessId) {
            throw new Error('Business admin has no business assigned');
        }

        const canAccess = await orderService.orderContainsBusiness(id, userData.businessId);
        if (!canAccess) {
            throw new Error('Not authorized to update this order');
        }

        const allowed: Record<string, string[]> = {
            PENDING: ['ACCEPTED'],
            ACCEPTED: ['READY'],
        };

        if (!allowed[currentStatus]?.includes(status)) {
            throw new Error('Invalid status transition for business admin');
        }
        order = await orderService.updateOrderStatus(id, status);
    } else if (isDriver) {
        const allowed: Record<string, string[]> = {
            READY: ['OUT_FOR_DELIVERY'],
            OUT_FOR_DELIVERY: ['DELIVERED'],
        };

        if (!allowed[currentStatus]?.includes(status)) {
            throw new Error('Invalid status transition for driver');
        }

        if (!userData.userId) {
            throw new Error('Driver not authenticated');
        }

        if (dbOrder.driverId && dbOrder.driverId !== userData.userId) {
            throw new Error('Order already assigned to another driver');
        }

        if (status === 'OUT_FOR_DELIVERY') {
            order = await orderService.updateOrderStatusWithDriver(id, status, userData.userId);
        } else {
            order = await orderService.updateOrderStatus(id, status);
        }
    } else if (!isSuperAdmin) {
        throw new Error('Not authorized to update order status');
    } else {
        order = await orderService.updateOrderStatus(id, status);
    }

    console.log(`[Server] Publishing to channel: orderStatusUpdated:${id}`);
    console.log('publishing to haha:', userData);
    
    // Find the order to get the user ID
    await orderService.publishUserOrders(dbOrder.userId);
    
    // Publish to all admins for real-time updates
    await orderService.publishAllOrders();
    
    return order;
};
