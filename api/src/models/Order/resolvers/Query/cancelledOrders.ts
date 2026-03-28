import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const cancelledOrders: NonNullable<QueryResolvers['cancelledOrders']> = async (
    _parent,
    { limit, offset },
    { orderService, userData },
) => {
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    if (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only admins can view all cancelled orders', { extensions: { code: 'FORBIDDEN' } });
    }

    return orderService.getOrdersByStatus('CANCELLED', limit ?? undefined, offset ?? undefined);
};
