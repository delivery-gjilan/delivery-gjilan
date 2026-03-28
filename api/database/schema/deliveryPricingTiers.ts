import { sql } from 'drizzle-orm';
import { pgTable, uuid, numeric, integer, timestamp, boolean } from 'drizzle-orm/pg-core';

/**
 * Delivery Pricing Tiers — distance-based delivery fee configuration.
 *
 * Each row defines a range [minDistanceKm, maxDistanceKm) with a fixed price.
 * If maxDistanceKm is NULL the tier applies to everything beyond minDistanceKm.
 *
 * Example rows:
 *   0–3 km  → €1.00
 *   3–6 km  → €1.50
 *   6–10 km → €2.00
 *   10+ km  → €3.00
 */
export const deliveryPricingTiers = pgTable('delivery_pricing_tiers', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    minDistanceKm: numeric('min_distance_km', { mode: 'number', precision: 6, scale: 2 }).notNull(),
    maxDistanceKm: numeric('max_distance_km', { mode: 'number', precision: 6, scale: 2 }), // NULL = unlimited
    price: numeric('price', { mode: 'number', precision: 10, scale: 2 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export type DbDeliveryPricingTier = typeof deliveryPricingTiers.$inferSelect;
export type NewDbDeliveryPricingTier = typeof deliveryPricingTiers.$inferInsert;
