import { subscribe, topics } from '@/lib/pubsub';
import type { SubscriptionResolvers, Order } from './../../../../generated/types.generated';

export const orderStatusUpdated: NonNullable<SubscriptionResolvers['orderStatusUpdated']> = {
    subscribe: (_parent, { orderId }, { pubsub }) => {
        return subscribe(pubsub, topics.orderByIdUpdated(orderId));
    },
    resolve: (payload: Order) => {
        return payload;
    },
};
