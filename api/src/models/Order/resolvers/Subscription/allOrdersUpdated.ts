import type { SubscriptionResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';
import { cache } from '@/lib/cache';
import { SHIFT_DRIVERS_CACHE_KEY } from '@/models/Driver/resolvers/Mutation/adminSetShiftDrivers';
import { adjustBusinessInventoryQuantities } from '@/services/order/adjustBusinessInventoryQuantities';
import { buildBusinessGracePeriodFilter } from '@/services/scheduleBusinessNotification';

export const allOrdersUpdated: NonNullable<SubscriptionResolvers['allOrdersUpdated']> = {
    subscribe: async (_parent, _args, { orderService, userData }) => {
        if (userData.role !== 'SUPER_ADMIN' && userData.role !== 'DRIVER' && userData.role !== 'BUSINESS_OWNER' && userData.role !== 'BUSINESS_EMPLOYEE') {
            throw AppError.forbidden('Only admins can subscribe to all orders');
        }

        return orderService.subscribeToAllOrders();
    },
    resolve: async (payload: any, _args, { userData, orderService, db }) => {
        const allOrders = payload.orders || [];

        switch (userData.role) {
            case 'SUPER_ADMIN':
            case 'DRIVER': {
                // If a shift is active and this driver is not on it, strip READY
                // unassigned orders so the accept modal never surfaces for them.
                const shiftIds = await cache.get<string[]>(SHIFT_DRIVERS_CACHE_KEY);
                if (shiftIds && shiftIds.length > 0 && userData.userId && !shiftIds.includes(userData.userId)) {
                    return allOrders.filter((o: any) => !(o.status === 'READY' && !o.driver?.id));
                }
                return allOrders;
            }

            case 'BUSINESS_OWNER':
            case 'BUSINESS_EMPLOYEE':
                if (!userData.businessId) {
                    return [];
                }

                const businessOrders = [];
                for (const order of allOrders) {
                    const containsBusiness = await orderService.orderContainsBusiness(order.id, userData.businessId);
                    if (containsBusiness) {
                        businessOrders.push(order);
                    }
                }

                const withinGrace = await buildBusinessGracePeriodFilter();
                const filteredOrders = businessOrders.filter(withinGrace);

                return adjustBusinessInventoryQuantities(db, filteredOrders, userData.businessId);

            default:
                return [];
        }
    },
};
