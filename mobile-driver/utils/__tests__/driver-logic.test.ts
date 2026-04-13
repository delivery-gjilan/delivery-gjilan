/**
 * Mobile-Driver Unit Tests
 *
 * Pure logic tests extracted from:
 *  - store/orderAcceptStore.ts    (TTL pruning)
 *  - app/(tabs)/messages.tsx      (message cap)
 *  - hooks/useGlobalOrderAccept.ts (ETA threshold, order sorting)
 *  - hooks/useAcceptOrderMutation.ts (error classification)
 *
 * No React, React Native, Apollo, or Expo — just plain TypeScript.
 *
 * Run from workspace root:
 *   cd api && npx vitest run --config vitest.config.ts mobile-driver
 */

import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// orderAcceptStore — pruneTimestampMap logic
// ─────────────────────────────────────────────────────────────────────────────
const SKIP_TTL_MS = 10 * 60 * 1000; // 10 minutes

type TimestampMap = Record<string, number>;

function pruneTimestampMap(entries: TimestampMap, now: number): TimestampMap {
    const next: TimestampMap = {};
    Object.entries(entries).forEach(([id, ts]) => {
        if (now - ts < SKIP_TTL_MS) {
            next[id] = ts;
        }
    });
    return next;
}

describe('pruneTimestampMap', () => {
    it('keeps entries within TTL window', () => {
        const now = Date.now();
        const entries: TimestampMap = {
            order1: now - 1 * 60 * 1000,  // 1 min ago — keep
            order2: now - 5 * 60 * 1000,  // 5 min ago — keep
        };
        const result = pruneTimestampMap(entries, now);
        expect(result).toHaveProperty('order1');
        expect(result).toHaveProperty('order2');
    });

    it('removes entries past the TTL window', () => {
        const now = Date.now();
        const entries: TimestampMap = {
            old1: now - 11 * 60 * 1000,  // 11 min ago — remove
            old2: now - 60 * 60 * 1000,  // 1 hr ago — remove
        };
        const result = pruneTimestampMap(entries, now);
        expect(result).toEqual({});
    });

    it('handles boundary: exactly at TTL edge is removed', () => {
        const now = Date.now();
        const entries: TimestampMap = {
            edge: now - SKIP_TTL_MS, // exactly at boundary — not < TTL so excluded
        };
        const result = pruneTimestampMap(entries, now);
        expect(result).not.toHaveProperty('edge');
    });

    it('returns empty map from empty input', () => {
        expect(pruneTimestampMap({}, Date.now())).toEqual({});
    });

    it('mixes kept and removed entries correctly', () => {
        const now = Date.now();
        const entries: TimestampMap = {
            fresh: now - 30 * 1000,       // 30s ago — keep
            stale: now - 15 * 60 * 1000,  // 15 min ago — remove
        };
        const result = pruneTimestampMap(entries, now);
        expect(result).toHaveProperty('fresh');
        expect(result).not.toHaveProperty('stale');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// messages.tsx — capMessages
// ─────────────────────────────────────────────────────────────────────────────
const MAX_EXTRA_MESSAGES = 200;

function capMessages<T>(msgs: T[]): T[] {
    return msgs.length > MAX_EXTRA_MESSAGES ? msgs.slice(msgs.length - MAX_EXTRA_MESSAGES) : msgs;
}

describe('capMessages', () => {
    it('returns array unchanged when under the cap', () => {
        const msgs = Array.from({ length: 50 }, (_, i) => ({ id: String(i) }));
        expect(capMessages(msgs)).toHaveLength(50);
    });

    it('returns array unchanged when exactly at the cap', () => {
        const msgs = Array.from({ length: MAX_EXTRA_MESSAGES }, (_, i) => ({ id: String(i) }));
        expect(capMessages(msgs)).toHaveLength(MAX_EXTRA_MESSAGES);
    });

    it('truncates to the most-recent MAX_EXTRA_MESSAGES when over the cap', () => {
        const msgs = Array.from({ length: 250 }, (_, i) => ({ id: String(i) }));
        const result = capMessages(msgs);
        expect(result).toHaveLength(MAX_EXTRA_MESSAGES);
        // Should keep the LAST 200 (most recent)
        expect(result[0]).toEqual({ id: '50' });
        expect(result[result.length - 1]).toEqual({ id: '249' });
    });

    it('handles empty array', () => {
        expect(capMessages([])).toEqual([]);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// useGlobalOrderAccept — ETA threshold logic (5-min window)
// ─────────────────────────────────────────────────────────────────────────────
function getEstimatedReadyMs(order: {
    estimatedReadyAt?: string | null;
    preparingAt?: string | null;
    preparationMinutes?: number | string | null;
}): number | null {
    const estimatedReadyRaw = order?.estimatedReadyAt;
    if (estimatedReadyRaw) {
        const estimatedReadyMs = new Date(estimatedReadyRaw).getTime();
        if (Number.isFinite(estimatedReadyMs)) return estimatedReadyMs;
    }

    const preparingAtRaw = order?.preparingAt;
    const prepMinutes = Number(order?.preparationMinutes);
    if (preparingAtRaw && Number.isFinite(prepMinutes) && prepMinutes > 0) {
        const preparingAtMs = new Date(preparingAtRaw).getTime();
        if (Number.isFinite(preparingAtMs)) return preparingAtMs + prepMinutes * 60 * 1000;
    }

    return null;
}

function isOrderWithinFiveMinWindow(order: Parameters<typeof getEstimatedReadyMs>[0], now: number): boolean {
    const estimatedReadyMs = getEstimatedReadyMs(order);
    if (estimatedReadyMs === null) return false;
    return estimatedReadyMs - now <= 5 * 60 * 1000;
}

describe('getEstimatedReadyMs', () => {
    it('returns estimatedReadyAt as ms when present', () => {
        const date = new Date('2026-04-13T10:00:00Z');
        const order = { estimatedReadyAt: date.toISOString() };
        expect(getEstimatedReadyMs(order)).toBe(date.getTime());
    });

    it('computes from preparingAt + preparationMinutes when estimatedReadyAt absent', () => {
        const preparingAt = new Date('2026-04-13T10:00:00Z');
        const order = { preparingAt: preparingAt.toISOString(), preparationMinutes: 15 };
        expect(getEstimatedReadyMs(order)).toBe(preparingAt.getTime() + 15 * 60 * 1000);
    });

    it('returns null when neither field present', () => {
        expect(getEstimatedReadyMs({})).toBeNull();
    });

    it('returns null when preparationMinutes is 0', () => {
        const order = { preparingAt: new Date().toISOString(), preparationMinutes: 0 };
        expect(getEstimatedReadyMs(order)).toBeNull();
    });

    it('prefers estimatedReadyAt over computed value', () => {
        const explicit = new Date('2026-04-13T10:30:00Z');
        const preparingAt = new Date('2026-04-13T10:00:00Z');
        const order = {
            estimatedReadyAt: explicit.toISOString(),
            preparingAt: preparingAt.toISOString(),
            preparationMinutes: 15,
        };
        expect(getEstimatedReadyMs(order)).toBe(explicit.getTime());
    });
});

describe('isOrderWithinFiveMinWindow', () => {
    it('returns true when ready in 4 minutes', () => {
        const now = Date.now();
        const order = { estimatedReadyAt: new Date(now + 4 * 60 * 1000).toISOString() };
        expect(isOrderWithinFiveMinWindow(order, now)).toBe(true);
    });

    it('returns true when overdue (already past ready time)', () => {
        const now = Date.now();
        const order = { estimatedReadyAt: new Date(now - 60 * 1000).toISOString() };
        expect(isOrderWithinFiveMinWindow(order, now)).toBe(true);
    });

    it('returns false when ready in 6 minutes', () => {
        const now = Date.now();
        const order = { estimatedReadyAt: new Date(now + 6 * 60 * 1000).toISOString() };
        expect(isOrderWithinFiveMinWindow(order, now)).toBe(false);
    });

    it('returns false when no ETA data', () => {
        expect(isOrderWithinFiveMinWindow({}, Date.now())).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// useAcceptOrderMutation — error classification
// ─────────────────────────────────────────────────────────────────────────────
type AcceptErrorKind = 'taken' | 'max_active' | 'not_available' | 'generic';

function classifyAcceptError(errorMessage: string): AcceptErrorKind {
    const msg = errorMessage.toLowerCase();
    if (msg.includes('already') || msg.includes('assigned') || msg.includes('taken')) {
        return 'taken';
    }
    if (msg.includes('maximum') || msg.includes('max active')) {
        return 'max_active';
    }
    if (msg.includes('not available')) {
        return 'not_available';
    }
    return 'generic';
}

describe('classifyAcceptError', () => {
    it('classifies "already assigned" as taken', () => {
        expect(classifyAcceptError('Order is already assigned')).toBe('taken');
    });

    it('classifies "taken by another driver" as taken', () => {
        expect(classifyAcceptError('Taken by another driver')).toBe('taken');
    });

    it('classifies "maximum active orders" as max_active', () => {
        expect(classifyAcceptError('You have reached your maximum active orders')).toBe('max_active');
    });

    it('classifies "max active orders exceeded" as max_active', () => {
        expect(classifyAcceptError('Max active orders exceeded')).toBe('max_active');
    });

    it('classifies "not available for driver" as not_available', () => {
        expect(classifyAcceptError('Order is not available for driver')).toBe('not_available');
    });

    it('classifies unknown errors as generic', () => {
        expect(classifyAcceptError('Internal server error')).toBe('generic');
        expect(classifyAcceptError('Network error')).toBe('generic');
    });

    it('is case-insensitive', () => {
        expect(classifyAcceptError('ALREADY TAKEN')).toBe('taken');
        expect(classifyAcceptError('MAXIMUM orders reached')).toBe('max_active');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// useOrdersFeed — orders derivation priority
// ─────────────────────────────────────────────────────────────────────────────
describe('orders derivation priority', () => {
    const queryOrders = [{ id: 'q1' }];
    const subOrders = [{ id: 's1' }];
    const cachedOrders = [{ id: 'c1' }];

    function deriveOrders(
        queryData: any[] | null,
        subscriptionOrders: any[] | null,
        cachedOrders: any[],
        networkReady: boolean,
    ) {
        return queryData ?? subscriptionOrders ?? (networkReady ? cachedOrders : []);
    }

    it('prefers query data when available', () => {
        expect(deriveOrders(queryOrders, subOrders, cachedOrders, true)).toEqual(queryOrders);
    });

    it('falls back to subscription data when query not yet resolved', () => {
        expect(deriveOrders(null, subOrders, cachedOrders, false)).toEqual(subOrders);
    });

    it('falls back to cache after networkReady', () => {
        expect(deriveOrders(null, null, cachedOrders, true)).toEqual(cachedOrders);
    });

    it('returns empty array before networkReady with no query or subscription data', () => {
        expect(deriveOrders(null, null, cachedOrders, false)).toEqual([]);
    });

    it('treats empty subscription array [] as valid (all orders cleared)', () => {
        expect(deriveOrders(null, [], cachedOrders, true)).toEqual([]);
    });
});
