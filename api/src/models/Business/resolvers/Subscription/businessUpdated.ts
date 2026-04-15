import type { SubscriptionResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { isPlatformAdmin } from '@/lib/utils/permissions';
import { pubsub, subscribe, topics, type BusinessUpdatedPayload } from '@/lib/pubsub';

export const businessUpdated: NonNullable<SubscriptionResolvers['businessUpdated']> = {
    subscribe: (_parent, { id }, { userData }) => {
        if (!userData.userId || !userData.role) {
            throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
        }

        if (isPlatformAdmin(userData.role)) {
            return subscribe(pubsub, topics.businessUpdated(id));
        }

        if (
            (userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE') &&
            userData.businessId === id
        ) {
            return subscribe(pubsub, topics.businessUpdated(id));
        }

        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
    },
    resolve: async (payload: BusinessUpdatedPayload, _args, { businessService }) => {
        return businessService.getBusiness(payload.businessId);
    },
};