import { createClient, RedisClientType } from 'redis';
import logger from '@/lib/logger';

let client: RedisClientType | null = null;
let connected = false;
/** Set to true after the first failed connection attempt — stops retrying. */
let disabled = false;

/**
 * Lightweight Redis cache layer.
 *
 * – Connects lazily on first cache access
 * – Attempts to connect **once**; if Redis is unavailable, caching is disabled
 *   for the lifetime of the process (no retry spam)
 * – Falls through to the database transparently (all methods are no-throw)
 * – TTLs are set per-key so stale data self-evicts
 */

async function getClient(): Promise<RedisClientType | null> {
    if (disabled) return null;
    if (client && connected) return client;

    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
        const isTLS = url.startsWith('rediss://');
        client = createClient({
            url,
            socket: {
                // Exponential backoff up to 5 s, then give up after 6 attempts
                reconnectStrategy: (retries) => {
                    if (retries >= 6) {
                        disabled = true;
                        return false;
                    }
                    return Math.min(retries * 200, 5_000);
                },
                connectTimeout: 5_000,
                ...(isTLS ? { tls: true } : {}),
            } as any,
        }) as RedisClientType;

        // Swallow ongoing errors so the process doesn't crash
        client.on('error', () => {});

        await client.connect();
        connected = true;
        logger.info('[Redis] connected — caching enabled');
        return client;
    } catch {
        logger.info('[Redis] not available — running without cache (this is fine)');
        client = null;
        connected = false;
        disabled = true;
        return null;
    }
}

async function ping(): Promise<{ ok: boolean; disabled: boolean }> {
    if (disabled) {
        return { ok: false, disabled: true };
    }

    try {
        const redis = await getClient();
        if (!redis) {
            return { ok: false, disabled };
        }

        const result = await redis.ping();
        return { ok: result === 'PONG', disabled: false };
    } catch {
        return { ok: false, disabled };
    }
}

// ── Default TTLs (seconds) ──
const TTL = {
    BUSINESSES: 5 * 60,             // 5 min — list rarely changes
    FEATURED_BUSINESSES: 5 * 60,    // 5 min — featured list
    BUSINESS: 5 * 60,               // 5 min — individual detail
    PRODUCTS: 2 * 60,               // 2 min — product lists change moderately
    CATEGORIES: 10 * 60,            // 10 min — very stable
    SUBCATEGORIES: 10 * 60,         // 10 min — very stable
    DELIVERY_ZONES: 5 * 60,         // 5 min — zone edits are rare and invalidateable
    DELIVERY_PRICING_TIERS: 5 * 60, // 5 min — tier edits are rare and invalidateable
    DRIVERS: 5,                     // 5 s — short TTL; dispatch needs fresh connection states
    BANNERS: 10 * 60,               // 10 min — banners change rarely; invalidated on mutation
    PROMOTIONS: 5 * 60,             // 5 min — global active promos; invalidated on mutation
    OPTION_GROUPS: 5 * 60,          // 5 min — stable menu structure
    OPTIONS: 5 * 60,                // 5 min — stable menu options
    BUSINESSES_RESPONSE: 5 * 60,    // 5 min — full serialised home-feed response
    STORE_STATUS: 30,               // 30 s — show-stopper data; invalidated on mutation
} as const;

// ── Key helpers ──
const keys = {
    businesses: () => 'cache:businesses',
    featuredBusinesses: () => 'cache:businesses:featured',
    businessesResponse: () => 'cache:response:businesses',
    business: (id: string) => `cache:business:${id}`,
    products: (businessId: string) => `cache:products:${businessId}`,
    product: (id: string) => `cache:product:${id}`,
    categories: (businessId: string) => `cache:categories:${businessId}`,
    subcategories: (businessId: string) => `cache:subcategories:${businessId}`,
    subcategoriesByCat: (categoryId: string) => `cache:subcategories-cat:${categoryId}`,
    deliveryZones: () => 'cache:delivery-zones:active',
    deliveryPricingTiers: () => 'cache:delivery-pricing-tiers:active',
    drivers: () => 'cache:drivers:all',
    banners: (context: string) => `cache:banners:${context}`,
    promotions: () => 'cache:promotions:active-global',
    optionGroups: (productId: string) => `cache:option-groups:${productId}`,
    options: (optionGroupId: string) => `cache:options:${optionGroupId}`,
    storeStatus: () => 'cache:store-status',
};

