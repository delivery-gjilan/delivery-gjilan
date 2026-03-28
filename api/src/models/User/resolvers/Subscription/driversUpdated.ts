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

    if (userData.role !== 'SUPER_ADMIN' && userData.role !== 'BUSINESS_OWNER' && userData.role !== 'BUSINESS_EMPLOYEE') {
      throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
    }

    return subscribe(pubsub, topics.allDriversChanged());
  },
  resolve: (payload: DriversUpdatedPayload, _args: unknown, context: any) => {
    // DataLoaders cache per subscription lifetime. Clear cached entries so
    // field resolvers (driverLocation, driverLocationUpdatedAt) fetch fresh
    // coordinates from the DB on every event instead of returning stale data.
    if (context?.loaders?.driverByUserIdLoader) {
      for (const driver of payload.drivers) {
        context.loaders.driverByUserIdLoader.clear(String(driver.id));
      }
    }
    return payload.drivers;
  },
};