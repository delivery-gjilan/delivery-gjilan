import { pgTable, serial, varchar, integer, boolean, numeric, timestamp, uuid, pgEnum, doublePrecision } from 'drizzle-orm/pg-core';
import { orders } from './orders';
import { products } from './products';


export const orderItems = pgTable('order_items', {
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    quantity: integer('quantity').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
});
