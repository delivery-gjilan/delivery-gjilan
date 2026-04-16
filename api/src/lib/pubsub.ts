import { createPubSub } from 'graphql-yoga';
import { Order, User } from '@/generated/types.generated';
import { createClient, RedisClientType } from 'redis';
import logger from '@/lib/logger';
import { realtimeMonitor } from '@/lib/realtimeMonitoring';

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

export type OrderDriverLiveTrackingPayload = {
    orderId: string;
    driverId: string;
    latitude: number;
    longitude: number;
    navigationPhase?: string | null;
    remainingEtaSeconds?: number | null;
    etaUpdatedAt: string;
};

export type DriverPttSignalPayload = {
    driverId: string;
    adminId: string;
    channelName: string;
    action: 'STARTED' | 'STOPPED' | 'MUTE' | 'UNMUTE';
    muted: boolean;
    timestamp: Date;
};

export type AdminPttSignalPayload = {
    driverId: string;
    channelName: string;
    action: 'STARTED' | 'STOPPED' | 'MUTE' | 'UNMUTE';
    timestamp: Date;
};

export type StoreStatusPayload = {
    isStoreClosed: boolean;
    closedMessage?: string | null;
    bannerEnabled: boolean;
    bannerMessage?: string | null;
    bannerType: string;
    directDispatchEnabled?: boolean;
    directDispatchDriverReserve?: number;
};

export type BusinessUpdatedPayload = {
    businessId: string;
};

export type DriverMessagePayload = {
    id: string;
    adminId: string;
    driverId: string;
    senderRole: 'ADMIN' | 'DRIVER';
    body: string;
    alertType: 'INFO' | 'WARNING' | 'URGENT';
    readAt: string | null;
    createdAt: string;
};

export type BusinessMessagePayload = {
    id: string;
    adminId: string;
    businessUserId: string;
    senderRole: 'ADMIN' | 'BUSINESS';
    body: string;
    alertType: 'INFO' | 'WARNING' | 'URGENT';
    readAt: string | null;
    createdAt: string;
};

type PubSubPayloadMap = {
    'order.byId.updated': Order;
    'orders.byUser.changed': UserOrdersPayload;
    'orders.all.changed': AllOrdersPayload;
    'drivers.all.changed': DriversUpdatedPayload;
    'order.driver.live.changed': OrderDriverLiveTrackingPayload;
    'driver.ptt.signal': DriverPttSignalPayload;
    'admin.ptt.signal': AdminPttSignalPayload;
    'store.status.changed': StoreStatusPayload;
    'business.updated': BusinessUpdatedPayload;
    'driver.message': DriverMessagePayload;
    'admin.message': DriverMessagePayload;
    'admin.any.message': DriverMessagePayload;
    'business.message': BusinessMessagePayload;
    'admin.business.message': BusinessMessagePayload;
    'admin.any.business.message': BusinessMessagePayload;
};

type TopicKey<K extends keyof PubSubPayloadMap> = `${K}.${string}` | `${K}`;

type AnyTopicKey = TopicKey<'order.byId.updated' | 'orders.byUser.changed' | 'orders.all.changed' | 'drivers.all.changed' | 'order.driver.live.changed' | 'driver.ptt.signal' | 'admin.ptt.signal' | 'store.status.changed' | 'business.updated' | 'driver.message' | 'admin.message' | 'admin.any.message' | 'business.message' | 'admin.business.message' | 'admin.any.business.message'>;

type AnyPayload = Order | UserOrdersPayload | AllOrdersPayload | DriversUpdatedPayload | OrderDriverLiveTrackingPayload | DriverPttSignalPayload | AdminPttSignalPayload | StoreStatusPayload | BusinessUpdatedPayload | DriverMessagePayload | BusinessMessagePayload;

type PubSubChannels = {
    [K in keyof PubSubPayloadMap as TopicKey<K>]: [payload: PubSubPayloadMap[K]];
};
export const pubsub = createPubSub<PubSubChannels>();

