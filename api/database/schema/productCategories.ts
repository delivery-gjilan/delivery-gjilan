import { pgTable, serial, varchar, integer, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';

export const productCategories = pgTable('product_categories', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    businessId: uuid('business_id')
        .notNull()
        .references(() => businesses.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
});
