import { relations, sql } from 'drizzle-orm';
import { pgTable, varchar, boolean, timestamp, pgEnum, doublePrecision, integer, uuid, numeric } from 'drizzle-orm/pg-core';
import { products } from './products';
import { productCategories } from './productCategories';
import { BusinessType } from '@/generated/types.generated';

const businessTypeValues = ['MARKET', 'PHARMACY', 'RESTAURANT'] as const satisfies BusinessType[];

export const businessType = pgEnum('business_type', businessTypeValues);

export const businesses = pgTable('businesses', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 500 }),
    phoneNumber: varchar('phone_number', { length: 32 }),
    imageUrl: varchar('image_url', { length: 500 }),
    businessType: businessType('business_type').notNull(),
    isActive: boolean('is_active').default(true),
    locationLat: doublePrecision('location_lat').notNull(),
    locationLng: doublePrecision('location_lng').notNull(),
    locationAddress: varchar('location_address', { length: 500 }).notNull(),
    // open and close tell the time in minutes from midnight: Ex: 60 means 01:00
    opensAt: integer('opens_at').notNull(),
    closesAt: integer('closes_at').notNull(),
    avgPrepTimeMinutes: integer('avg_prep_time_minutes').notNull().default(20),
    prepTimeOverrideMinutes: integer('prep_time_override_minutes'),
    isTemporarilyClosed: boolean('is_temporarily_closed').notNull().default(false),
    temporaryClosureReason: varchar('temporary_closure_reason', { length: 500 }),
    category: varchar('category', { length: 100 }),
    commissionPercentage: numeric('commission_percentage', { precision: 5, scale: 2 }).default('0').notNull(),
    minOrderAmount: numeric('min_order_amount', { precision: 10, scale: 2 }).default('0').notNull(),
    isFeatured: boolean('is_featured').notNull().default(false),
    featuredSortOrder: integer('featured_sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
});

export const businessesRelations = relations(businesses, ({ many }) => ({
    products: many(products),
    productCategories: many(productCategories),
}));

export type DbBusiness = typeof businesses.$inferSelect;
export type NewDbBusiness = typeof businesses.$inferInsert;
