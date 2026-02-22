import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';
import logger from '@/lib/logger';
import { drivers as driversTable } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { notifyDriverOrderAssigned } from '@/services/orderNotifications';

export const assignDriverToOrder: NonNullable<MutationResolvers['assignDriverToOrder']> = async (
    _parent,
    { id, driverId },
    context,
) => {
    const { orderService, authService, userData, db } = context;
    logger.info({ orderId: id, driverId }, 'order:assignDriverToOrder');

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

    // Race condition check: Fetch order early
    const dbOrderBefore = await orderService.orderRepository.findById(id);
    if (!dbOrderBefore) {
        throw new Error('Order not found');
    }

    if (isDriver) {
        if (!userData?.userId) {
            throw new Error('Driver not authenticated');
        }

        // Drivers can only self-assign
        if (driverId && driverId !== userData.userId) {
            throw new Error('Drivers can only assign themselves');
        }

        // Race condition check: Verify order isn't already assigned to someone else
        if (dbOrderBefore.driverId && dbOrderBefore.driverId !== userData.userId) {
            throw new Error('This order has already been taken by another driver');
        }

        if (dbOrderBefore.status !== 'READY' && dbOrderBefore.status !== 'PREPARING') {
            throw new Error('Order is not available for driver assignment');
        }

        effectiveDriverId = userData.userId;
    }

    // If driverId is provided, validate that it's a driver
    let driverName = 'Unassigned';
    let maxActiveOrders = 2; // Default fallback
    
    if (effectiveDriverId) {
        const driver = await authService.authRepository.findById(effectiveDriverId);
        if (!driver) {
            throw new Error('Driver not found');
        }
        if (driver.role !== 'DRIVER') {
            throw new Error('Specified user is not a driver');
        }
        driverName = `${driver.firstName} ${driver.lastName}`;

        // Fetch driver's maxActiveOrders from drivers table
        const driverRecord = await db.query.drivers.findFirst({
            where: eq(driversTable.userId, effectiveDriverId),
        });

        if (driverRecord?.maxActiveOrders) {
            maxActiveOrders = Number(driverRecord.maxActiveOrders);
        }
    }

    // Server-side guard: prevent assigning a driver more than their maxActiveOrders
    if (effectiveDriverId) {
        const existingOrders = await orderService.orderRepository.findUncompletedOrdersByUserId(effectiveDriverId);
        // If the order already has this driver assigned, allow it (re-assignment)
        const alreadyAssignedToSameDriver = dbOrderBefore.driverId === effectiveDriverId;
        
        if (!alreadyAssignedToSameDriver && existingOrders.length >= maxActiveOrders) {
            throw new Error(`Driver already has maximum number of active orders (${maxActiveOrders}/${maxActiveOrders})`);
        }
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

    // Push notification to driver (fire-and-forget)
    if (effectiveDriverId) {
        notifyDriverOrderAssigned(
            context.notificationService,
            effectiveDriverId,
            id,
            dbOrder?.dropoffAddress || undefined,
        );
    }
    
    // Log the action
    const auditLog = createAuditLogger(db, context);
    await auditLog.log({
        action: 'ORDER_ASSIGNED',
        entityType: 'ORDER',
        entityId: id,
        metadata: {
            orderId: id,
            driverId: effectiveDriverId || null,
            driverName,
            maxActiveOrders,
        },
    });

    return order;
};