import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const driverOrderFinancials: NonNullable<QueryResolvers['driverOrderFinancials']> = async (
    _parent,
    { orderId },
    { orderService, userData },
) => {
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized: You must be logged in', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    if (userData.role !== 'DRIVER' && userData.role !== 'SUPER_ADMIN' && userData.role !== 'ADMIN') {
        throw new GraphQLError('Forbidden: Only drivers and admins can access order financials', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    // For a driver, scope to their own orders; admins can query any order's driver financials
    const driverIdToQuery =
        userData.role === 'DRIVER' ? userData.userId : null;

    // If admin queries, fetch the order to get the actual driver id
    if (driverIdToQuery === null) {
        const order = await orderService.orderRepository.findById(orderId);
        if (!order) return null;
        if (!order.driverId) return null;
        return orderService.getDriverOrderFinancials(orderId, order.driverId);
    }

    return orderService.getDriverOrderFinancials(orderId, driverIdToQuery);
};