export type PubSub = typeof pubsub;

const log = logger.child({ service: 'PubSubBridge' });
const REDIS_PUBSUB_CHANNEL = 'delivery:graphql:pubsub:v1';
const REDIS_PUBSUB_URL = process.env.REDIS_PUBSUB_URL || process.env.REDIS_URL || 'redis://localhost:6379';
const INSTANCE_ID = `${process.pid}-${Math.random().toString(36).slice(2, 10)}`;

let pubClient: RedisClientType | null = null;
let subClient: RedisClientType | null = null;
let bridgeEnabled = false;
let bridgeInitPromise: Promise<void> | null = null;

type BridgeMessage = {
    source: string;
    topic: AnyTopicKey;
    payload: AnyPayload;
};

async function connectBridgeClients(): Promise<void> {
    pubClient = createClient({
        url: REDIS_PUBSUB_URL,
        socket: {
            reconnectStrategy: false,
            connectTimeout: 3000,
        },
    }) as RedisClientType;

    subClient = pubClient.duplicate() as RedisClientType;

    pubClient.on('error', () => {});
    subClient.on('error', () => {});

    await pubClient.connect();
    await subClient.connect();

    await subClient.subscribe(REDIS_PUBSUB_CHANNEL, (raw) => {
        try {
            const msg = JSON.parse(raw) as BridgeMessage;

            // Ignore local echoes; this instance already published to in-memory pubsub.
            if (msg.source === INSTANCE_ID) {
                return;
            }

            // @ts-expect-error topic and payload are validated by producer contract.
            pubsub.publish(msg.topic, msg.payload);
        } catch (error) {
            log.warn({ err: error }, 'pubsubBridge:message:invalid');
        }
    });

    bridgeEnabled = true;
    log.info({ channel: REDIS_PUBSUB_CHANNEL }, 'pubsubBridge:enabled');
}

export async function initializePubSubRedisBridge(): Promise<void> {
    if (bridgeEnabled) {
        return;
    }

    if (bridgeInitPromise) {
        return bridgeInitPromise;
    }

    bridgeInitPromise = (async () => {
        try {
            await connectBridgeClients();
        } catch {
            // Fall back to in-memory pubsub for single-instance/dev setups.
            bridgeEnabled = false;
            pubClient = null;
            subClient = null;
            log.info('pubsubBridge:disabled:fallbackToInMemory');
        }
    })();

    try {
        await bridgeInitPromise;
    } finally {
        bridgeInitPromise = null;
    }
}

export async function shutdownPubSubRedisBridge(): Promise<void> {
    const currentSub = subClient;
    const currentPub = pubClient;

    bridgeEnabled = false;
    subClient = null;
    pubClient = null;

    try {
        if (currentSub) {
            await currentSub.unsubscribe(REDIS_PUBSUB_CHANNEL);
            await currentSub.quit();
        }
    } catch {
        // no-op
    }

    try {
        if (currentPub) {
            await currentPub.quit();
        }
    } catch {
        // no-op
    }

    log.info('pubsubBridge:stopped');
}

function bridgePublish(topic: AnyTopicKey, payload: AnyPayload): void {
    if (!bridgeEnabled || !pubClient) {
        return;
    }

    const message: BridgeMessage = {
        source: INSTANCE_ID,
        topic,
        payload,
    };

    pubClient.publish(REDIS_PUBSUB_CHANNEL, JSON.stringify(message)).catch((error) => {
        realtimeMonitor.recordPubsubPublishFailure(String(topic), 'Redis pubsub bridge publish failed');
        log.warn({ err: error, topic }, 'pubsubBridge:publish:failed');
    });
}

