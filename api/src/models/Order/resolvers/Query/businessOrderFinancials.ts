import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { isBusinessRole, isPlatformAdmin } from '../../../../lib/utils/permissions';

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
    if (isBusinessRole(userData.role)) {
        if (userData.businessId !== businessId) {
            throw new GraphQLError('Forbidden: You can only view your own business financials', {
                extensions: { code: 'FORBIDDEN' },
            });
        }
    } else if (!isPlatformAdmin(userData.role)) {
        throw new GraphQLError('Forbidden: Only business users and admins can access business financials', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    return orderService.getBusinessOrderFinancials(orderId, businessId);
};
