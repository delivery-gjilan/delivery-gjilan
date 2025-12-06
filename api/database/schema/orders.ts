import { pgTable, serial, varchar, integer, boolean, numeric, timestamp, uuid, pgEnum, doublePrecision } from 'drizzle-orm/pg-core';

export const orderStatus = pgEnum("order_status", ["PENDING", "ACCEPTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]);

export const orders = pgTable('orders', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    deliveryPrice: numeric('delivery_price', { precision: 10, scale: 2 }).notNull(),
    status: orderStatus("status").notNull(),
    dropoffLat: doublePrecision("dropoff_lat").notNull(),
    dropoffLng: doublePrecision("dropoff_lng").notNull(),
    dropoffAddress: varchar("dropoff_address", { length: 500 }).notNull(),
    orderDate: timestamp('order_date', { mode: 'string' }).defaultNow(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
});
