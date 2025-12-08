
import type { MutationResolvers } from './../../../../generated/types.generated';
import { orderService } from './../../../../services/OrderService';

export const updateOrderStatus: NonNullable<MutationResolvers['updateOrderStatus']> = async (_parent, { id, status }) => {
    return await orderService.updateOrderStatus(id, status);
};