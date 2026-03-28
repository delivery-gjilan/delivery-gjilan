import { pgTable, varchar, timestamp, uuid, index, integer } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';
import { products } from './products';
import { relations, sql } from 'drizzle-orm';
import { productSubcategories } from './productSubcategories';

export const productCategories = pgTable('product_categories', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    businessId: uuid('business_id')
        .notNull()
        .references(() => businesses.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
}, (t) => ([
    index('idx_product_categories_business_id').on(t.businessId),
]));

export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
    business: one(businesses, {
        fields: [productCategories.businessId],
        references: [businesses.id],
    }),
    products: many(products),
    productSubcategories: many(productSubcategories),
}));

export type DbProductCategory = typeof productCategories.$inferSelect;
export type NewDbProductCategory = typeof productCategories.$inferInsert;
