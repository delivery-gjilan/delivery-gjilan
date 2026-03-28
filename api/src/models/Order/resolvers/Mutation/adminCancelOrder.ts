import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { createAuditLogger } from '@/services/AuditLogger';
import { notifyCustomerOrderStatus } from '@/services/orderNotifications';
import logger from '@/lib/logger';

export const adminCancelOrder: NonNullable<MutationResolvers['adminCancelOrder']> = async (
    _parent,
    { id, reason, settleDriver, settleBusiness },
    context,
) => {
    const { orderService, userData, db } = context;

    if (!userData.userId) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    if (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only admins can cancel orders', { extensions: { code: 'FORBIDDEN' } });
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
        throw new GraphQLError('Cancellation reason is required', { extensions: { code: 'BAD_REQUEST' } });
    }

    const dbOrder = await orderService.orderRepository.findById(id);
    if (!dbOrder) {
        throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
    }

    logger.info({ orderId: id, adminId: userData.userId, reason: trimmedReason }, 'order:adminCancelOrder');

    const order = await orderService.adminCancelOrder(id, trimmedReason, settleDriver ?? false, settleBusiness ?? false);

    await orderService.publishSingleUserOrder(dbOrder.userId, id);
    await orderService.publishAllOrders();

    notifyCustomerOrderStatus(context.notificationService, dbOrder.userId, id, 'CANCELLED');

    const auditLogger = createAuditLogger(db, context);
    await auditLogger.log({
        action: 'ORDER_CANCELLED',
        entityType: 'ORDER',
        entityId: id,
        metadata: {
            orderId: id,
            previousStatus: dbOrder.status,
            reason: trimmedReason,
            cancelledByAdmin: userData.userId,
        },
    });

    return order;
};