export const topics = {
    orderByIdUpdated: (orderId: string): TopicKey<'order.byId.updated'> => `order.byId.updated.${orderId}`,

    ordersByUserChanged: (userId: string): TopicKey<'orders.byUser.changed'> => `orders.byUser.changed.${userId}`,

    allOrdersChanged: (): TopicKey<'orders.all.changed'> => `orders.all.changed`,

    allDriversChanged: (): TopicKey<'drivers.all.changed'> => `drivers.all.changed`,

    orderDriverLiveChanged: (orderId: string): TopicKey<'order.driver.live.changed'> => `order.driver.live.changed.${orderId}`,

    driverPttSignal: (driverId: string): TopicKey<'driver.ptt.signal'> => `driver.ptt.signal.${driverId}`,

    /** Broadcast topic for driver→admin PTT signals (all admins subscribe to this single topic) */
    adminPttSignal: (): TopicKey<'admin.ptt.signal'> => 'admin.ptt.signal',

    storeStatusChanged: (): TopicKey<'store.status.changed'> => 'store.status.changed',

    businessUpdated: (businessId: string): TopicKey<'business.updated'> => `business.updated.${businessId}`,

    /** Message sent to a specific driver (driver subscribes to this) */
    driverMessage: (driverId: string): TopicKey<'driver.message'> => `driver.message.${driverId}`,

    /** Message/reply sent to an admin from a specific driver (admin subscribes to this) */
    adminMessage: (adminId: string, driverId: string): TopicKey<'admin.message'> => `admin.message.${adminId}.driver.${driverId}`,

    /** Broadcast topic for ALL driver messages (all admins subscribe to this single topic for global notifications) */
    adminAnyMessage: (): TopicKey<'admin.any.message'> => `admin.any.message`,

    /** Message sent to a specific business user (business subscribes to this) */
    businessMessage: (businessUserId: string): TopicKey<'business.message'> => `business.message.${businessUserId}`,

    /** Message/reply sent to an admin from a specific business user (admin subscribes to this) */
    adminBusinessMessage: (adminId: string, businessUserId: string): TopicKey<'admin.business.message'> => `admin.business.message.${adminId}.business.${businessUserId}`,

    /** Broadcast topic for ALL business messages (all admins subscribe to this single topic for global notifications) */
    adminAnyBusinessMessage: (): TopicKey<'admin.any.business.message'> => `admin.any.business.message`,
} as const;

export function publish(p: PubSub, topic: TopicKey<'order.byId.updated'>, payload: Order): void;

export function publish(p: PubSub, topic: TopicKey<'orders.byUser.changed'>, payload: UserOrdersPayload): void;
export function publish(p: PubSub, topic: TopicKey<'orders.all.changed'>, payload: AllOrdersPayload): void;
export function publish(p: PubSub, topic: TopicKey<'drivers.all.changed'>, payload: DriversUpdatedPayload): void;
export function publish(p: PubSub, topic: TopicKey<'order.driver.live.changed'>, payload: OrderDriverLiveTrackingPayload): void;
export function publish(p: PubSub, topic: TopicKey<'driver.ptt.signal'>, payload: DriverPttSignalPayload): void;
export function publish(p: PubSub, topic: TopicKey<'admin.ptt.signal'>, payload: AdminPttSignalPayload): void;
export function publish(p: PubSub, topic: TopicKey<'store.status.changed'>, payload: StoreStatusPayload): void;
export function publish(p: PubSub, topic: TopicKey<'business.updated'>, payload: BusinessUpdatedPayload): void;
export function publish(p: PubSub, topic: TopicKey<'driver.message'>, payload: DriverMessagePayload): void;
export function publish(p: PubSub, topic: TopicKey<'admin.message'>, payload: DriverMessagePayload): void;
export function publish(p: PubSub, topic: TopicKey<'admin.any.message'>, payload: DriverMessagePayload): void;
export function publish(p: PubSub, topic: TopicKey<'business.message'>, payload: BusinessMessagePayload): void;
export function publish(p: PubSub, topic: TopicKey<'admin.business.message'>, payload: BusinessMessagePayload): void;
export function publish(p: PubSub, topic: TopicKey<'admin.any.business.message'>, payload: BusinessMessagePayload): void;
export function publish(
    p: PubSub,
    topic: TopicKey<'order.byId.updated' | 'orders.byUser.changed' | 'orders.all.changed' | 'drivers.all.changed' | 'order.driver.live.changed' | 'driver.ptt.signal' | 'admin.ptt.signal' | 'store.status.changed' | 'business.updated' | 'driver.message' | 'admin.message' | 'admin.any.message' | 'business.message' | 'admin.business.message' | 'admin.any.business.message'>,
    payload: AnyPayload,
): void;
export function publish(
    p: PubSub,
    topic: TopicKey<'order.byId.updated' | 'orders.byUser.changed' | 'orders.all.changed' | 'drivers.all.changed' | 'order.driver.live.changed' | 'driver.ptt.signal' | 'admin.ptt.signal' | 'store.status.changed' | 'business.updated' | 'driver.message' | 'admin.message' | 'admin.any.message' | 'business.message' | 'admin.business.message' | 'admin.any.business.message'>,
    payload: AnyPayload,
) {
    // @ts-expect-error can fix it but with unnecessary complexity
    p.publish(topic, payload);
    realtimeMonitor.recordPubsubPublish(String(topic));
    bridgePublish(topic as AnyTopicKey, payload);
}

