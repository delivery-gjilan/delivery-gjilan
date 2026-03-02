import { pgTable, uuid, integer, numeric, timestamp, primaryKey, index, varchar } from 'drizzle-orm/pg-core';

import { orders } from './orders';
import { products } from './products';
import { relations, sql } from 'drizzle-orm';

export const orderItems = pgTable(
    'order_items',
    {
        orderId: uuid('order_id')
            .notNull()
            .references(() => orders.id, { onDelete: 'cascade' }),
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        price: numeric('price', { mode: 'number', precision: 10, scale: 2 }).notNull(),
        quantity: integer('quantity').notNull(),
        notes: varchar('notes', { length: 500 }),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull()
            .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.orderId, t.productId] }),
        productIdx: index('idx_order_items_product_id').on(t.productId),
    }),
);

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    order: one(orders, {
        fields: [orderItems.orderId],
        references: [orders.id],
    }),
    product: one(products, {
        fields: [orderItems.productId],
        references: [products.id],
    }),
}));

export type DbOrderItem = typeof orderItems.$inferSelect;
export type NewDbOrderItem = typeof orderItems.$inferInsert;
