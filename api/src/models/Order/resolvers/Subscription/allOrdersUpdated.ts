import type { SubscriptionResolvers } from './../../../../generated/types.generated';

export const allOrdersUpdated: NonNullable<SubscriptionResolvers['allOrdersUpdated']> = {
    subscribe: async (_parent, _args, { orderService, userData }) => {
        console.log('[Subscription] Client subscribed to allOrdersUpdated', { role: userData.role, businessId: userData.businessId });
        
        // Only admins and drivers can subscribe to all orders
        if (userData.role !== 'SUPER_ADMIN' && userData.role !== 'DRIVER' && userData.role !== 'BUSINESS_ADMIN') {
            throw new Error('Unauthorized: Only admins can subscribe to all orders');
        }

        return orderService.subscribeToAllOrders();
    },
    resolve: async (payload: any, _args, { userData, orderService }) => {
        console.log('[Subscription] Resolving allOrdersUpdated', { 
            totalOrders: payload.orders?.length,
            role: userData.role,
            businessId: userData.businessId 
        });
        
        const allOrders = payload.orders || [];

        // Filter based on role
        switch (userData.role) {
            case 'SUPER_ADMIN':
            case 'DRIVER':
                // Super admins and drivers can see all orders
                return allOrders;

            case 'BUSINESS_ADMIN':
                // Business admins can only see orders that contain items from their business
                if (!userData.businessId) {
                    console.log('[Subscription] Business admin has no businessId, returning empty array');
                    return [];
                }
                
                // Filter orders that contain items from this business
                const filteredOrders = [];
                for (const order of allOrders) {
                    const containsBusiness = await orderService.orderContainsBusiness(order.id, userData.businessId);
                    if (containsBusiness) {
                        filteredOrders.push(order);
                    }
                }
                
                console.log('[Subscription] Filtered orders for business admin:', filteredOrders.length);
                return filteredOrders;

            default:
                return [];
        }
    },
};
