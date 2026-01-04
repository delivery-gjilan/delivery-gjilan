import { createPubSub } from 'graphql-yoga';
import { Order } from '@/generated/types.generated';

export type UserOrdersPayload = {
    userId: string;
    orders: Order[];
};

type PubSubPayloadMap = {
    'order.byId.updated': Order;
    'orders.byUser.changed': UserOrdersPayload;
};

type TopicKey<K extends keyof PubSubPayloadMap> = `${K}.${string}`;

type PubSubChannels = {
    [K in keyof PubSubPayloadMap as TopicKey<K>]: [payload: PubSubPayloadMap[K]];
};

export const pubsub = createPubSub<PubSubChannels>();

export type PubSub = typeof pubsub;

export const topics = {
    orderByIdUpdated: (orderId: string): TopicKey<'order.byId.updated'> => `order.byId.updated.${orderId}`,

    ordersByUserChanged: (userId: string): TopicKey<'orders.byUser.changed'> => `orders.byUser.changed.${userId}`,
} as const;

export function publish(p: PubSub, topic: TopicKey<'order.byId.updated'>, payload: Order): void;

export function publish(p: PubSub, topic: TopicKey<'orders.byUser.changed'>, payload: UserOrdersPayload): void;
export function publish(
    p: PubSub,
    topic: TopicKey<'order.byId.updated' | 'orders.byUser.changed'>,
    payload: Order | UserOrdersPayload,
): void;
export function publish(
    p: PubSub,
    topic: TopicKey<'order.byId.updated' | 'orders.byUser.changed'>,
    payload: Order | UserOrdersPayload,
) {
    // @ts-expect-error can fix it but with unnecessary complexity
    p.publish(topic, payload);
}

export function subscribe(p: PubSub, topic: TopicKey<'order.byId.updated'>): ReturnType<PubSub['subscribe']>;

export function subscribe(p: PubSub, topic: TopicKey<'orders.byUser.changed'>): ReturnType<PubSub['subscribe']>;

export function subscribe(p: PubSub, topic: TopicKey<'order.byId.updated' | 'orders.byUser.changed'>) {
    return p.subscribe(topic);
}
