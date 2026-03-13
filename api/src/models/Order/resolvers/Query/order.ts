import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import logger from '@/lib/logger';

const log = logger.child({ resolver: 'orderQuery' });

export const order: NonNullable<QueryResolvers['order']> = async (_parent, { id }, { orderService, userData }) => {
    log.info({ orderId: id, requesterId: userData.userId, role: userData.role }, 'order:query:requested');

    // Check authentication
    if (!userData.userId) {
        log.warn({ orderId: id }, 'order:query:unauthorized-no-user');
        throw new GraphQLError('Unauthorized: You must be logged in to view orders', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    const dbOrder = await orderService.orderRepository.findById(id);

    if (!dbOrder) {
        log.warn({ orderId: id, requesterId: userData.userId, role: userData.role }, 'order:query:not-found');
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
                log.warn({ orderId: id, requesterId: userData.userId, orderUserId: dbOrder.userId }, 'order:query:forbidden-customer');
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
                log.warn({ orderId: id, requesterId: userData.userId, businessId: userData.businessId }, 'order:query:forbidden-business');
                throw new GraphQLError('Forbidden: You can only view orders from your business', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            break;

        default:
            log.warn({ orderId: id, requesterId: userData.userId, role: userData.role }, 'order:query:forbidden-invalid-role');
            throw new GraphQLError('Invalid user role', {
                extensions: { code: 'FORBIDDEN' },
            });
    }

    log.info({ orderId: id, requesterId: userData.userId, role: userData.role, status: dbOrder.status }, 'order:query:success');

    // Authorization passed, now map and return the order
    return orderService.mapToOrderPublic(dbOrder);
};
