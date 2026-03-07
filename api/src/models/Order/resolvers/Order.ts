// @ts-nocheck
import type { OrderResolvers } from './../../../generated/types.generated';
import logger from '@/lib/logger';

export const Order: OrderResolvers = {
    userId: (parent) => {
        // parent.userId is set from DbOrder.userId in OrderService.mapToOrder
        return (parent as any).userId ?? '';
    },

    pickupLocations: (parent) => {
        return (parent.businesses ?? []).map(b => b.business.location);
    },

    user: async (parent, _args, { loaders }) => {
        if (!parent.userId) {
            return null;
        }
        
        try {
            return await loaders.userLoader.load(String(parent.userId));
        } catch (error) {
            logger.error({ err: error, orderId: parent.id }, 'order:resolveUser failed');
            return null;
        }
    },
    
    orderPromotions: async (parent, _args, { loaders }) => {
        try {
            return await loaders.orderPromotionsLoader.load(String(parent.id));
        } catch (error) {
            logger.error({ err: error, orderId: parent.id }, 'order:resolvePromotions failed');
            return [];
        }
    },
};
