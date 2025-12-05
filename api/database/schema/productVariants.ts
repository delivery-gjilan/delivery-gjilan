import { pgTable, serial, varchar, integer, boolean, numeric, timestamp } from 'drizzle-orm/pg-core';
import { products } from './products';

export const productVariants = pgTable('product_variants', {
    id: serial('id').primaryKey(),

    productId: integer('product_id')
        .notNull()
        .references(() => products.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 255 }).notNull(),

    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    isOnSale: boolean('is_on_sale').default(false),
    salePrice: numeric('sale_price', { precision: 10, scale: 2 }),

    isAvailable: boolean('is_available').default(true),

    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
});
