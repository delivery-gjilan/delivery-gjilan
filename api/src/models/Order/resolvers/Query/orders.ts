import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const orders: NonNullable<QueryResolvers['orders']> = async (_parent, _args, { orderService, userData }) => {
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized: You must be logged in to view orders', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    switch (userData.role) {
        case 'SUPER_ADMIN':
        case 'ADMIN':
            return orderService.getAllOrders();

        case 'DRIVER':
            return orderService.getOrdersForDriver(userData.userId);

        case 'CUSTOMER':
            return orderService.getOrdersByUserId(userData.userId);

        case 'BUSINESS_OWNER':
        case 'BUSINESS_EMPLOYEE':
            if (!userData.businessId) {
                throw new GraphQLError('Business user must be associated with a business', {
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
