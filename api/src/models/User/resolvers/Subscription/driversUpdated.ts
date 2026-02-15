import type { SubscriptionResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { pubsub, subscribe, topics } from '@/lib/pubsub';
import { DbUser } from '@/database/schema/users';

interface DriversUpdatedPayload {
  drivers: DbUser[];
}

export const driversUpdated: NonNullable<SubscriptionResolvers['driversUpdated']> = {
  subscribe: (_parent, _args, { userData }) => {
    if (!userData.userId) {
      throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
    }

    if (userData.role !== 'SUPER_ADMIN' && userData.role !== 'BUSINESS_ADMIN') {
      throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
    }

    return subscribe(pubsub, topics.allDriversChanged());
  },
  resolve: (payload: DriversUpdatedPayload) => {
    return payload.drivers;
  },
};