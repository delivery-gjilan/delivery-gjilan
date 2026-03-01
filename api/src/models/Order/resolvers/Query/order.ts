import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const order: NonNullable<QueryResolvers['order']> = async (_parent, { id }, { orderService, userData }) => {
    // Check authentication
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized: You must be logged in to view orders', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    const dbOrder = await orderService.orderRepository.findById(id);

    if (!dbOrder) {
        throw new GraphQLError('Order not found', {
            extensions: { code: 'NOT_FOUND' },
        });
    }

    // Check authorization based on role BEFORE mapping (using dbOrder.userId)
    switch (userData.role) {
        case 'SUPER_ADMIN':
        case 'DRIVER':
            // Super admins and drivers can see any order
            break;

        case 'CUSTOMER':
            // Customers can only see their own orders
            if (dbOrder.userId !== userData.userId) {
                throw new GraphQLError('Forbidden: You can only view your own orders', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            break;

        case 'BUSINESS_OWNER':
        case 'BUSINESS_EMPLOYEE':
            // Business users can only see orders that contain items from their business
            if (!userData.businessId) {
                throw new GraphQLError('Business admin must be associated with a business', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            // Check if order contains items from the admin's business
            const hasBusinessItems = await orderService.orderContainsBusiness(dbOrder.id, userData.businessId);
            if (!hasBusinessItems) {
                throw new GraphQLError('Forbidden: You can only view orders from your business', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            break;

        default:
            throw new GraphQLError('Invalid user role', {
                extensions: { code: 'FORBIDDEN' },
            });
    }

    // Authorization passed, now map and return the order
    return orderService.mapToOrderPublic(dbOrder);
};
