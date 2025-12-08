
import type { MutationResolvers } from './../../../../generated/types.generated';
import { orderService } from './../../../../services/OrderService';

export const cancelOrder: NonNullable<MutationResolvers['cancelOrder']> = async (_parent, { id }) => {
    return await orderService.cancelOrder(id);
};