/**
 * Unit tests for the pubsub module.
 *
 * Two separate concerns are tested here:
 *
 * A) topics.* helpers — pure functions, completely deterministic.
 *    Verifies every helper produces the correct namespaced string and that
 *    per-entity keys stay isolated from one another.
 *
 * B) publish ↔ subscribe round-trip — uses the real in-memory graphql-yoga
 *    PubSub instance (no Redis/network required).  The Redis bridge is never
 *    initialised so bridgePublish() is a silent no-op throughout.
 *    realtimeMonitoring is mocked to avoid prom-client side-effects.
 *
 *    Pattern:
 *      1. Subscribe to a topic → get an AsyncIterator
 *      2. Publish a payload on that topic
 *      3. Pull one value from the iterator and assert it matches the payload
 */
import { describe, it, expect, vi } from 'vitest';

// ── Silence prom-client / monitoring side-effects ────────────────────────────
vi.mock('@/lib/realtimeMonitoring', () => ({
    realtimeMonitor: { recordPubsubPublish: vi.fn() },
}));

// ── Silence logger ────────────────────────────────────────────────────────────
vi.mock('@/lib/logger', () => ({
    default: { child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));

// ── Redis is never connected, so bridge is disabled (no mock needed) ─────────
vi.mock('redis', () => ({
    createClient: vi.fn(() => ({
        on: vi.fn(),
        connect: vi.fn().mockRejectedValue(new Error('redis not available')),
        duplicate: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        publish: vi.fn(),
        quit: vi.fn(),
    })),
}));

import { topics, pubsub, publish, subscribe } from '@/lib/pubsub';

// ──────────────────────────────────────────────────────────────────────────────
// A) topics.* key helpers
// ──────────────────────────────────────────────────────────────────────────────

describe('topics.orderByIdUpdated', () => {
    it('embeds the orderId in the topic key', () => {
        expect(topics.orderByIdUpdated('order-1')).toBe('order.byId.updated.order-1');
    });

    it('different orderIds produce different keys', () => {
        expect(topics.orderByIdUpdated('a')).not.toBe(topics.orderByIdUpdated('b'));
    });
});

describe('topics.ordersByUserChanged', () => {
    it('embeds the userId in the topic key', () => {
        expect(topics.ordersByUserChanged('user-1')).toBe('orders.byUser.changed.user-1');
    });
});

describe('topics.allOrdersChanged', () => {
    it('returns the global orders topic', () => {
        expect(topics.allOrdersChanged()).toBe('orders.all.changed');
    });
});

describe('topics.allDriversChanged', () => {
    it('returns the global drivers topic', () => {
        expect(topics.allDriversChanged()).toBe('drivers.all.changed');
    });
});

describe('topics.orderDriverLiveChanged', () => {
    it('embeds the orderId', () => {
        expect(topics.orderDriverLiveChanged('order-abc')).toBe('order.driver.live.changed.order-abc');
    });
});

describe('topics.driverPttSignal', () => {
    it('embeds the driverId', () => {
        expect(topics.driverPttSignal('driver-5')).toBe('driver.ptt.signal.driver-5');
    });
});

describe('topics.storeStatusChanged', () => {
    it('returns the global store status topic', () => {
        expect(topics.storeStatusChanged()).toBe('store.status.changed');
    });
});

describe('topics.driverMessage', () => {
    it('embeds the driverId', () => {
        expect(topics.driverMessage('drv-1')).toBe('driver.message.drv-1');
    });
});

describe('topics.adminMessage', () => {
    it('includes both adminId and driverId separated by a stable separator', () => {
        const key = topics.adminMessage('admin-1', 'drv-1');
        expect(key).toContain('admin-1');
        expect(key).toContain('drv-1');
        // Different (adminId, driverId) combos must not collide
        expect(topics.adminMessage('admin-1', 'drv-2')).not.toBe(topics.adminMessage('admin-1', 'drv-1'));
        expect(topics.adminMessage('admin-2', 'drv-1')).not.toBe(topics.adminMessage('admin-1', 'drv-1'));
    });
});

describe('topics.businessMessage', () => {
    it('embeds the businessUserId', () => {
        expect(topics.businessMessage('biz-user-7')).toBe('business.message.biz-user-7');
    });
});

describe('topics.adminBusinessMessage', () => {
    it('includes both adminId and businessUserId', () => {
        const key = topics.adminBusinessMessage('admin-x', 'biz-y');
        expect(key).toContain('admin-x');
        expect(key).toContain('biz-y');
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// B) publish ↔ subscribe round-trips (in-memory, no Redis)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * graphql-yoga's createPubSub uses a Repeater-based AsyncGenerator.
 * The generator only starts buffering events AFTER iter.next() has been called
 * (i.e., the generator is actively "pulling").
 *
 * Correct pattern:
 *   1. Get iter
 *   2. Call iter.next() → returns a Promise (do NOT await yet)
 *   3. Call publish()  → wakes up the waiting next()
 *   4. Await the Promise  → receives the value
 *
 * For the "should NOT deliver" case we flip it: publish first, then next()
 * with a short timeout — confirms no buffering of pre-subscription events.
 */

/** Await a pending next() with a timeout guard. */
async function awaitNext<T>(pending: Promise<IteratorResult<T>>, timeoutMs = 500): Promise<T> {
    return Promise.race([
        pending.then((r) => r.value as T),
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('pubsub: timed out waiting for next value')), timeoutMs),
        ),
    ]);
}

describe('publish + subscribe round-trips', () => {
    it('delivers an allDriversChanged payload to a subscriber', async () => {
        const PAYLOAD = { drivers: [{ id: 'drv-1' } as Record<string, unknown>] };
        const iter = subscribe(pubsub, topics.allDriversChanged())[Symbol.asyncIterator]();

        const pending = iter.next();          // ← start waiting first
        publish(pubsub, topics.allDriversChanged(), PAYLOAD);

        expect(await awaitNext(pending)).toEqual(PAYLOAD);
    });

    it('delivers an ordersByUser payload to the correct per-user subscriber', async () => {
        const PAYLOAD = { userId: 'user-42', orders: [] };
        const topic = topics.ordersByUserChanged('user-42');
        const iter = subscribe(pubsub, topic)[Symbol.asyncIterator]();

        const pending = iter.next();
        publish(pubsub, topic, PAYLOAD);

        expect(await awaitNext(pending)).toEqual(PAYLOAD);
    });

    it('does NOT deliver a pre-subscription publish to a late subscriber', async () => {
        // Publish BEFORE subscribing — value should not be received
        const topic = topics.ordersByUserChanged('user-isolated-99');
        publish(pubsub, topic, { userId: 'user-isolated-99', orders: [] });

        const iter = subscribe(pubsub, topic)[Symbol.asyncIterator]();
        const pending = iter.next();

        // iter.next() will never resolve because publish happened before subscribe
        await expect(awaitNext(pending, 100)).rejects.toThrow('timed out');
    });

    it('delivers a storeStatusChanged payload to subscribers', async () => {
        const PAYLOAD = {
            isStoreClosed: true,
            closedMessage: 'Holiday',
            bannerEnabled: false,
            bannerMessage: null,
            bannerType: 'info',
        };
        const iter = subscribe(pubsub, topics.storeStatusChanged())[Symbol.asyncIterator]();
        const pending = iter.next();
        publish(pubsub, topics.storeStatusChanged(), PAYLOAD);

        expect(await awaitNext(pending)).toEqual(PAYLOAD);
    });

    it('delivers an orderDriverLiveChanged payload for the correct order', async () => {
        const PAYLOAD = {
            orderId: 'order-live-1',
            driverId: 'drv-1',
            latitude: 42.46,
            longitude: 21.47,
            navigationPhase: 'to_dropoff',
            remainingEtaSeconds: 300,
            etaUpdatedAt: '2026-03-26T12:00:00Z',
        };
        const topic = topics.orderDriverLiveChanged('order-live-1');
        const iter = subscribe(pubsub, topic)[Symbol.asyncIterator]();
        const pending = iter.next();
        publish(pubsub, topic, PAYLOAD);

        expect(await awaitNext(pending)).toEqual(PAYLOAD);
    });

    it('delivers a driverMessage payload to the correct driver subscriber', async () => {
        const PAYLOAD = {
            id: 'msg-1',
            adminId: 'admin-1',
            driverId: 'drv-99',
            senderRole: 'ADMIN' as const,
            body: 'Head to zone B',
            alertType: 'INFO' as const,
            readAt: null,
            createdAt: '2026-03-26T12:00:00Z',
        };
        const topic = topics.driverMessage('drv-99');
        const iter = subscribe(pubsub, topic)[Symbol.asyncIterator]();
        const pending = iter.next();
        publish(pubsub, topic, PAYLOAD);

        expect(await awaitNext(pending)).toEqual(PAYLOAD);
    });

    it('multiple subscribers on the same topic all receive the payload', async () => {
        const PAYLOAD = { orders: [] };
        const topic = topics.allOrdersChanged();

        const iter1 = subscribe(pubsub, topic)[Symbol.asyncIterator]();
        const iter2 = subscribe(pubsub, topic)[Symbol.asyncIterator]();

        const p1 = iter1.next();
        const p2 = iter2.next();
        publish(pubsub, topic, PAYLOAD);

        const [r1, r2] = await Promise.all([awaitNext(p1), awaitNext(p2)]);
        expect(r1).toEqual(PAYLOAD);
        expect(r2).toEqual(PAYLOAD);
    });
});
