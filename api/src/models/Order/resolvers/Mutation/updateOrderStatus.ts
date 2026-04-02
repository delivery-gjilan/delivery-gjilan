import type { MutationResolvers } from './../../../../generated/types.generated';
import logger from '@/lib/logger';
import { AppError } from '@/lib/errors';

export const updateOrderStatus: NonNullable<MutationResolvers['updateOrderStatus']> = async (
    _parent,
    { id, status },
    context,
) => {
    const { orderService, userData } = context;
    logger.info({ orderId: id, status }, 'order:updateOrderStatus:resolver');

    const role = userData?.role;
    if (!role) {
        throw AppError.unauthorized();
    }

    // Delegate all logic, authorization, settlements, notifications and audit logging to the service
    return await orderService.updateStatusWithSideEffects(id, status, context);
};
