import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { productCategories } from './productCategories';
import { relations, sql } from 'drizzle-orm';
import { products } from './products';

export const productSubcategories = pgTable('product_subcategories', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    categoryId: uuid('category_id')
        .notNull()
        .references(() => productCategories.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const productSubcategoriesRelations = relations(productSubcategories, ({ one, many }) => ({
    products: many(products),
    productCategory: one(productCategories, {
        fields: [productSubcategories.categoryId],
        references: [productCategories.id],
    }),
}));

export type DbProductSubcategory = typeof productSubcategories.$inferSelect;
export type NewDbProductSubcategory = typeof productSubcategories.$inferInsert;
