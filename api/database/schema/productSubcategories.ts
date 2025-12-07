import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { productCategories } from './productCategories';

export const productSubcategories = pgTable('product_subcategories', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    categoryId: uuid('category_id')
        .notNull()
        .references(() => productCategories.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
});
