import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const businessOrderFinancials: NonNullable<QueryResolvers['businessOrderFinancials']> = async (
    _parent,
    { orderId, businessId },
    { orderService, userData },
) => {
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized: You must be logged in', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    // Business users can only query their own business; admins can query any
    if (userData.role === 'BUSINESS') {
        if (userData.businessId !== businessId) {
            throw new GraphQLError('Forbidden: You can only view your own business financials', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    } else if (userData.role !== 'SUPER_ADMIN' && userData.role !== 'ADMIN') {
        throw new GraphQLError('Forbidden: Only business users and admins can access business financials', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    return orderService.getBusinessOrderFinancials(orderId, businessId);
};
