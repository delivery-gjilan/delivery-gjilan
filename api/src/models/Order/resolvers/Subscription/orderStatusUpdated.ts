import { subscribe, topics } from '@/lib/pubsub';
import { GraphQLError } from 'graphql';
import type { SubscriptionResolvers, Order } from './../../../../generated/types.generated';

export const orderStatusUpdated: NonNullable<SubscriptionResolvers['orderStatusUpdated']> = {
    subscribe: async (_parent, { orderId }, { pubsub, userData, orderService }) => {
        if (!userData.userId) {
            throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
        }

        const order = await orderService.orderRepository.findById(orderId);
        if (!order) {
            throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
        }

        const isAdmin = userData.role === 'SUPER_ADMIN';
        const isDriver = userData.role === 'DRIVER' && order.driverId === userData.userId;
        const isCustomer = userData.role === 'CUSTOMER' && order.userId === userData.userId;

        let isBusinessAdmin = false;
        if ((userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE') && userData.businessId) {
            isBusinessAdmin = await orderService.orderContainsBusiness(orderId, userData.businessId);
        }

        if (!isAdmin && !isDriver && !isCustomer && !isBusinessAdmin) {
            throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
        }

        return subscribe(pubsub, topics.orderByIdUpdated(orderId));
    },
    resolve: (payload: Order) => {
        return payload;
    },
};
