import { relations, sql } from 'drizzle-orm';
import { pgTable, varchar, numeric, timestamp, uuid, pgEnum, doublePrecision } from 'drizzle-orm/pg-core';
import { orderItems } from './orderItems';
import { OrderStatus } from '@/generated/types.generated';

const orderStatusValues = [
    'PENDING',
    'ACCEPTED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
] as const satisfies OrderStatus[];
export const orderStatus = pgEnum('order_status', orderStatusValues);

export const orders = pgTable('orders', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    price: numeric('price', { mode: 'number', precision: 10, scale: 2 }).notNull(),
    deliveryPrice: numeric('delivery_price', { mode: 'number', precision: 10, scale: 2 }).notNull(),
    status: orderStatus('status').notNull(),
    dropoffLat: doublePrecision('dropoff_lat').notNull(),
    dropoffLng: doublePrecision('dropoff_lng').notNull(),
    dropoffAddress: varchar('dropoff_address', { length: 500 }).notNull(),
    orderDate: timestamp('order_date', { mode: 'string' }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const ordersRelations = relations(orders, ({ many }) => ({
    orderItems: many(orderItems),
}));

export type DbOrder = typeof orders.$inferSelect;
export type NewDbOrder = typeof orders.$inferInsert;
