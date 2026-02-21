import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';

export const createOrder: NonNullable<MutationResolvers['createOrder']> = async (
    _parent,
    { input },
    context,
) => {
    const { userData, orderService, db } = context;
    if (!userData.userId) {
        throw new Error('Unauthorized');
    }
    const order = await orderService.createOrder(userData.userId, input);
    await orderService.publishUserOrders(userData.userId!);
    await orderService.publishAllOrders();

    const logger = createAuditLogger(db, context);
    await logger.log({
        action: 'ORDER_CREATED',
        entityType: 'ORDER',
        entityId: String(order.id),
        metadata: { orderId: String(order.id), userId: userData.userId, totalPrice: order.totalPrice },
    });

    return order;
};
