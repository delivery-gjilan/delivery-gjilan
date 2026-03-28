import type   { SubscriptionResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { pubsub, subscribe, topics } from '@/lib/pubsub';
import type { DriverMessagePayload } from '@/lib/pubsub';

export const driverMessageReceived: NonNullable<SubscriptionResolvers['driverMessageReceived']> = {
    subscribe: (_parent: unknown, _args: unknown, context: any) => {
        const { userData } = context;
        if (!userData?.userId) {
            throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
        }
        if (userData.role !== 'DRIVER') {
            throw new GraphQLError('Forbidden — only drivers can subscribe to this', { extensions: { code: 'FORBIDDEN' } });
        }
        return subscribe(pubsub, topics.driverMessage(userData.userId));
    },
    resolve: (payload: DriverMessagePayload) => payload,
};
