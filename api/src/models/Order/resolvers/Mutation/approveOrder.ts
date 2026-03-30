import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';
import { createAuditLogger } from '@/services/AuditLogger';
import logger from '@/lib/logger';
import { users } from '@/database/schema';
import { and, inArray, isNull } from 'drizzle-orm';
import { notifyBusinessNewOrder } from '@/services/orderNotifications';

const log = logger.child({ resolver: 'approveOrder' });

export const approveOrder: NonNullable<MutationResolvers['approveOrder']> = async (
    _parent,
    { id },
    context,
) => {
    const { userData, orderService, db } = context;

    const role = userData?.role;
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        throw AppError.forbidden('Only admins can approve orders');
    }

    const currentOrder = await orderService.getOrderById(id);
    if (!currentOrder) {
        throw AppError.notFound('Order');
    }

    if (currentOrder.status !== 'AWAITING_APPROVAL') {
        throw AppError.businessRule('Order is not awaiting approval');
    }

    log.info({ orderId: id, adminId: userData.userId }, 'approveOrder: transitioning AWAITING_APPROVAL → PENDING');

    const order = await orderService.updateOrderStatus(id, 'PENDING', true);

    try {
        await orderService.publishSingleUserOrder(String(order.userId), String(order.id));
    } catch (error) {
        log.error({ err: error, orderId: id }, 'approveOrder:publishSingleUserOrder:failed');
    }

    try {
        await orderService.publishAllOrders();
    } catch (error) {
        log.error({ err: error, orderId: id }, 'approveOrder:publishAllOrders:failed');
    }

    try {
        const orderBusinessIds = Array.from(
            new Set(
                (order.businesses ?? [])
                    .map((entry) => entry?.business?.id)
                    .filter((businessId): businessId is string => Boolean(businessId)),
            ),
        );

        if (orderBusinessIds.length > 0) {
            const businessUserRows = await db
                .select({ id: users.id })
                .from(users)
                .where(
                    and(
                        inArray(users.businessId, orderBusinessIds),
                        inArray(users.role, ['BUSINESS_OWNER', 'BUSINESS_EMPLOYEE']),
                        isNull(users.deletedAt),
                    ),
                );

            notifyBusinessNewOrder(
                context.notificationService,
                businessUserRows.map((row) => row.id),
                String(order.id),
            );
        }
    } catch (error) {
        log.error({ err: error, orderId: id }, 'approveOrder:notifyBusinessNewOrder:failed');
    }

    const auditLogger = createAuditLogger(db, context);
    await auditLogger.log({
        action: 'ORDER_STATUS_CHANGED',
        entityType: 'ORDER',
        entityId: String(id),
        metadata: { orderId: String(id), adminId: userData.userId, from: 'AWAITING_APPROVAL', to: 'PENDING' },
    });

    return order;
};
