import { pgTable, serial, varchar, integer, boolean, numeric, timestamp } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';
import { categories } from './categories';

export const products = pgTable('products', {
    id: serial('id').primaryKey(),

    businessId: integer('business_id')
        .notNull()
        .references(() => businesses.id, { onDelete: 'cascade' }),

    categoryId: integer('category_id')
        .notNull()
        .references(() => categories.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),

    // Base image for product
    imageUrl: varchar('image_url', { length: 500 }),

    // Pricing
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    isOnSale: boolean('is_on_sale').default(false),
    salePrice: numeric('sale_price', { precision: 10, scale: 2 }),

    isAvailable: boolean('is_available').default(true),

    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
});
