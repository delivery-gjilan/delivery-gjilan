import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { createAuditLogger } from '@/services/AuditLogger';
import { notifyCustomerItemRemoved } from '@/services/orderNotifications';
import logger from '@/lib/logger';

export const removeOrderItem: NonNullable<MutationResolvers['removeOrderItem']> = async (
    _parent,
    { orderId, orderItemId, reason, quantity },
    context,
) => {
    const { orderService, userData, db } = context;

    if (!userData.userId) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    const role = userData.role;
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    const isBusinessUser = role === 'BUSINESS_OWNER' || role === 'BUSINESS_EMPLOYEE';

    if (!isAdmin && !isBusinessUser) {
        throw new GraphQLError('Only admins or business users can remove order items', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
        throw new GraphQLError('Reason is required', { extensions: { code: 'BAD_REQUEST' } });
    }

    const dbOrder = await orderService.orderRepository.findById(orderId);
    if (!dbOrder) {
        throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
    }

    // Business users can only operate on orders that contain their business
    if (isBusinessUser) {
        if (!userData.businessId) {
            throw new GraphQLError('Business user has no business assigned', { extensions: { code: 'FORBIDDEN' } });
        }
        const canAccess = await orderService.orderContainsBusiness(orderId, userData.businessId);
        if (!canAccess) {
            throw new GraphQLError('Not authorized to modify this order', { extensions: { code: 'FORBIDDEN' } });
        }
    }

    logger.info(
        { orderId, orderItemId, userId: userData.userId, reason: trimmedReason },
        'order:removeOrderItem',
    );

    const order = await orderService.removeOrderItem(orderId, orderItemId, trimmedReason, quantity ?? undefined);

    await orderService.publishSingleUserOrder(dbOrder.userId, orderId);
    await orderService.publishAllOrders();

    // Notify customer — fire-and-forget
    // item name comes from the returned order (mapped), or we can try to find it in businesses
    const itemName = (() => {
        for (const biz of order.businesses ?? []) {
            for (const item of biz?.items ?? []) {
                if (item?.id === orderItemId) return item.name ?? 'Item';
            }
        }
        return 'Item';
    })();
    notifyCustomerItemRemoved(context.notificationService, dbOrder.userId, orderId, itemName, trimmedReason, quantity ?? undefined);

    const auditLogger = createAuditLogger(db, context);
    await auditLogger.log({
        action: 'ORDER_ITEM_REMOVED',
        entityType: 'ORDER',
        entityId: orderId,
        metadata: {
            orderId,
            orderItemId,
            reason: trimmedReason,
            quantity: quantity ?? 'all',
            removedByUserId: userData.userId,
        },
    });

    return order;
};
