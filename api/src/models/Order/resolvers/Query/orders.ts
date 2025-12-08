
import type { QueryResolvers } from './../../../../generated/types.generated';
import { orderService } from './../../../../services/OrderService';

export const orders: NonNullable<QueryResolvers['orders']> = async () => {
    return orderService.getAllOrders();
};