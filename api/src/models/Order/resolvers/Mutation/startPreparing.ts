import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';
import logger from '@/lib/logger';
import { notifyCustomerOrderStatus, updateLiveActivity } from '@/services/orderNotifications';
import { AppError } from '@/lib/errors';
import { parseDbTimestamp } from '@/lib/dateTime';
import { emitOrderEvent } from '@/repositories/OrderEventRepository';

export const startPreparing: NonNullable<MutationResolvers['startPreparing']> = async (
    _parent,
    { id, preparationMinutes },
    context,
) => {
    const { orderService, userData, db } = context;
    logger.info({ orderId: id, preparationMinutes }, 'order:startPreparing');

    const role = userData?.role;
    if (!role) {
        throw AppError.unauthorized();
    }

    const isBusinessAdmin = role === 'BUSINESS_OWNER' || role === 'BUSINESS_EMPLOYEE';
    const isSuperAdmin = role === 'SUPER_ADMIN';

    if (!isBusinessAdmin && !isSuperAdmin) {
        throw AppError.forbidden('Not authorized to start preparing');
    }

    if (isBusinessAdmin) {
        if (!userData.businessId) {
            throw AppError.forbidden('Business admin has no business assigned');
        }
        const canAccess = await orderService.orderContainsBusiness(id, userData.businessId);
        if (!canAccess) {
            throw AppError.forbidden('Not authorized to update this order');
        }
    }

    if (preparationMinutes < 1 || preparationMinutes > 180) {
        throw AppError.badInput('Preparation time must be between 1 and 180 minutes');
    }

    const currentOrder = await orderService.getOrderById(id);
    if (!currentOrder) {
        throw AppError.notFound('Order');
    }

    const order = await orderService.startPreparing(id, preparationMinutes);

    const dbOrder = await orderService.orderRepository.findById(id);
    if (dbOrder) {
        await orderService.updateUserBehaviorOnStatusChange(
            dbOrder.userId,
            'PENDING',
            'PREPARING',
            dbOrder.price + dbOrder.deliveryPrice,
            dbOrder.orderDate || null,
        );

        await orderService.publishSingleUserOrder(dbOrder.userId, id);
        await orderService.publishAllOrders();

        notifyCustomerOrderStatus(context.notificationService, dbOrder.userId, id, 'PREPARING');

        emitOrderEvent({
            orderId: id,
            eventType: 'ORDER_PREPARING',
            actorType: isBusinessAdmin ? 'RESTAURANT' : 'ADMIN',
            actorId: userData?.userId,
            businessId: userData?.businessId ?? undefined,
            metadata: { preparationMinutes },
        });

        // Update Live Activity with preparation time
        updateLiveActivity(
            context.notificationService,
            id,
            'preparing',
            'Your driver', // Driver not assigned yet
            preparationMinutes,
            preparationMinutes,
            parseDbTimestamp(dbOrder.preparingAt)?.getTime() ?? Date.now(),
        );

        const auditLog = createAuditLogger(db, context);
        await auditLog.log({
            action: 'ORDER_STATUS_CHANGED',
            entityType: 'ORDER',
            entityId: id,
            metadata: {
                orderId: id,
                oldValue: { status: 'PENDING' },
                newValue: { status: 'PREPARING', preparationMinutes },
                changedFields: ['status', 'preparationMinutes'],
            },
        });
    }

    return order;
};