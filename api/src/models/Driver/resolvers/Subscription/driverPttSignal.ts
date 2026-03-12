
import type { SubscriptionResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { pubsub, publish, subscribe, topics } from '@/lib/pubsub';

export type DriverPttPayload = {
  driverId: string;
  adminId: string;
  channelName: string;
  action: 'STARTED' | 'STOPPED' | 'MUTE' | 'UNMUTE';
  muted: boolean;
  timestamp: Date;
};

export const driverPttSignal: NonNullable<SubscriptionResolvers['driverPttSignal']> = {
  subscribe: (_parent, { driverId }, { userData }) => {
    if (!userData.userId) {
      throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
    }

    const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN' || userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE';
    const isSelf = userData.userId === driverId;

    if (!isAdmin && !isSelf) {
      throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
    }

    return subscribe(pubsub, topics.driverPttSignal(driverId));
  },
  resolve: (payload: DriverPttPayload) => payload,
};

export const publishDriverPttSignal = (driverId: string, payload: DriverPttPayload): void => {
  publish(pubsub, topics.driverPttSignal(driverId), payload);
};