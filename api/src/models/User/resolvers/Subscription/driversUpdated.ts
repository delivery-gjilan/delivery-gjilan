import type { SubscriptionResolvers } from './../../../../generated/types.generated';
import { pubsub, subscribe, topics } from '@/lib/pubsub';
import { DbUser } from '@/database/schema/users';

interface DriversUpdatedPayload {
  drivers: DbUser[];
}

export const driversUpdated: NonNullable<SubscriptionResolvers['driversUpdated']> = {
  subscribe: () => {
    return subscribe(pubsub, topics.allDriversChanged());
  },
  resolve: (payload: DriversUpdatedPayload) => {
    return payload.drivers;
  },
};