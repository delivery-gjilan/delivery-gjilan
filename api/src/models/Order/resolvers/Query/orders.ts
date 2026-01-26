import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const orders: NonNullable<QueryResolvers['orders']> = async (_parent, _args, { orderService, userData }) => {
    // Check authentication
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized: You must be logged in to view orders', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    // Get all orders first
    const allOrders = await orderService.getAllOrders();

    // Filter based on role
    switch (userData.role) {
        case 'SUPER_ADMIN':
        case 'DRIVER':
            // Super admins and drivers can see all orders
            return allOrders;

        case 'CUSTOMER':
            // Customers can only see their own orders
            return allOrders.filter(order => order.userId === userData.userId);

        case 'BUSINESS_ADMIN':
            // Business admins can only see orders that contain items from their business
            if (!userData.businessId) {
                throw new GraphQLError('Business admin must be associated with a business', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            return orderService.getOrdersByBusinessId(userData.businessId);

        default:
            throw new GraphQLError('Invalid user role', {
                extensions: { code: 'FORBIDDEN' },
            });
    }
};
