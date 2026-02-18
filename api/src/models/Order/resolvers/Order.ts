import type { OrderResolvers } from './../../../generated/types.generated';
import { getDB } from '@/database';
import { orderPromotions } from '@/database/schema/orderPromotions';
import { eq } from 'drizzle-orm';

export const Order: OrderResolvers = {
    user: async (parent, _args, { authService }) => {
        if (!parent.userId) {
            return null;
        }
        
        try {
            const user = await authService.authRepository.findById(parent.userId);
            return user || null;
        } catch (error) {
            console.error('Error fetching user for order:', error);
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
            console.error('Error fetching order promotions:', error);
            return [];
        }
    },
};
