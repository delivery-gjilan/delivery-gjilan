import { pgTable, uuid, varchar, numeric, integer, timestamp, index, boolean } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { optionGroups } from './optionGroups';
import { products } from './products';
import { orderItemOptions } from './orderItemOptions';

export const options = pgTable(
    'options',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        optionGroupId: uuid('option_group_id')
            .notNull()
            .references(() => optionGroups.id, { onDelete: 'cascade' }),
        name: varchar('name', { length: 255 }).notNull(),
        extraPrice: numeric('extra_price', { mode: 'number', precision: 10, scale: 2 }).default(0).notNull(),
        linkedProductId: uuid('linked_product_id').references(() => products.id, { onDelete: 'set null' }),
        displayOrder: integer('display_order').default(0).notNull(),
        isDeleted: boolean('is_deleted').default(false).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull()
            .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
    },
    (t) => [
        index('idx_options_option_group_id').on(t.optionGroupId),
        index('idx_options_linked_product_id').on(t.linkedProductId),
    ],
);

export const optionsRelations = relations(options, ({ one, many }) => ({
    optionGroup: one(optionGroups, {
        fields: [options.optionGroupId],
        references: [optionGroups.id],
    }),
    linkedProduct: one(products, {
        fields: [options.linkedProductId],
        references: [products.id],
    }),
    orderItemOptions: many(orderItemOptions),
}));

export type DbOption = typeof options.$inferSelect;
export type NewDbOption = typeof options.$inferInsert;
