import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const order: NonNullable<QueryResolvers['order']> = async (_parent, { id }, { orderService, userData }) => {
    // Check authentication
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized: You must be logged in to view orders', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    const order = await orderService.getOrderById(id);

    if (!order) {
        throw new GraphQLError('Order not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    // Check authorization based on role
    switch (userData.role) {
        case 'SUPER_ADMIN':
        case 'DRIVER':
            // Super admins and drivers can see any order
            return order;

        case 'CUSTOMER':
            // Customers can only see their own orders
            if (order.userId !== userData.userId) {
                throw new GraphQLError('Forbidden: You can only view your own orders', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            return order;

        case 'BUSINESS_ADMIN':
            // Business admins can only see orders that contain items from their business
            if (!userData.businessId) {
                throw new GraphQLError('Business admin must be associated with a business', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            // Check if order contains items from the admin's business
            const hasBusinessItems = await orderService.orderContainsBusiness(order.id, userData.businessId);
            if (!hasBusinessItems) {
                throw new GraphQLError('Forbidden: You can only view orders from your business', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            return order;

        default:
            throw new GraphQLError('Invalid user role', {
                extensions: { code: 'FORBIDDEN' },
            });
    }
};
