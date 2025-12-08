import type { MutationResolvers } from './../../../generated/types.generated';
import { orderService } from '../../../services/OrderService';

export const Mutation: MutationResolvers = {
    updateOrderStatus: async (_, { id, status }) => {
        return await orderService.updateOrderStatus(id, status);
    },

    cancelOrder: async (_, { id }) => {
        return await orderService.cancelOrder(id);
    },
};
