import type { SubscriptionResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { pubsub, subscribe, topics } from '@/lib/pubsub';
import type { BusinessMessagePayload } from '@/lib/pubsub';

export const businessMessageReceived: NonNullable<SubscriptionResolvers['businessMessageReceived']> = {
    subscribe: (_parent: unknown, _args: unknown, context: any) => {
        const { userData } = context;
        if (!userData?.userId) {
            throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
        }
        const isBusinessUser =
            userData.role === 'BUSINESS_OWNER' ||
            userData.role === 'BUSINESS_EMPLOYEE';
        if (!isBusinessUser) {
            throw new GraphQLError('Forbidden — only business users can subscribe to this', { extensions: { code: 'FORBIDDEN' } });
        }
        return subscribe(pubsub, topics.businessMessage(userData.userId));
    },
    resolve: (payload: BusinessMessagePayload) => payload,
};
