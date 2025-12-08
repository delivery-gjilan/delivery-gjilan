import type { QueryResolvers } from './../../../../generated/types.generated';
import { orderService } from './../../../../services/OrderService';

export const order: NonNullable<QueryResolvers['order']> = async (_parent, { id }) => {
    return await orderService.getOrderById(id);
};
