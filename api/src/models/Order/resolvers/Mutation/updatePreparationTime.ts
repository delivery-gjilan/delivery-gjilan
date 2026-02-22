import type { MutationResolvers } from './../../../../generated/types.generated';
import { createAuditLogger } from '@/services/AuditLogger';
import logger from '@/lib/logger';

export const updatePreparationTime: NonNullable<MutationResolvers['updatePreparationTime']> = async (
    _parent,
    { id, preparationMinutes },
    context,
) => {
    const { orderService, userData, db } = context;
    logger.info({ orderId: id, preparationMinutes }, 'order:updatePreparationTime');

    const role = userData?.role;
    if (!role) {
        throw new Error('Unauthorized');
    }

    const isBusinessAdmin = role === 'BUSINESS_ADMIN';
    const isSuperAdmin = role === 'SUPER_ADMIN';

    if (!isBusinessAdmin && !isSuperAdmin) {
        throw new Error('Not authorized to update preparation time');
    }

    if (isBusinessAdmin) {
        if (!userData.businessId) {
            throw new Error('Business admin has no business assigned');
        }
        const canAccess = await orderService.orderContainsBusiness(id, userData.businessId);
        if (!canAccess) {
            throw new Error('Not authorized to update this order');
        }
    }

    if (preparationMinutes < 1 || preparationMinutes > 180) {
        throw new Error('Preparation time must be between 1 and 180 minutes');
    }

    const order = await orderService.updatePreparationTime(id, preparationMinutes);

    const dbOrder = await orderService.orderRepository.findById(id);
    if (dbOrder) {
        await orderService.publishUserOrders(dbOrder.userId);
        await orderService.publishAllOrders();

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