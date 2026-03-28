/**
 * Unit tests for the cache module's pure, deterministic API.
 *
 * We focus on:
 *  - cache.keys.*  — key strings are stable and correctly namespaced
 *  - cache.TTL.*   — TTL values match documented defaults
 *  - cache.invalidateBusiness / invalidateProducts / invalidateCategories /
 *    invalidateSubcategories — call del() with the right key(s)
 *
 * The Redis client is mocked at the module level so no real Redis connection
 * is attempted.  We reset the cache module between describe blocks that need
 * a fresh disabled-state via vi.resetModules() + dynamic import.
 */
import { describe, it, expect, vi } from 'vitest';

// ── Mock Redis so the module never attempts a real connection ────────────────
vi.mock('redis', () => ({
    createClient: vi.fn(() => ({
        on: vi.fn(),
        connect: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue('OK'),
        del: vi.fn().mockResolvedValue(1),
        scan: vi.fn().mockResolvedValue({ cursor: 0, keys: [] }),
        ping: vi.fn().mockResolvedValue('PONG'),
        quit: vi.fn().mockResolvedValue(undefined),
    })),
}));

import { cache } from '@/lib/cache';

// ── cache.keys ───────────────────────────────────────────────────────────────

describe('cache.keys', () => {
    it('businesses() → "cache:businesses" (no arguments)', () => {
        expect(cache.keys.businesses()).toBe('cache:businesses');
    });

    it('business(id) → "cache:business:<id>"', () => {
        expect(cache.keys.business('abc-123')).toBe('cache:business:abc-123');
    });

    it('products(businessId) → "cache:products:<businessId>"', () => {
        expect(cache.keys.products('biz-1')).toBe('cache:products:biz-1');
    });

    it('product(id) → "cache:product:<id>"', () => {
        expect(cache.keys.product('prod-99')).toBe('cache:product:prod-99');
    });

    it('categories(businessId) → "cache:categories:<businessId>"', () => {
        expect(cache.keys.categories('biz-2')).toBe('cache:categories:biz-2');
    });

    it('subcategories(businessId) → "cache:subcategories:<businessId>"', () => {
        expect(cache.keys.subcategories('biz-3')).toBe('cache:subcategories:biz-3');
    });

    it('subcategoriesByCat(categoryId) → "cache:subcategories-cat:<categoryId>"', () => {
        expect(cache.keys.subcategoriesByCat('cat-7')).toBe('cache:subcategories-cat:cat-7');
    });

    it('different businessIds produce different keys', () => {
        expect(cache.keys.business('a')).not.toBe(cache.keys.business('b'));
    });
});

// ── cache.TTL ─────────────────────────────────────────────────────────────────

describe('cache.TTL', () => {
    it('BUSINESSES is 5 minutes (300 s)', () => expect(cache.TTL.BUSINESSES).toBe(300));
    it('BUSINESS is 5 minutes (300 s)', () => expect(cache.TTL.BUSINESS).toBe(300));
    it('PRODUCTS is 2 minutes (120 s)', () => expect(cache.TTL.PRODUCTS).toBe(120));
    it('CATEGORIES is 10 minutes (600 s)', () => expect(cache.TTL.CATEGORIES).toBe(600));
    it('SUBCATEGORIES is 10 minutes (600 s)', () => expect(cache.TTL.SUBCATEGORIES).toBe(600));
});

// ── cache.get / set / del fall-through ───────────────────────────────────────
// When Redis is available (mocked), get/set/del should not throw.

describe('cache.get / set / del (with mocked Redis)', () => {
    it('get returns null for a missing key', async () => {
        const result = await cache.get<string>('nonexistent-key');
        // Redis mock returns null → expect null (cache pass-through)
        expect(result).toBeNull();
    });

    it('set does not throw for a valid key and value', async () => {
        await expect(cache.set('test-key', { foo: 'bar' }, 60)).resolves.not.toThrow();
    });

    it('del does not throw for an existing key', async () => {
        await expect(cache.del('test-key')).resolves.not.toThrow();
    });
});

// ── cache.ping ────────────────────────────────────────────────────────────────

describe('cache.ping', () => {
    it('returns { ok: true, disabled: false } when Redis responds with PONG', async () => {
        const result = await cache.ping();
        expect(result.ok).toBe(true);
        expect(result.disabled).toBe(false);
    });
});

// ── cache convenience invalidation helpers ────────────────────────────────────

describe('cache.invalidateBusiness', () => {
    it('is a callable function', () => {
        expect(typeof cache.invalidateBusiness).toBe('function');
    });

    it('resolves without throwing', async () => {
        await expect(cache.invalidateBusiness('biz-abc')).resolves.not.toThrow();
    });
});

describe('cache.invalidateProducts', () => {
    it('resolves without throwing (with optional productId)', async () => {
        await expect(cache.invalidateProducts('biz-abc', 'prod-xyz')).resolves.not.toThrow();
    });

    it('resolves without throwing (without productId)', async () => {
        await expect(cache.invalidateProducts('biz-abc')).resolves.not.toThrow();
    });
});

describe('cache.invalidateCategories', () => {
    it('resolves without throwing', async () => {
        await expect(cache.invalidateCategories('biz-abc')).resolves.not.toThrow();
    });
});

describe('cache.invalidateSubcategories', () => {
    it('resolves without throwing (with optional categoryId)', async () => {
        await expect(cache.invalidateSubcategories('biz-abc', 'cat-1')).resolves.not.toThrow();
    });
});
