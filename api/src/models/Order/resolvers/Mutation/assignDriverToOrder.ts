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
    if (!role) {
        throw new Error('Unauthorized');
    }

    const isSuperAdmin = role === 'SUPER_ADMIN';
    const isDriver = role === 'DRIVER';

    if (!isSuperAdmin && !isDriver) {
        throw new Error('Not authorized to assign driver');
    }

    let effectiveDriverId = driverId;

    if (isDriver) {
        if (!userData?.userId) {
            throw new Error('Driver not authenticated');
        }

        // Drivers can only self-assign
        if (driverId && driverId !== userData.userId) {
            throw new Error('Drivers can only assign themselves');
        }

        const dbOrder = await orderService.orderRepository.findById(id);
        if (!dbOrder) {
            throw new Error('Order not found');
        }

        if (dbOrder.driverId && dbOrder.driverId !== userData.userId) {
            throw new Error('Order already assigned to another driver');
        }

        if (dbOrder.status !== 'READY' && dbOrder.status !== 'ACCEPTED') {
            throw new Error('Order is not available for driver assignment');
        }

        effectiveDriverId = userData.userId;
    }

    // If driverId is provided, validate that it's a driver
    let driverName = 'Unassigned';
    if (effectiveDriverId) {
        const driver = await authService.authRepository.findById(effectiveDriverId);
        if (!driver) {
            throw new Error('Driver not found');
        }
        if (driver.role !== 'DRIVER') {
            throw new Error('Specified user is not a driver');
        }
        driverName = `${driver.firstName} ${driver.lastName}`;
    }

    const order = await orderService.assignDriverToOrder(id, effectiveDriverId ?? null);

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
            driverId: effectiveDriverId || null,
            driverName,
        },
    });

    return order;
};