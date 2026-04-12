import { pgTable, uuid, integer, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { orders } from './orders';
import { products } from './products';

export const orderCoverageLogs = pgTable(
    'order_coverage_logs',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        orderId: uuid('order_id')
            .notNull()
            .references(() => orders.id, { onDelete: 'cascade' }),
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'restrict' }),
        orderedQty: integer('ordered_qty').notNull(),
        fromStock: integer('from_stock').notNull().default(0),
        fromMarket: integer('from_market').notNull().default(0),
        deducted: boolean('deducted').notNull().default(false),
        deductedAt: timestamp('deducted_at', { withTimezone: true, mode: 'string' }),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (t) => [
        uniqueIndex('uq_order_coverage_order_product').on(t.orderId, t.productId),
        index('idx_order_coverage_order_id').on(t.orderId),
    ],
);

export const orderCoverageLogsRelations = relations(orderCoverageLogs, ({ one }) => ({
    order: one(orders, {
        fields: [orderCoverageLogs.orderId],
        references: [orders.id],
    }),
    product: one(products, {
        fields: [orderCoverageLogs.productId],
        references: [products.id],
    }),
}));

export type DbOrderCoverageLog = typeof orderCoverageLogs.$inferSelect;
export type NewDbOrderCoverageLog = typeof orderCoverageLogs.$inferInsert;