export function subscribe(p: PubSub, topic: TopicKey<'order.byId.updated'>): ReturnType<PubSub['subscribe']>;

export function subscribe(p: PubSub, topic: TopicKey<'orders.byUser.changed'>): ReturnType<PubSub['subscribe']>;

export function subscribe(p: PubSub, topic: TopicKey<'orders.all.changed'>): ReturnType<PubSub['subscribe']>;

export function subscribe(p: PubSub, topic: TopicKey<'drivers.all.changed'>): ReturnType<PubSub['subscribe']>;
export function subscribe(p: PubSub, topic: TopicKey<'order.driver.live.changed'>): ReturnType<PubSub['subscribe']>;
export function subscribe(p: PubSub, topic: TopicKey<'driver.ptt.signal'>): ReturnType<PubSub['subscribe']>;
export function subscribe(p: PubSub, topic: TopicKey<'admin.ptt.signal'>): ReturnType<PubSub['subscribe']>;
export function subscribe(p: PubSub, topic: TopicKey<'store.status.changed'>): ReturnType<PubSub['subscribe']>;
export function subscribe(p: PubSub, topic: TopicKey<'business.updated'>): ReturnType<PubSub['subscribe']>;
export function subscribe(p: PubSub, topic: TopicKey<'driver.message'>): ReturnType<PubSub['subscribe']>;
export function subscribe(p: PubSub, topic: TopicKey<'admin.message'>): ReturnType<PubSub['subscribe']>;
export function subscribe(p: PubSub, topic: TopicKey<'admin.any.message'>): ReturnType<PubSub['subscribe']>;
export function subscribe(p: PubSub, topic: TopicKey<'business.message'>): ReturnType<PubSub['subscribe']>;
export function subscribe(p: PubSub, topic: TopicKey<'admin.business.message'>): ReturnType<PubSub['subscribe']>;
export function subscribe(p: PubSub, topic: TopicKey<'admin.any.business.message'>): ReturnType<PubSub['subscribe']>;

export function subscribe(p: PubSub, topic: TopicKey<'order.byId.updated' | 'orders.byUser.changed' | 'orders.all.changed' | 'drivers.all.changed' | 'order.driver.live.changed' | 'driver.ptt.signal' | 'admin.ptt.signal' | 'store.status.changed' | 'business.updated' | 'driver.message' | 'admin.message' | 'admin.any.message' | 'business.message' | 'admin.business.message' | 'admin.any.business.message'>) {
    return p.subscribe(topic);
}
