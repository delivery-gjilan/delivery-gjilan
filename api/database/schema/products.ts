import { pgTable, varchar, boolean, numeric, timestamp, uuid, integer, index } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';
import { productCategories } from './productCategories';
import { productSubcategories } from './productSubcategories';
import { productVariantGroups } from './productVariantGroups';
import { relations, sql } from 'drizzle-orm';
import { optionGroups } from './optionGroups';

export const products = pgTable(
    'products',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),

        businessId: uuid('business_id')
            .notNull()
            .references(() => businesses.id, { onDelete: 'cascade' }),

        categoryId: uuid('category_id')
            .notNull()
            .references(() => productCategories.id, { onDelete: 'cascade' }),
        subcategoryId: uuid('subcategory_id').references(() => productSubcategories.id, { onDelete: 'set null' }),
        groupId: uuid('group_id').references(() => productVariantGroups.id, { onDelete: 'set null' }),
        isOffer: boolean('is_offer').default(false).notNull(),
        name: varchar('name', { length: 255 }).notNull(),
        description: varchar('description', { length: 1000 }),

        imageUrl: varchar('image_url', { length: 500 }),

        basePrice: numeric('base_price', { mode: 'number', precision: 10, scale: 2 }).notNull(),
        markupPrice: numeric('markup_price', { mode: 'number', precision: 10, scale: 2 }),
        nightMarkedupPrice: numeric('night_marked_up_price', { mode: 'number', precision: 10, scale: 2 }),
        isOnSale: boolean('is_on_sale').default(false),
        // Discount percentage (0–100). Applied to the active price tier (night → markup → base).
        // When isOnSale=false this column is ignored.
        saleDiscountPercentage: numeric('sale_discount_percentage', { mode: 'number', precision: 5, scale: 2 }),

        isAvailable: boolean('is_available').default(true),
        isDeleted: boolean('is_deleted').default(false).notNull(),
        sortOrder: integer('sort_order').default(0).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull()
            .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
    },
    (t) => [index('idx_products_business_id').on(t.businessId), index('idx_products_category_id').on(t.categoryId)],
);

export const productsRelations = relations(products, ({ one, many }) => ({
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
    variantGroup: one(productVariantGroups, {
        fields: [products.groupId],
        references: [productVariantGroups.id],
    }),
    optionGroups: many(optionGroups),
}));

export type DbProduct = typeof products.$inferSelect;
export type NewDbProduct = typeof products.$inferInsert;
