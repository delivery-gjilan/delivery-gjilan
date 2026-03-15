import { pgTable, uuid, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { products } from './products';
import { options } from './options';
import { orderItemOptions } from './orderItemOptions';

export const optionGroups = pgTable(
    'option_groups',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        name: varchar('name', { length: 255 }).notNull(),
        minSelections: integer('min_selections').default(0).notNull(),
        maxSelections: integer('max_selections').default(1).notNull(),
        displayOrder: integer('display_order').default(0).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull()
            .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
    },
    (t) => [index('idx_option_groups_product_id').on(t.productId)],
);

export const optionGroupsRelations = relations(optionGroups, ({ one, many }) => ({
    product: one(products, {
        fields: [optionGroups.productId],
        references: [products.id],
    }),
    options: many(options),
    orderItemOptions: many(orderItemOptions),
}));

export type DbOptionGroup = typeof optionGroups.$inferSelect;
export type NewDbOptionGroup = typeof optionGroups.$inferInsert;
