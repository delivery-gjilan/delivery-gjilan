import { pgTable, uuid, integer, numeric, timestamp, index, varchar, type AnyPgColumn } from 'drizzle-orm/pg-core';

import { orders } from './orders';
import { products } from './products';
import { relations, sql } from 'drizzle-orm';
import { orderItemOptions } from './orderItemOptions';

export const orderItems = pgTable(
    'order_items',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        orderId: uuid('order_id')
            .notNull()
            .references(() => orders.id, { onDelete: 'cascade' }),
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'restrict' }),
        parentOrderItemId: uuid('parent_order_item_id').references((): AnyPgColumn => orderItems.id, {
            onDelete: 'cascade',
        }),
        quantity: integer('quantity').notNull(),
        // Price snapshot at time of order
        basePrice: numeric('base_price', { mode: 'number', precision: 10, scale: 2 }).notNull(),
        salePrice: numeric('sale_price', { mode: 'number', precision: 10, scale: 2 }),
        markupPrice: numeric('markup_price', { mode: 'number', precision: 10, scale: 2 }),
        nightMarkedupPrice: numeric('night_marked_up_price', { mode: 'number', precision: 10, scale: 2 }),
        finalAppliedPrice: numeric('final_applied_price', { mode: 'number', precision: 10, scale: 2 }).notNull(),
        notes: varchar('notes', { length: 500 }),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull()
            .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
    },
    (t) => [
        index('idx_order_items_order_id').on(t.orderId),
        index('idx_order_items_product_id').on(t.productId),
        index('idx_order_items_parent').on(t.parentOrderItemId),
    ],
);

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
    order: one(orders, {
        fields: [orderItems.orderId],
        references: [orders.id],
    }),
    product: one(products, {
        fields: [orderItems.productId],
        references: [products.id],
    }),
    parentOrderItem: one(orderItems, {
        fields: [orderItems.parentOrderItemId],
        references: [orderItems.id],
        relationName: 'parentChild',
    }),
    childOrderItems: many(orderItems, {
        relationName: 'parentChild',
    }),
    orderItemOptions: many(orderItemOptions),
}));

export type DbOrderItem = typeof orderItems.$inferSelect;
export type NewDbOrderItem = typeof orderItems.$inferInsert;
