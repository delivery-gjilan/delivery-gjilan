import {
  pgTable,
  uuid,
  integer,
  numeric,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core';

import { orders } from './orders';
import { products } from './products';

export const orderItems = pgTable(
  'order_items',
  {
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),

    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    price: numeric('price', { precision: 10, scale: 2 }).notNull(),

    quantity: integer('quantity').notNull(),

    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.orderId, t.productId] }),
  })
);
