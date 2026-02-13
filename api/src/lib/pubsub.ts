import { createPubSub } from 'graphql-yoga';
import { Order, User } from '@/generated/types.generated';

export type UserOrdersPayload = {
    userId: string;
    orders: Order[];
};

export type AllOrdersPayload = {
    orders: Order[];
};

export type DriversUpdatedPayload = {
    drivers: User[];
};

type PubSubPayloadMap = {
    'order.byId.updated': Order;
    'orders.byUser.changed': UserOrdersPayload;
    'orders.all.changed': AllOrdersPayload;
    'drivers.all.changed': DriversUpdatedPayload;
};

type TopicKey<K extends keyof PubSubPayloadMap> = `${K}.${string}` | `${K}`;

type PubSubChannels = {
    [K in keyof PubSubPayloadMap as TopicKey<K>]: [payload: PubSubPayloadMap[K]];
};

export const pubsub = createPubSub<PubSubChannels>();

export type PubSub = typeof pubsub;

export const topics = {
    orderByIdUpdated: (orderId: string): TopicKey<'order.byId.updated'> => `order.byId.updated.${orderId}`,

    ordersByUserChanged: (userId: string): TopicKey<'orders.byUser.changed'> => `orders.byUser.changed.${userId}`,

    allOrdersChanged: (): TopicKey<'orders.all.changed'> => `orders.all.changed`,

    allDriversChanged: (): TopicKey<'drivers.all.changed'> => `drivers.all.changed`,
} as const;

export function publish(p: PubSub, topic: TopicKey<'order.byId.updated'>, payload: Order): void;

export function publish(p: PubSub, topic: TopicKey<'orders.byUser.changed'>, payload: UserOrdersPayload): void;
export function publish(p: PubSub, topic: TopicKey<'orders.all.changed'>, payload: AllOrdersPayload): void;
export function publish(p: PubSub, topic: TopicKey<'drivers.all.changed'>, payload: DriversUpdatedPayload): void;
export function publish(
    p: PubSub,
    topic: TopicKey<'order.byId.updated' | 'orders.byUser.changed' | 'orders.all.changed' | 'drivers.all.changed'>,
    payload: Order | UserOrdersPayload | AllOrdersPayload | DriversUpdatedPayload,
): void;
export function publish(
    p: PubSub,
    topic: TopicKey<'order.byId.updated' | 'orders.byUser.changed' | 'orders.all.changed' | 'drivers.all.changed'>,
    payload: Order | UserOrdersPayload | AllOrdersPayload | DriversUpdatedPayload,
) {
    // @ts-expect-error can fix it but with unnecessary complexity
    p.publish(topic, payload);
}

export function subscribe(p: PubSub, topic: TopicKey<'order.byId.updated'>): ReturnType<PubSub['subscribe']>;

export function subscribe(p: PubSub, topic: TopicKey<'orders.byUser.changed'>): ReturnType<PubSub['subscribe']>;

export function subscribe(p: PubSub, topic: TopicKey<'orders.all.changed'>): ReturnType<PubSub['subscribe']>;

export function subscribe(p: PubSub, topic: TopicKey<'drivers.all.changed'>): ReturnType<PubSub['subscribe']>;

export function subscribe(p: PubSub, topic: TopicKey<'order.byId.updated' | 'orders.byUser.changed' | 'orders.all.changed' | 'drivers.all.changed'>) {
    return p.subscribe(topic);
}
