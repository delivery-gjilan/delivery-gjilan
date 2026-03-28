import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';
import logger from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { updateLiveActivity } from '@/services/orderNotifications';
import { emitOrderEvent } from '@/repositories/OrderEventRepository';

export const updatePreparationTime: NonNullable<MutationResolvers['updatePreparationTime']> = async (
    _parent,
    { id, preparationMinutes },
    context,
) => {
    const { orderService, userData, db } = context;
    logger.info({ orderId: id, preparationMinutes }, 'order:updatePreparationTime');

    const role = userData?.role;
    if (!role) {
        throw AppError.unauthorized();
    }

    const isBusinessAdmin = role === 'BUSINESS_OWNER' || role === 'BUSINESS_EMPLOYEE';
    const isSuperAdmin = role === 'SUPER_ADMIN';

    if (!isBusinessAdmin && !isSuperAdmin) {
        throw AppError.forbidden('Not authorized to update preparation time');
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

    const order = await orderService.updatePreparationTime(id, preparationMinutes);

    const dbOrder = await orderService.orderRepository.findById(id);
    if (dbOrder) {
        await orderService.publishSingleUserOrder(dbOrder.userId, id);
        await orderService.publishAllOrders();

        if (dbOrder.status === 'PREPARING') {
            updateLiveActivity(
                context.notificationService,
                id,
                'preparing',
                'Your driver',
                preparationMinutes,
                preparationMinutes,
                dbOrder.preparingAt ? new Date(dbOrder.preparingAt).getTime() : Date.now(),
            );
        }

        emitOrderEvent({
            orderId: id,
            eventType: 'PREP_TIME_UPDATED',
            actorType: isBusinessAdmin ? 'RESTAURANT' : 'ADMIN',
            actorId: userData?.userId,
            businessId: userData?.businessId ?? undefined,
            metadata: {
                newPreparationMinutes: preparationMinutes,
                previousEstimatedReadyAt: dbOrder?.estimatedReadyAt,
            },
        });

        const auditLog = createAuditLogger(db, context);
        await auditLog.log({
            action: 'ORDER_PREPARATION_TIME_UPDATED',
            entityType: 'ORDER',
            entityId: id,
            metadata: {
                orderId: id,
                newValue: { preparationMinutes },
                changedFields: ['preparationMinutes', 'estimatedReadyAt'],
            },
        });
    }

    return order;
};