// ── Generic get / set ──

async function get<T>(key: string): Promise<T | null> {
    try {
        const redis = await getClient();
        if (!redis) return null;
        const raw = await redis.get(key);
        return raw ? (JSON.parse(raw as string) as T) : null;
    } catch {
        return null;
    }
}

async function set(key: string, value: unknown, ttl: number): Promise<void> {
    try {
        const redis = await getClient();
        if (!redis) return;
        await redis.set(key, JSON.stringify(value), { EX: ttl });
    } catch {
        // swallow — DB is still the source of truth
    }
}

async function del(...keysToDel: string[]): Promise<void> {
    try {
        const redis = await getClient();
        if (!redis) return;
        if (keysToDel.length > 0) {
            await (redis as any).del(keysToDel);
        }
    } catch {
        // swallow
    }
}

async function delPattern(pattern: string): Promise<void> {
    try {
        const redis = await getClient();
        if (!redis) return;
        let cursor = 0;
        do {
            const result = await redis.scan(cursor as any, { MATCH: pattern, COUNT: 100 });
            cursor = result.cursor as any;
            if (result.keys.length > 0) {
                await (redis as any).del(result.keys);
            }
        } while (cursor !== 0);
    } catch {
        // swallow
    }
}

// ── Public API ──

export const cache = {
    keys,
    TTL,
    get,
    set,
    del,
    delPattern,
    ping,

    // ── Business helpers ──
    async invalidateBusiness(businessId: string) {
        await del(
            keys.businesses(),
            keys.featuredBusinesses(),
            keys.businessesResponse(),
            keys.business(businessId),
        );
    },
    async invalidateAllBusinesses() {
        await del(keys.businesses(), keys.featuredBusinesses(), keys.businessesResponse());
        await delPattern('cache:business:*');
    },

    // ── Banner helpers ──
    async invalidateBanners() {
        await delPattern('cache:banners:*');
    },

    // ── Promotion helpers ──
    async invalidatePromotions() {
        await del(keys.promotions());
    },

    // ── Store status helpers ──
    async invalidateStoreStatus() {
        await del(keys.storeStatus());
    },

    // ── Product helpers ──
    async invalidateProducts(businessId: string, productId?: string) {
        const toDelete = [keys.products(businessId)];
        if (productId) toDelete.push(keys.product(productId));
        await del(...toDelete);
    },

    // ── Category helpers ──
    async invalidateCategories(businessId: string) {
        await del(keys.categories(businessId));
    },

    // ── Subcategory helpers ──
    async invalidateSubcategories(businessId: string, categoryId?: string) {
        const toDelete = [keys.subcategories(businessId)];
        if (categoryId) toDelete.push(keys.subcategoriesByCat(categoryId));
        await del(...toDelete);
    },

    async invalidateDeliveryPricing() {
        await del(keys.deliveryZones(), keys.deliveryPricingTiers());
    },

    // ── Shutdown ──
    async disconnect() {
        try {
            if (client) {
                await client.quit();
                client = null;
                connected = false;
            }
        } catch {
            // swallow
        }
    },
};

// ── Request coalescing ──────────────────────────────────────────────────────
// Collapses concurrent in-flight fetches for the same cache key into a single
// DB call. If 50 requests arrive simultaneously on a cold cache miss, only one
// DB/service call is made; the rest await the same promise.
//
// Usage:
//   const result = await coalesce('cache:businesses', () => fetchFromDB());
//   Caller should still do its own cache.get/set — coalesce just deduplicates
//   the expensive fetch, not the cache interaction.

const inflightMap = new Map<string, Promise<unknown>>();

export async function coalesce<T>(key: string, fetch: () => Promise<T>): Promise<T> {
    const existing = inflightMap.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = fetch().finally(() => {
        inflightMap.delete(key);
    });
    inflightMap.set(key, promise as Promise<unknown>);
    return promise;
}
