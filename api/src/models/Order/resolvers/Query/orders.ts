import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { adjustBusinessInventoryQuantities } from '@/services/order/adjustBusinessInventoryQuantities';

export const orders: NonNullable<QueryResolvers['orders']> = async (_parent, { limit, offset, statuses, startDate, endDate }, { orderService, userData, db }) => {
    if (!userData.userId) {
        throw new GraphQLError('Unauthorized: You must be logged in to view orders', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    const effectiveLimit = limit ?? 100;
    const effectiveOffset = offset ?? 0;

    switch (userData.role) {
        case 'SUPER_ADMIN':
        case 'ADMIN':
            return orderService.getOrdersPaginated(effectiveLimit, effectiveOffset, statuses ?? undefined, startDate ?? undefined, endDate ?? undefined);

        case 'DRIVER': {
            const orders = await orderService.getOrdersForDriver(userData.userId, effectiveLimit);
            return { orders, totalCount: orders.length, hasMore: false };
        }

        case 'CUSTOMER': {
            const orders = await orderService.getOrdersByUserId(userData.userId, effectiveLimit, effectiveOffset);
            return { orders, totalCount: orders.length, hasMore: orders.length === effectiveLimit };
        }

        case 'BUSINESS_OWNER':
        case 'BUSINESS_EMPLOYEE': {
            if (!userData.businessId) {
                throw new GraphQLError('Business user must be associated with a business', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            const orders = await orderService.getOrdersByBusinessId(userData.businessId);
            const adjusted = await adjustBusinessInventoryQuantities(db, orders, userData.businessId);
            return { orders: adjusted, totalCount: adjusted.length, hasMore: false };
        }

        default:
            throw new GraphQLError('Invalid user role', {
                extensions: { code: 'FORBIDDEN' },
            });
    }
};
