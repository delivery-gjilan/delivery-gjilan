import { pgTable, serial, varchar, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const businessType = pgEnum('business_type', ['RESTAURANT', 'MARKET', 'PHARMACY']);

export const businesses = pgTable('businesses', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    imageUrl: varchar('image_url', { length: 500 }),
    businessType: businessType('business_type').notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
});
