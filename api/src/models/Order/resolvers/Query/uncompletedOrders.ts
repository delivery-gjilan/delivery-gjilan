import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const uncompletedOrders: NonNullable<QueryResolvers['uncompletedOrders']> = async (
    _parent,
    _arg,
    { orderService, userData },
) => {
    // Check authentication
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized: You must be logged in to view orders', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    // Get uncompleted orders based on role
    switch (userData.role) {
        case 'SUPER_ADMIN':
        case 'DRIVER':
            // Use DB-level filter instead of fetching all orders and filtering in memory
            return orderService.getUncompletedOrders();

        case 'CUSTOMER':
            // Customers can only see their own uncompleted orders
            return orderService.getUserUncompletedOrders(userData.userId);

        case 'BUSINESS_ADMIN':
            // Business admins can only see uncompleted orders that contain items from their business
            if (!userData.businessId) {
                throw new GraphQLError('Business admin must be associated with a business', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            const businessOrders = await orderService.getOrdersByBusinessId(userData.businessId);
            return businessOrders.filter(order => order.status !== 'DELIVERED' && order.status !== 'CANCELLED');

        default:
            throw new GraphQLError('Invalid user role', {
                extensions: { code: 'FORBIDDEN' },
            });
    }
};
