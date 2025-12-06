import { pgTable, varchar, boolean, numeric, timestamp, uuid } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';
import { productCategories } from './productCategories';
import { productSubcategories } from './productSubcategories';

export const products = pgTable('products', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),

    businessId: uuid('business_id')
        .notNull()
        .references(() => businesses.id, { onDelete: 'cascade' }),

    categoryId: uuid('category_id')
        .notNull()
        .references(() => productCategories.id, { onDelete: 'cascade' }),
    subcategoryId: uuid('sucategory_id').references(() => productSubcategories.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id'),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),

    imageUrl: varchar('image_url', { length: 500 }),

    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    isOnSale: boolean('is_on_sale').default(false),
    salePrice: numeric('sale_price', { precision: 10, scale: 2 }),

    isAvailable: boolean('is_available').default(true),

    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
});
