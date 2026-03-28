import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, numeric, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

/**
 * Delivery Zones — polygon-based delivery fee configuration.
 *
 * Each zone defines a geographic polygon (array of {lat, lng} points)
 * and a fixed delivery fee for orders delivered within that polygon.
 *
 * Zones take priority over distance-based delivery pricing tiers.
 * If a customer's dropoff location falls within a zone, the zone's
 * deliveryFee is used. Otherwise, the distance-based tier system applies.
 */
export const deliveryZones = pgTable('delivery_zones', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: text('name').notNull(),
    /** Array of {lat: number, lng: number} points forming the polygon boundary */
    polygon: jsonb('polygon').$type<Array<{ lat: number; lng: number }>>().notNull(),
    deliveryFee: numeric('delivery_fee', { mode: 'number', precision: 10, scale: 2 }).notNull(),
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

export type DbDeliveryZone = typeof deliveryZones.$inferSelect;
export type NewDbDeliveryZone = typeof deliveryZones.$inferInsert;
