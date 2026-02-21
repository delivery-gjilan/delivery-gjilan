import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { orderItems as orderItemsTable } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { FinancialService } from '@/services/FinancialService';
import { createAuditLogger } from '@/services/AuditLogger';
import logger from '@/lib/logger';

export const updateOrderStatus: NonNullable<MutationResolvers['updateOrderStatus']> = async (
    _parent,
    { id, status },
    context,
) => {
    const { orderService, userData, db } = context;
    logger.info({ orderId: id, status }, 'order:updateOrderStatus');

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
            ACCEPTED: ['OUT_FOR_DELIVERY'],
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

    if (status === 'DELIVERED' && currentStatus !== 'DELIVERED') {
        const db = await getDB();
        const refreshed = await orderService.orderRepository.findById(id);
        if (refreshed) {
            const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
            const financialService = new FinancialService(db);
            await financialService.createOrderSettlements(refreshed, items, refreshed.driverId);
        }
    }

    await orderService.updateUserBehaviorOnStatusChange(
        dbOrder.userId,
        currentStatus,
        status,
        dbOrder.price + dbOrder.deliveryPrice,
        dbOrder.orderDate || null,
    );

    logger.debug({ orderId: id }, 'order:updateOrderStatus publishing status update');
    
    // Find the order to get the user ID
    await orderService.publishUserOrders(dbOrder.userId);
    
    // Publish to all admins for real-time updates
    await orderService.publishAllOrders();
    
    // Log the status change
    const logger = createAuditLogger(db, context);
    await logger.log({
        action: 'ORDER_STATUS_CHANGED',
        entityType: 'ORDER',
        entityId: id,
        metadata: {
            orderId: id,
            oldValue: { status: currentStatus },
            newValue: { status },
            changedFields: ['status'],
        },
    });
    
    return order;
};
