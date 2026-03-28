import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { businesses } from './businesses';
import { products } from './products';

export const productVariantGroups = pgTable('product_variant_groups', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    businessId: uuid('business_id')
        .notNull()
        .references(() => businesses.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const productVariantGroupsRelations = relations(productVariantGroups, ({ one, many }) => ({
    business: one(businesses, {
        fields: [productVariantGroups.businessId],
        references: [businesses.id],
    }),
    products: many(products),
}));

export type DbProductVariantGroup = typeof productVariantGroups.$inferSelect;
export type NewDbProductVariantGroup = typeof productVariantGroups.$inferInsert;
