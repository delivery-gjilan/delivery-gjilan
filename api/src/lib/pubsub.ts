import { createPubSub } from 'graphql-yoga';
import { Order } from '@/generated/types.generated';

export type PubSubChannels = {
    [key: string]: [payload: Order];
};

export const pubsub = createPubSub<PubSubChannels>();

export type PubSub = typeof pubsub;
