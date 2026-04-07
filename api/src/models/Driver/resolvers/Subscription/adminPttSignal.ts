import type { SubscriptionResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { pubsub, publish, subscribe, topics, type AdminPttSignalPayload } from '@/lib/pubsub';

export const adminPttSignal: NonNullable<SubscriptionResolvers['adminPttSignal']> = {
  subscribe: (_parent, _arg, { userData }) => {
    if (!userData.userId) {
      throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
    }

    const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN' || userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE';
    if (!isAdmin) {
      throw new GraphQLError('Only admins can subscribe to driver PTT signals', { extensions: { code: 'FORBIDDEN' } });
    }

    return subscribe(pubsub, topics.adminPttSignal());
  },
  resolve: (payload: AdminPttSignalPayload) => payload,
};

export const publishAdminPttSignal = (payload: AdminPttSignalPayload): void => {
  publish(pubsub, topics.adminPttSignal(), payload);
};