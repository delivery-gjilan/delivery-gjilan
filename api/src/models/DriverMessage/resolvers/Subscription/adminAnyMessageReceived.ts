import type { SubscriptionResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { pubsub, subscribe, topics } from '@/lib/pubsub';
import type { DriverMessagePayload } from '@/lib/pubsub';

export const adminAnyMessageReceived: NonNullable<SubscriptionResolvers['adminAnyMessageReceived']> = {
    subscribe: (_parent: unknown, _args: unknown, context: any) => {
        const { userData } = context;
        if (!userData?.userId) {
            throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
        }
        const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN';
        if (!isAdmin) {
            throw new GraphQLError('Forbidden — only admins can subscribe to this', { extensions: { code: 'FORBIDDEN' } });
        }
        // Subscribe to global broadcast topic — all admins get all messages
        return subscribe(pubsub, topics.adminAnyMessage());
    },
    resolve: (payload: DriverMessagePayload) => payload,
};
