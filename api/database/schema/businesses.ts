import { relations, sql } from 'drizzle-orm';
import { pgTable, varchar, boolean, timestamp, pgEnum, doublePrecision, integer, uuid } from 'drizzle-orm/pg-core';
import { products } from './products';
import { productCategories } from './productCategories';

export const businessType = pgEnum('business_type', ['MARKET', 'PHARMACY', 'RESTAURANT']);

export const businesses = pgTable('businesses', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    imageUrl: varchar('image_url', { length: 500 }),

    businessType: businessType('business_type').notNull(),

    isActive: boolean('is_active').default(true),

    locationLat: doublePrecision('location_lat').notNull(),
    locationLng: doublePrecision('location_lng').notNull(),
    locationAddress: varchar('location_address', { length: 500 }).notNull(),
    // open and close tell the time in minutes from midnight: Ex: 60 means 01:00
    opensAt: integer('opens_at').notNull(),
    closesAt: integer('closes_at').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const businessesRelations = relations(businesses, ({ many }) => ({
    products: many(products),
    productCategories: many(productCategories),
}));

export type DbBusiness = typeof businesses.$inferSelect;
export type NewDbBusiness = typeof businesses.$inferInsert;
