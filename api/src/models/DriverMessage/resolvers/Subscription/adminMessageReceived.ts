import type   { SubscriptionResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { pubsub, subscribe, topics } from '@/lib/pubsub';
import type { DriverMessagePayload } from '@/lib/pubsub';

export const adminMessageReceived: NonNullable<SubscriptionResolvers['adminMessageReceived']> = {
    subscribe: (_parent: unknown, { driverId }: { driverId: string }, context: any) => {
        const { userData } = context;
        if (!userData?.userId) {
            throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
        }
        const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN';
        if (!isAdmin) {
            throw new GraphQLError('Forbidden — only admins can subscribe to this', { extensions: { code: 'FORBIDDEN' } });
        }
        return subscribe(pubsub, topics.adminMessage(userData.userId, driverId));
    },
    resolve: (payload: DriverMessagePayload) => payload,
};
