import { pgTable, uuid, varchar, numeric, timestamp, text, integer } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

export const deliveryZones = pgTable('delivery_zones', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    feeDelta: numeric('fee_delta', { mode: 'number', precision: 10, scale: 2 }).notNull().default('0'),
    color: varchar('color', { length: 7 }).notNull().default('#3b82f6'), // Hex color for map display
    priority: integer('priority').notNull().default(0), // Higher number = higher priority when zones overlap
    isActive: text('is_active').notNull().default('true'),
    // PostGIS geometry column - stores polygon as WKT or binary
    geometry: text('geometry').notNull(), // Will store as GeoJSON string for simplicity
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
