import { relations, sql } from 'drizzle-orm';
import { pgTable, timestamp, integer, uuid, index } from 'drizzle-orm/pg-core';
import { products } from './products';

export const productStocks = pgTable('product_stocks', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    stock: integer('stock').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
}, (t) => ([
    index('idx_product_stocks_product_id').on(t.productId),
]));

export const productStocksRelations = relations(productStocks, ({ one }) => ({
    product: one(products, {
        fields: [productStocks.productId],
        references: [products.id],
    }),
}));

export type DbProductStock = typeof productStocks.$inferSelect;
export type NewDbProductStock = typeof productStocks.$inferInsert;
