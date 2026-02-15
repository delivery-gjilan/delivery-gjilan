import type { SubscriptionResolvers, DriverConnection } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { pubsub, subscribe } from '@/lib/pubsub';

// Create a topic key for per-driver connection status changes
type PerDriverConnectionStatusTopic = `driver.${string}.connectionStatus.changed`;

const createDriverConnectionStatusTopic = (driverId: string): PerDriverConnectionStatusTopic => {
  return `driver.${driverId}.connectionStatus.changed` as PerDriverConnectionStatusTopic;
};

/**
 * Per-driver connection status subscription
 * 
 * Allows front-end to subscribe to granular connection status changes
 * for a specific driver instead of all driver updates.
 * 
 * Useful for:
 * - Driver's own connection status monitoring
 * - Per-driver status widgets
 * - Detailed driver tracking in admin dashboard
 */
export const driverConnectionStatusChanged: NonNullable<
  SubscriptionResolvers['driverConnectionStatusChanged']
> = {
  subscribe: (_parent, { driverId }, { userData }) => {
    if (!userData.userId) {
      throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
    }

    const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'BUSINESS_ADMIN';
    const isSelf = userData.userId === driverId;

    if (!isAdmin && !isSelf) {
      throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
    }

    const topic = createDriverConnectionStatusTopic(driverId);
    return subscribe(pubsub, topic as any);
  },
  resolve: (payload: DriverConnection) => {
    return payload;
  },
};

// Helper export for publishing to this subscription
export const publishDriverConnectionStatusChange = (
  driverId: string,
  connectionData: any
) => {
  const topic = createDriverConnectionStatusTopic(driverId);
  pubsub.publish(topic as any, connectionData);
};
