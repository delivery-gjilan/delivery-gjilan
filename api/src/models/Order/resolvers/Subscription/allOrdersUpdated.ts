// @ts-nocheck
import type { SubscriptionResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';

export const allOrdersUpdated: NonNullable<SubscriptionResolvers['allOrdersUpdated']> = {
    subscribe: async (_parent, _args, { orderService, userData }) => {
        if (userData.role !== 'SUPER_ADMIN' && userData.role !== 'DRIVER' && userData.role !== 'BUSINESS_OWNER' && userData.role !== 'BUSINESS_EMPLOYEE') {
            throw AppError.forbidden('Only admins can subscribe to all orders');
        }

        return orderService.subscribeToAllOrders();
    },
    resolve: async (payload: any, _args, { userData, orderService }) => {
        const allOrders = payload.orders || [];

        switch (userData.role) {
            case 'SUPER_ADMIN':
            case 'DRIVER':
                return allOrders;

            case 'BUSINESS_OWNER':
            case 'BUSINESS_EMPLOYEE':
                if (!userData.businessId) {
                    return [];
                }
                
                const filteredOrders = [];
                for (const order of allOrders) {
                    const containsBusiness = await orderService.orderContainsBusiness(order.id, userData.businessId);
                    if (containsBusiness) {
                        filteredOrders.push(order);
                    }
                }
                
                return filteredOrders;

            default:
                return [];
        }
    },
};
