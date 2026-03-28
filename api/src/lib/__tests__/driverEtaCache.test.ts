/**
 * Unit tests for driverEtaCache helpers.
 *
 * These three exported functions are thin wrappers around cache.get / cache.set / cache.del.
 * The tests verify:
 *  - the correct namespaced key is used for every userId
 *  - getLiveDriverEta delegates to cache.get and returns the result
 *  - setLiveDriverEta delegates to cache.set with the 20-second TTL
 *  - clearLiveDriverEta delegates to cache.del with the right key
 *
 * The cache module is mocked entirely so no Redis connection is required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock the cache module ─────────────────────────────────────────────────────
vi.mock('@/lib/cache', () => ({
    cache: {
        get: vi.fn(),
        set: vi.fn().mockResolvedValue(undefined),
        del: vi.fn().mockResolvedValue(undefined),
    },
}));

import { getLiveDriverEta, setLiveDriverEta, clearLiveDriverEta, type LiveDriverEta } from '@/lib/driverEtaCache';
import { cache } from '@/lib/cache';

const DRIVER_ETA_TTL = 20; // must match the constant in driverEtaCache.ts

const STUB_ETA: LiveDriverEta = {
    activeOrderId: 'order-abc',
    navigationPhase: 'to_dropoff',
    remainingEtaSeconds: 120,
    etaUpdatedAt: '2026-03-26T12:00:00.000Z',
};

beforeEach(() => {
    vi.clearAllMocks();
});

// ── getLiveDriverEta ──────────────────────────────────────────────────────────

describe('getLiveDriverEta', () => {
    it('calls cache.get with the namespaced driver key', async () => {
        vi.mocked(cache.get).mockResolvedValue(STUB_ETA);
        await getLiveDriverEta('driver-1');
        expect(cache.get).toHaveBeenCalledWith('cache:driver-eta:driver-1');
    });

    it('returns the cached ETA when present', async () => {
        vi.mocked(cache.get).mockResolvedValue(STUB_ETA);
        const result = await getLiveDriverEta('driver-1');
        expect(result).toEqual(STUB_ETA);
    });

    it('returns null when no ETA is cached', async () => {
        vi.mocked(cache.get).mockResolvedValue(null);
        const result = await getLiveDriverEta('driver-x');
        expect(result).toBeNull();
    });

    it('uses distinct keys for different driverIds', async () => {
        vi.mocked(cache.get).mockResolvedValue(null);
        await getLiveDriverEta('driver-a');
        await getLiveDriverEta('driver-b');
        const calls = vi.mocked(cache.get).mock.calls;
        expect(calls[0][0]).toBe('cache:driver-eta:driver-a');
        expect(calls[1][0]).toBe('cache:driver-eta:driver-b');
        expect(calls[0][0]).not.toBe(calls[1][0]);
    });
});

// ── setLiveDriverEta ──────────────────────────────────────────────────────────

describe('setLiveDriverEta', () => {
    it('calls cache.set with the driver key, value, and 20-second TTL', async () => {
        await setLiveDriverEta('driver-2', STUB_ETA);
        expect(cache.set).toHaveBeenCalledWith('cache:driver-eta:driver-2', STUB_ETA, DRIVER_ETA_TTL);
    });

    it('stores exactly the value provided (no transformation)', async () => {
        await setLiveDriverEta('driver-2', STUB_ETA);
        const [, storedValue] = vi.mocked(cache.set).mock.calls[0];
        expect(storedValue).toEqual(STUB_ETA);
    });
});

// ── clearLiveDriverEta ────────────────────────────────────────────────────────

describe('clearLiveDriverEta', () => {
    it('calls cache.del with the namespaced driver key', async () => {
        await clearLiveDriverEta('driver-3');
        expect(cache.del).toHaveBeenCalledWith('cache:driver-eta:driver-3');
    });

    it('does not call cache.get or cache.set', async () => {
        await clearLiveDriverEta('driver-3');
        expect(cache.get).not.toHaveBeenCalled();
        expect(cache.set).not.toHaveBeenCalled();
    });
});
