import type { QueryResolvers } from './../../../generated/types.generated';
import { orderService } from '../../../services/OrderService';

export const Query: QueryResolvers = {
    orders: async () => {
        return await orderService.getAllOrders();
    },

    order: async (_, { id }) => {
        return await orderService.getOrderById(id);
    },

    ordersByStatus: async (_, { status }) => {
        return await orderService.getOrdersByStatus(status);
    },
};
