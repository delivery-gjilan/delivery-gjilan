import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const ordersByStatus: NonNullable<QueryResolvers['ordersByStatus']> = async (
    _parent,
    { status, limit, offset },
    { orderService, userData },
) => {
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized: You must be logged in to view orders', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    switch (userData.role) {
        case 'SUPER_ADMIN':
        case 'ADMIN':
            return orderService.getOrdersByStatus(status, limit ?? undefined, offset ?? undefined);

        case 'DRIVER':
            return orderService.getOrdersForDriverByStatus(userData.userId, status);

        case 'CUSTOMER':
            return orderService.getOrdersByUserIdAndStatus(userData.userId, status);

        case 'BUSINESS_OWNER':
        case 'BUSINESS_EMPLOYEE':
            if (!userData.businessId) {
                throw new GraphQLError('Business user must be associated with a business', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            return orderService.getOrdersByBusinessIdAndStatus(userData.businessId, status);

        default:
            throw new GraphQLError('Invalid user role', {
                extensions: { code: 'FORBIDDEN' },
            });
    }
};
