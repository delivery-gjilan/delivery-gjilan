import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const orders: NonNullable<QueryResolvers['orders']> = async (_parent, _args, { orderService, userData }) => {
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized: You must be logged in to view orders', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    const allOrders = await orderService.getAllOrders();

    switch (userData.role) {
        case 'SUPER_ADMIN':
            return allOrders;

        case 'DRIVER':
            // Drivers see their own assigned orders + all active (pickable) orders
            return allOrders.filter(order =>
                order.driver?.id === userData.userId ||
                !['DELIVERED', 'CANCELLED'].includes(order.status)
            );

        case 'CUSTOMER':
            return allOrders.filter(order => order.userId === userData.userId);

        case 'BUSINESS_ADMIN':
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
