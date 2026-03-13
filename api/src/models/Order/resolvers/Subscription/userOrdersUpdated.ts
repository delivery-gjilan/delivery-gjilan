import { UserOrdersPayload } from '@/lib/pubsub';
import type { SubscriptionResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';
export const userOrdersUpdated: NonNullable<SubscriptionResolvers['userOrdersUpdated']> = {
    subscribe: async (_parent, _args, { orderService, userData }) => {
        const contextUserId = userData?.userId;
        if (contextUserId) {
            return orderService.subscribeToOrderUpdates(contextUserId);
        }

        throw AppError.unauthorized('Authentication failed');
    },
    resolve: (payload: UserOrdersPayload) => {
        return payload.orders;
    },
};
