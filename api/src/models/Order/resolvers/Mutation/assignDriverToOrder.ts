import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';

export const assignDriverToOrder: NonNullable<MutationResolvers['assignDriverToOrder']> = async (
    _parent,
    { id, driverId },
    context,
) => {
    const { orderService, authService, userData, db } = context;
    console.log('Assigning driver to order:', id, driverId);

    const role = userData?.role;
    if (!role || role !== 'SUPER_ADMIN') {
        throw new Error('Only super admins can assign drivers to orders');
    }

    // If driverId is provided, validate that it's a driver
    let driverName = 'Unassigned';
    if (driverId) {
        const driver = await authService.authRepository.findById(driverId);
        if (!driver) {
            throw new Error('Driver not found');
        }
        if (driver.role !== 'DRIVER') {
            throw new Error('Specified user is not a driver');
        }
        driverName = `${driver.firstName} ${driver.lastName}`;
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
    
    // Log the action
    const logger = createAuditLogger(db, context);
    await logger.log({
        action: 'ORDER_ASSIGNED',
        entityType: 'ORDER',
        entityId: id,
        metadata: {
            orderId: id,
            driverId: driverId || null,
            driverName,
        },
    });

    return order;
};