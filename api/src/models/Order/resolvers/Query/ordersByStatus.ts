
import type { QueryResolvers } from './../../../../generated/types.generated';
import { orderService } from './../../../../services/OrderService';

export const ordersByStatus: NonNullable<QueryResolvers['ordersByStatus']> = async (_parent, { status }) => {
    return orderService.getOrdersByStatus(status);
};