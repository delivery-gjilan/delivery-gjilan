import type { OrderResolvers } from './../../../generated/types.generated';
import logger from '@/lib/logger';
import { getDB } from '@/database';
import { orderPromotions } from '@/database/schema/orderPromotions';
import { eq } from 'drizzle-orm';

export const Order: OrderResolvers = {
    userId: (parent) => {
        // parent.userId is set from DbOrder.userId in OrderService.mapToOrder
        return (parent as any).userId ?? '';
    },

    pickupLocations: (parent) => {
        return (parent.businesses ?? []).map(b => b.business.location);
    },

    user: async (parent, _args, { authService }) => {
        if (!parent.userId) {
            return null;
        }
        
        try {
            const user = await authService.authRepository.findById(parent.userId);
            return user || null;
        } catch (error) {
            logger.error({ err: error, orderId: parent.id }, 'order:resolveUser failed');
            return null;
        }
    },
    
    orderPromotions: async (parent) => {
        try {
            const db = await getDB();
            const promotions = await db
                .select()
                .from(orderPromotions)
                .where(eq(orderPromotions.orderId, parent.id));
            return promotions;
        } catch (error) {
            logger.error({ err: error, orderId: parent.id }, 'order:resolvePromotions failed');
            return [];
        }
    },
};
