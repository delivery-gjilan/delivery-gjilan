import type { MutationResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { orderItems as orderItemsTable } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { FinancialService } from '@/services/FinancialService';
import { createAuditLogger } from '@/services/AuditLogger';
import logger from '@/lib/logger';
import { notifyCustomerOrderStatus, updateLiveActivity, endLiveActivity } from '@/services/orderNotifications';
import { getDispatchService } from '@/services/driverServices.init';
import { AppError } from '@/lib/errors';
import { parseDbTimestamp } from '@/lib/dateTime';
import { getLiveDriverEta } from '@/lib/driverEtaCache';

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
            PENDING: ['READY', 'CANCELLED'],   // MARKET/PHARMACY: skip PREPARING
            PREPARING: ['READY', 'CANCELLED'],
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

    // Dispatch to nearby drivers when an order becomes ready for pickup.
    if (status === 'READY' && currentStatus !== 'READY') {
        try {
            const dispatchService = getDispatchService();
            dispatchService.dispatchOrder(id, context.notificationService).catch((err) =>
                logger.error({ err, orderId: id }, 'updateOrderStatus:dispatch:error'),
            );
        } catch (err) {
            // getDispatchService throws if not yet initialized; log and continue.
            logger.warn({ err }, 'updateOrderStatus:dispatch:serviceNotReady');
        }
    }
    
    // Update Live Activity (Dynamic Island) on every status transition.
    const statusToLiveActivityStatus: Record<string, 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'> = {
        PENDING: 'pending',
        PREPARING: 'preparing',
        READY: 'ready',
        OUT_FOR_DELIVERY: 'out_for_delivery',
        DELIVERED: 'delivered',
        CANCELLED: 'cancelled',
    };
    const liveActivityStatus = statusToLiveActivityStatus[status];

    if (liveActivityStatus) {
        // Get driver name if available
        let driverName = 'Your driver';
        if (order.driver?.firstName) {
            driverName = `${order.driver.firstName} ${order.driver.lastName || ''}`.trim();
        }

        // Calculate estimated minutes based on status
        let estimatedMinutes = 0;
        if ((status === 'PREPARING' || status === 'READY') && dbOrder.preparationMinutes) {
            estimatedMinutes = dbOrder.preparationMinutes;
        } else if (status === 'OUT_FOR_DELIVERY') {
            // Try to read real-time ETA from the driver's heartbeat cache.
            // The driver's navigation SDK pushes remainingEtaSeconds every 2-5 s
            // via the heartbeat mutation → driverEtaCache.
            const driverId = dbOrder.driverId ?? userData?.userId;
            if (driverId) {
                try {
                    const liveEta = await getLiveDriverEta(driverId);
                    if (liveEta?.remainingEtaSeconds != null && liveEta.remainingEtaSeconds > 0) {
                        estimatedMinutes = Math.ceil(liveEta.remainingEtaSeconds / 60);
                    }
                } catch { /* fall through to default */ }
            }
            // Fallback: if no live ETA is available yet (driver hasn't started
            // navigating or heartbeat hasn't cached an ETA), use a safe default.
            if (estimatedMinutes === 0) {
                estimatedMinutes = 15;
            }
        }

        const phaseInitialMinutes =
            status === 'PENDING'
                ? Math.max(1, (dbOrder.preparationMinutes ?? estimatedMinutes) || 15)
                : (status === 'PREPARING' || status === 'READY')
                    ? Math.max(1, (dbOrder.preparationMinutes ?? estimatedMinutes) || 15)
                    : status === 'OUT_FOR_DELIVERY'
                        ? Math.max(1, estimatedMinutes || 15)
                        : Math.max(1, estimatedMinutes || 1);

        const phaseStartedAt =
            status === 'PENDING'
                ? (parseDbTimestamp(dbOrder.orderDate)?.getTime() ?? Date.now())
                : (status === 'PREPARING' || status === 'READY')
                    ? (parseDbTimestamp(dbOrder.preparingAt)?.getTime() ?? Date.now())
                    : status === 'OUT_FOR_DELIVERY'
                        ? (parseDbTimestamp(dbOrder.outForDeliveryAt)?.getTime() ?? Date.now())
                        : Date.now();

        updateLiveActivity(
            context.notificationService,
            id,
            liveActivityStatus,
            driverName,
            estimatedMinutes,
            phaseInitialMinutes,
            phaseStartedAt,
        );

        if (status === 'DELIVERED' || status === 'CANCELLED') {
            // End Live Activity when order is completed or cancelled.
            endLiveActivity(
                context.notificationService,
                id,
                status === 'CANCELLED' ? 'cancelled' : 'delivered',
            );
        }
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
