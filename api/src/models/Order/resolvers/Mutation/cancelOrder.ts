import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { createAuditLogger } from '@/services/AuditLogger';

export const cancelOrder: NonNullable<MutationResolvers['cancelOrder']> = async (
    _parent,
    { id },
    context,
) => {
    const { orderService, userData, db } = context;

    if (!userData.userId) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    // Fetch order first to check ownership and current status
    const dbOrder = await orderService.orderRepository.findById(id);
    if (!dbOrder) {
        throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
    }

    // Ownership check: only the order owner or SUPER_ADMIN can cancel
    if (userData.role !== 'SUPER_ADMIN' && dbOrder.userId !== userData.userId) {
        throw new GraphQLError('Not authorized to cancel this order', { extensions: { code: 'FORBIDDEN' } });
    }

    // Status guard: cannot cancel already finalized orders
    if (dbOrder.status === 'DELIVERED') {
        throw new GraphQLError('Cannot cancel a delivered order', { extensions: { code: 'BAD_REQUEST' } });
    }
    if (dbOrder.status === 'CANCELLED') {
        throw new GraphQLError('Order is already cancelled', { extensions: { code: 'BAD_REQUEST' } });
    }

    const order = await orderService.cancelOrder(id);

    await orderService.publishUserOrders(dbOrder.userId);
    await orderService.publishAllOrders();

    const logger = createAuditLogger(db, context);
    await logger.log({
        action: 'ORDER_CANCELLED',
        entityType: 'ORDER',
        entityId: id,
        metadata: { orderId: id, previousStatus: dbOrder.status },
    });

    return order;
};
