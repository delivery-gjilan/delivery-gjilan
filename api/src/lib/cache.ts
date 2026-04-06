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
        client = createClient({
            url,
            socket: {
                // Only try once — do not auto-reconnect and spam logs
                reconnectStrategy: false,
                connectTimeout: 3_000,
            },
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
    BUSINESSES: 5 * 60,         // 5 min — list rarely changes
    BUSINESS: 5 * 60,           // 5 min — individual detail
    PRODUCTS: 2 * 60,           // 2 min — product lists change moderately
    CATEGORIES: 10 * 60,        // 10 min — very stable
    SUBCATEGORIES: 10 * 60,     // 10 min — very stable
    DELIVERY_ZONES: 5 * 60,     // 5 min — zone edits are rare and invalidateable
    DELIVERY_PRICING_TIERS: 5 * 60, // 5 min — tier edits are rare and invalidateable
    DRIVERS: 5,                     // 5 s — short TTL; dispatch needs fresh connection states
} as const;

// ── Key helpers ──
const keys = {
    businesses: () => 'cache:businesses',
    business: (id: string) => `cache:business:${id}`,
    products: (businessId: string) => `cache:products:${businessId}`,
    product: (id: string) => `cache:product:${id}`,
    categories: (businessId: string) => `cache:categories:${businessId}`,
    subcategories: (businessId: string) => `cache:subcategories:${businessId}`,
    subcategoriesByCat: (categoryId: string) => `cache:subcategories-cat:${categoryId}`,
    deliveryZones: () => 'cache:delivery-zones:active',
    deliveryPricingTiers: () => 'cache:delivery-pricing-tiers:active',
    drivers: () => 'cache:drivers:all',
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
        await del(keys.businesses(), keys.business(businessId));
    },
    async invalidateAllBusinesses() {
        await del(keys.businesses());
        await delPattern('cache:business:*');
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
