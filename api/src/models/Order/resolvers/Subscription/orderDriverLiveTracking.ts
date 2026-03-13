
    import { subscribe, topics, type OrderDriverLiveTrackingPayload } from '@/lib/pubsub';
    import { GraphQLError } from 'graphql';
    import type { SubscriptionResolvers } from './../../../../generated/types.generated';

    export const orderDriverLiveTracking: NonNullable<SubscriptionResolvers['orderDriverLiveTracking']> = {
      subscribe: async (_parent, { orderId }, { orderService, pubsub, userData }) => {
        const contextUserId = userData?.userId;
        const contextRole = userData?.role;
        const contextBusinessId = userData?.businessId;

        let effectiveUserId = contextUserId;
        let effectiveRole = contextRole;
        let effectiveBusinessId = contextBusinessId;

        if (!effectiveUserId || !effectiveRole) {
          throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
        }

        const order = await orderService.orderRepository.findById(orderId);
        if (!order) {
          throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
        }

        const isAdmin = effectiveRole === 'SUPER_ADMIN';
        const isDriver = effectiveRole === 'DRIVER' && order.driverId === effectiveUserId;
        const isCustomer = effectiveRole === 'CUSTOMER' && order.userId === effectiveUserId;

        let isBusinessAdmin = false;
        if ((effectiveRole === 'BUSINESS_OWNER' || effectiveRole === 'BUSINESS_EMPLOYEE') && effectiveBusinessId) {
          isBusinessAdmin = await orderService.orderContainsBusiness(orderId, effectiveBusinessId);
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