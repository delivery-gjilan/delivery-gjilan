import type { MutationResolvers } from './../../../../generated/types.generated';
import logger from '@/lib/logger';

export const startPreparing: NonNullable<MutationResolvers['startPreparing']> = async (
    _parent,
    { id, preparationMinutes },
    context,
) => {
    logger.info({ orderId: id, preparationMinutes }, 'order:startPreparing');
    return context.orderService.startPreparingWithSideEffects(id, preparationMinutes, context);
};