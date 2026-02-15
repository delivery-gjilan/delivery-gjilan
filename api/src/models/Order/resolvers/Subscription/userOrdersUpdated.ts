import { UserOrdersPayload } from '@/lib/pubsub';
import type { SubscriptionResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
export const userOrdersUpdated: NonNullable<SubscriptionResolvers['userOrdersUpdated']> = {
    subscribe: async (_parent, { input }, { authService, orderService }) => {
        const token = input.token;
        const userData = await authService.verifyJWT(token);
        if (!userData) {
            throw new GraphQLError('Authentication failed');
        }
        return orderService.subscribeToOrderUpdates(userData.id);
    },
    resolve: (payload: UserOrdersPayload) => {
        return payload.orders;
    },
};
