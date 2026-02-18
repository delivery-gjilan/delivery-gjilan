import { pgTable, varchar, boolean, numeric, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';
import { productCategories } from './productCategories';
import { productSubcategories } from './productSubcategories';
import { relations, sql } from 'drizzle-orm';
import { productStocks } from './productStock';

export const products = pgTable('products', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),

    businessId: uuid('business_id')
        .notNull()
        .references(() => businesses.id, { onDelete: 'cascade' }),

    categoryId: uuid('category_id')
        .notNull()
        .references(() => productCategories.id, { onDelete: 'cascade' }),
    subcategoryId: uuid('subcategory_id').references(() => productSubcategories.id, { onDelete: 'set null' }),
    groupId: uuid('group_id'),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),

    imageUrl: varchar('image_url', { length: 500 }),

    price: numeric('price', { mode: 'number', precision: 10, scale: 2 }).notNull(),
    isOnSale: boolean('is_on_sale').default(false),
    salePrice: numeric('sale_price', { mode: 'number', precision: 10, scale: 2 }),

    isAvailable: boolean('is_available').default(true),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const productsRelations = relations(products, ({ one }) => ({
    business: one(businesses, {
        fields: [products.businessId],
        references: [businesses.id],
    }),
    productCategory: one(productCategories, {
        fields: [products.categoryId],
        references: [productCategories.id],
    }),
    productSubcategory: one(productSubcategories, {
        fields: [products.subcategoryId],
        references: [productSubcategories.id],
    }),
    productStock: one(productStocks),
}));

export type DbProduct = typeof products.$inferSelect;
export type NewDbProduct = typeof products.$inferInsert;
