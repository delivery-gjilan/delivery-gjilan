import type { SubscriptionResolvers, Order } from './../../../../generated/types.generated';

export const orderStatusUpdated: NonNullable<SubscriptionResolvers['orderStatusUpdated']> = {
    subscribe: (_parent, { orderId }, { pubsub }) => {
        return pubsub.subscribe(`orderStatusUpdated:${orderId}`);
    },
    resolve: (payload: Order) => {
        return payload;
    },
};
