import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const ordersByStatus: NonNullable<QueryResolvers['ordersByStatus']> = async (
    _parent,
    { status },
    { orderService, userData },
) => {
    // Check authentication
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized: You must be logged in to view orders', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    // Get orders by status
    const statusOrders = await orderService.getOrdersByStatus(status);

    // Filter based on role
    switch (userData.role) {
        case 'SUPER_ADMIN':
            return statusOrders;

        case 'DRIVER':
            // Drivers see their own assigned orders + all active (pickable) orders for this status
            return statusOrders.filter(order =>
                order.driver?.id === userData.userId ||
                !['DELIVERED', 'CANCELLED'].includes(order.status)
            );

        case 'CUSTOMER':
            // Customers can only see their own orders
            return statusOrders.filter(order => order.userId === userData.userId);

        case 'BUSINESS_ADMIN':
            // Business admins can only see orders that contain items from their business
            if (!userData.businessId) {
                throw new GraphQLError('Business admin must be associated with a business', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            const businessOrders = await orderService.getOrdersByBusinessId(userData.businessId);
            return businessOrders.filter(order => order.status === status);

        default:
            throw new GraphQLError('Invalid user role', {
                extensions: { code: 'FORBIDDEN' },
            });
    }
};
