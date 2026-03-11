
    import { subscribe, topics, type OrderDriverLiveTrackingPayload } from '@/lib/pubsub';
    import { GraphQLError } from 'graphql';
    import type { SubscriptionResolvers } from './../../../../generated/types.generated';

    export const orderDriverLiveTracking: NonNullable<SubscriptionResolvers['orderDriverLiveTracking']> = {
      subscribe: async (_parent, { orderId, input }, { authService, orderService, pubsub }) => {
        const token = input.token;
        const userData = await authService.verifyJWT(token);
        if (!userData) {
          throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
        }

        const order = await orderService.orderRepository.findById(orderId);
        if (!order) {
          throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
        }

        const isAdmin = userData.role === 'SUPER_ADMIN';
        const isDriver = userData.role === 'DRIVER' && order.driverId === userData.id;
        const isCustomer = userData.role === 'CUSTOMER' && order.userId === userData.id;

        let isBusinessAdmin = false;
        if ((userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE') && userData.businessId) {
          isBusinessAdmin = await orderService.orderContainsBusiness(orderId, userData.businessId);
        }

        if (!isAdmin && !isDriver && !isCustomer && !isBusinessAdmin) {
          throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
        }

        return subscribe(pubsub, topics.orderDriverLiveChanged(orderId));
      },
      resolve: (payload: OrderDriverLiveTrackingPayload) => {
        return payload;
      },
    };