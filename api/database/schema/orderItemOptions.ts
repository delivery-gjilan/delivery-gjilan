import { pgTable, uuid, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { orderItems } from './orderItems';
import { optionGroups } from './optionGroups';
import { options } from './options';

export const orderItemOptions = pgTable(
    'order_item_options',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        orderItemId: uuid('order_item_id')
            .notNull()
            .references(() => orderItems.id, { onDelete: 'cascade' }),
        optionGroupId: uuid('option_group_id')
            .notNull()
            .references(() => optionGroups.id, { onDelete: 'restrict' }),
        optionId: uuid('option_id')
            .notNull()
            .references(() => options.id, { onDelete: 'restrict' }),
        priceAtOrder: numeric('price_at_order', { mode: 'number', precision: 10, scale: 2 }).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (t) => [index('idx_order_item_options_order_item_id').on(t.orderItemId)],
);

export const orderItemOptionsRelations = relations(orderItemOptions, ({ one }) => ({
    orderItem: one(orderItems, {
        fields: [orderItemOptions.orderItemId],
        references: [orderItems.id],
    }),
    optionGroup: one(optionGroups, {
        fields: [orderItemOptions.optionGroupId],
        references: [optionGroups.id],
    }),
    option: one(options, {
        fields: [orderItemOptions.optionId],
        references: [options.id],
    }),
}));

export type DbOrderItemOption = typeof orderItemOptions.$inferSelect;
export type NewDbOrderItemOption = typeof orderItemOptions.$inferInsert;
