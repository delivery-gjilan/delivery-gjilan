import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';
import { AppError } from '@/lib/errors';
import logger from '@/lib/logger';

const log = logger.child({ resolver: 'createOrder' });

export const createOrder: NonNullable<MutationResolvers['createOrder']> = async (
    _parent,
    { input },
    context,
) => {
    const { userData, orderService, db } = context;
    if (!userData.userId) {
        throw AppError.unauthorized();
    }
    const order = await orderService.createOrder(userData.userId, input);

    // Best-effort side effects: the order is already persisted, so don't fail the
    // mutation response if realtime publish throws (e.g. transient WS/pubsub issues).
    try {
        await orderService.publishUserOrders(userData.userId!);
    } catch (error) {
        log.error({ err: error, userId: userData.userId, orderId: order.id }, 'createOrder:publishUserOrders:failed');
    }

    try {
        await orderService.publishAllOrders();
    } catch (error) {
        log.error({ err: error, userId: userData.userId, orderId: order.id }, 'createOrder:publishAllOrders:failed');
    }

    const logger = createAuditLogger(db, context);
    await logger.log({
        action: 'ORDER_CREATED',
        entityType: 'ORDER',
        entityId: String(order.id),
        metadata: { orderId: String(order.id), userId: userData.userId, totalPrice: order.totalPrice },
    });

    return order;
};
