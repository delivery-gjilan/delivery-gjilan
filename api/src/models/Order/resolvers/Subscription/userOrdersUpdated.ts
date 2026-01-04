import { UserOrdersPayload } from '@/lib/pubsub';
import type { SubscriptionResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
export const userOrdersUpdated: NonNullable<SubscriptionResolvers['userOrdersUpdated']> = {
    subscribe: async (_parent, { input }, { authService, orderService }) => {
        const token = input.token;
        const userData = await authService.verifyJWT(token);
        if (!userData) {
            throw new GraphQLError('Fix error, Authentication');
        }
        console.log('hej more zor', userData);
        return orderService.subscribeToOrderUpdates(userData.id);
    },
    resolve: (payload: UserOrdersPayload) => {
        console.log('payload', payload);
        return payload.orders;
    },
};
