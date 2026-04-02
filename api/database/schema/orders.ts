import { relations, sql } from 'drizzle-orm';
import {
    pgTable,
    varchar,
    numeric,
    timestamp,
    uuid,
    pgEnum,
    doublePrecision,
    integer,
    boolean,
    index,
    uniqueIndex,
} from 'drizzle-orm/pg-core';
import { orderItems } from './orderItems';
import { OrderStatus } from '@/generated/types.generated';
import { users } from './users';
import { orderPromotions } from './orderPromotions';
import { businesses } from './businesses';

const orderStatusValues = ['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'AWAITING_APPROVAL'] as const;
[...orderStatusValues] satisfies OrderStatus[];
export const orderStatus = pgEnum('order_status', orderStatusValues);

const orderPaymentCollectionValues = ['CASH_TO_DRIVER', 'PREPAID_TO_PLATFORM'] as const;
export const orderPaymentCollection = pgEnum('order_payment_collection', orderPaymentCollectionValues);

export const orders = pgTable(
    'orders',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        displayId: varchar('display_id', { length: 10 }).notNull(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        driverId: uuid('driver_id').references(() => users.id, { onDelete: 'set null' }),
        businessId: uuid('business_id')
            .notNull()
            .references(() => businesses.id, { onDelete: 'restrict' }),

        originalPrice: numeric('original_price', { mode: 'number', precision: 10, scale: 2 }),
        basePrice: numeric('base_price', { mode: 'number', precision: 10, scale: 2 }).notNull(),
        markupPrice: numeric('markup_price', { mode: 'number', precision: 10, scale: 2 }).notNull().default(0),
        actualPrice: numeric('actual_price', { mode: 'number', precision: 10, scale: 2 }).notNull(),
        originalDeliveryPrice: numeric('original_delivery_price', { mode: 'number', precision: 10, scale: 2 }),
        deliveryPrice: numeric('delivery_price', { mode: 'number', precision: 10, scale: 2 }).notNull(),
        prioritySurcharge: numeric('priority_surcharge', { mode: 'number', precision: 10, scale: 2 }).notNull().default(0),

        paymentCollection: orderPaymentCollection('payment_collection').default('CASH_TO_DRIVER').notNull(),
        status: orderStatus('status').notNull(),
        dropoffLat: doublePrecision('dropoff_lat').notNull(),
        dropoffLng: doublePrecision('dropoff_lng').notNull(),
        dropoffAddress: varchar('dropoff_address', { length: 500 }).notNull(),
        locationFlagged: boolean('location_flagged').default(false).notNull(),
        driverNotes: varchar('driver_notes', { length: 500 }),
        cancellationReason: varchar('cancellation_reason', { length: 500 }),
        adminNote: varchar('admin_note', { length: 2000 }),
        cancelledAt: timestamp('cancelled_at', { withTimezone: true, mode: 'string' }),
        preparationMinutes: integer('preparation_minutes'),
        estimatedReadyAt: timestamp('estimated_ready_at', { withTimezone: true, mode: 'string' }),
        preparingAt: timestamp('preparing_at', { withTimezone: true, mode: 'string' }),
        readyAt: timestamp('ready_at', { withTimezone: true, mode: 'string' }),
        outForDeliveryAt: timestamp('out_for_delivery_at', { withTimezone: true, mode: 'string' }),
        deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'string' }),
        driverAssignedAt: timestamp('driver_assigned_at', { withTimezone: true, mode: 'string' }),
        driverArrivedAtPickup: timestamp('driver_arrived_at_pickup', { withTimezone: true, mode: 'string' }),
        orderDate: timestamp('order_date', { withTimezone: true, mode: 'string' }).defaultNow(),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull()
            .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
    },
    (t) => [
        index('idx_orders_user_id').on(t.userId),
        index('idx_orders_driver_id').on(t.driverId),
        index('idx_orders_status').on(t.status),
        index('idx_orders_status_created').on(t.status, t.createdAt),
        index('idx_orders_business_id').on(t.businessId),
        uniqueIndex('idx_orders_display_id').on(t.displayId),
    ],
);

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
    business: one(businesses, {
        fields: [orders.businessId],
        references: [businesses.id],
    }),
    orderPromotions: many(orderPromotions),
}));

export type DbOrder = typeof orders.$inferSelect;
export type NewDbOrder = typeof orders.$inferInsert;
