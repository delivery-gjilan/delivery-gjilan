import { relations, sql } from 'drizzle-orm';
import { pgTable, varchar, numeric, timestamp, uuid, pgEnum, doublePrecision } from 'drizzle-orm/pg-core';
import { orderItems } from './orderItems';
import { OrderStatus } from '@/generated/types.generated';
import { users } from './users';

const orderStatusValues = ['PENDING', 'ACCEPTED', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as const;
[...orderStatusValues] satisfies OrderStatus[];
export const orderStatus = pgEnum('order_status', orderStatusValues);

export const orders = pgTable('orders', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    driverId: uuid('driver_id').references(() => users.id, { onDelete: 'set null' }),
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

export const ordersRelations = relations(orders, ({ one, many }) => ({
    orderItems: many(orderItems),
    user: one(users, {
        fields: [orders.userId],
        references: [users.id],
    }),
    driver: one(users, {
        fields: [orders.driverId],
        references: [users.id],
    }),
}));

export type DbOrder = typeof orders.$inferSelect;
export type NewDbOrder = typeof orders.$inferInsert;
