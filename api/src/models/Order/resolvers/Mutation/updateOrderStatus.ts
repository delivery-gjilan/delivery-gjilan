import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { orderItems as orderItemsTable } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { FinancialService } from '@/services/FinancialService';
import { createAuditLogger } from '@/services/AuditLogger';
import logger from '@/lib/logger';
import { notifyCustomerOrderStatus, updateLiveActivity, endLiveActivity } from '@/services/orderNotifications';
import { AppError } from '@/lib/errors';

export const updateOrderStatus: NonNullable<MutationResolvers['updateOrderStatus']> = async (
    _parent,
    { id, status },
    context,
) => {
    const { orderService, userData, db } = context;
    logger.info({ orderId: id, status }, 'order:updateOrderStatus');

    const role = userData?.role;
    if (!role) {
        throw AppError.unauthorized();
    }

    const currentOrder = await orderService.getOrderById(id);
    if (!currentOrder) {
        throw AppError.notFound('Order');
    }

    const dbOrder = await orderService.orderRepository.findById(id);
    if (!dbOrder) {
        throw AppError.notFound('Order');
    }

    const currentStatus = currentOrder.status;

    const isSuperAdmin = role === 'SUPER_ADMIN';
    const isDriver = role === 'DRIVER';
    const isBusinessAdmin = role === 'BUSINESS_OWNER' || role === 'BUSINESS_EMPLOYEE';
    const isCustomer = role === 'CUSTOMER';

    let order;

    if (isCustomer) {
        // Allow customers to mark their own orders as DELIVERED for testing purposes
        if (currentOrder.userId !== userData.userId) {
            throw AppError.forbidden('Not authorized to update this order');
        }

        if (status !== 'DELIVERED') {
            throw AppError.businessRule('Customers can only mark orders as DELIVERED');
        }

        order = await orderService.updateOrderStatus(id, status, true); // Skip validation
    } else if (isBusinessAdmin) {
        if (!userData.businessId) {
            throw AppError.forbidden('Business admin has no business assigned');
        }

        const canAccess = await orderService.orderContainsBusiness(id, userData.businessId);
        if (!canAccess) {
            throw AppError.forbidden('Not authorized to update this order');
        }

        const allowed: Record<string, string[]> = {
            PREPARING: ['READY'],
        };

        if (!allowed[currentStatus]?.includes(status)) {
            throw AppError.businessRule('Invalid status transition for business admin. Use startPreparing mutation for PENDING → PREPARING');
        }
        order = await orderService.updateOrderStatus(id, status);
    } else if (isDriver) {
        const allowed: Record<string, string[]> = {
            PREPARING: ['OUT_FOR_DELIVERY'],
            READY: ['OUT_FOR_DELIVERY'],
            OUT_FOR_DELIVERY: ['DELIVERED'],
        };

        if (!allowed[currentStatus]?.includes(status)) {
            throw AppError.businessRule('Invalid status transition for driver');
        }

        if (!userData.userId) {
            throw AppError.unauthorized('Driver not authenticated');
        }

        if (dbOrder.driverId && dbOrder.driverId !== userData.userId) {
            throw AppError.conflict('Order already assigned to another driver');
        }

        if (status === 'OUT_FOR_DELIVERY') {
            order = await orderService.updateOrderStatusWithDriver(id, status, userData.userId);
        } else {
            order = await orderService.updateOrderStatus(id, status);
        }
    } else if (!isSuperAdmin) {
        throw AppError.forbidden('Not authorized to update order status');
    } else {
        // SUPER_ADMIN bypasses status transition validation
        order = await orderService.updateOrderStatus(id, status, true);
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
    
    // Send push notification to customer
    notifyCustomerOrderStatus(context.notificationService, dbOrder.userId, id, status);
    
    // Update Live Activity (Dynamic Island) with new status
    if (status === 'PREPARING' || status === 'READY' || status === 'OUT_FOR_DELIVERY') {
        const liveActivityStatus = status === 'OUT_FOR_DELIVERY' ? 'out_for_delivery' 
            : status === 'READY' ? 'ready' 
            : 'preparing';
        
        // Get driver name if available
        let driverName = 'Your driver';
        if (order.driver?.firstName) {
            driverName = `${order.driver.firstName} ${order.driver.lastName || ''}`.trim();
        }
        
        // Calculate estimated minutes based on status
        let estimatedMinutes = 0;
        if (status === 'PREPARING' && dbOrder.preparationMinutes) {
            estimatedMinutes = dbOrder.preparationMinutes;
        } else if (status === 'READY') {
            estimatedMinutes = 10; // Default 10 min for driver pickup
        } else if (status === 'OUT_FOR_DELIVERY') {
            estimatedMinutes = 15; // Default 15 min for delivery
        }
        
        updateLiveActivity(
            context.notificationService,
            id,
            liveActivityStatus,
            driverName,
            estimatedMinutes
        );
    } else if (status === 'DELIVERED' || status === 'CANCELLED') {
        // End Live Activity when order is completed or cancelled
        endLiveActivity(context.notificationService, id);
    }
    
    // Log the status change
    const auditLog = createAuditLogger(db, context);
    await auditLog.log({
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
