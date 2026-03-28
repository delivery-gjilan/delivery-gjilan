import { relations, sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
import { orders } from './orders';
import { users } from './users';
import { businesses } from './businesses';

const orderEventTypeValues = [
    // Order lifecycle
    'ORDER_CREATED',
    'ORDER_PREPARING',
    'ORDER_READY',
    'ORDER_PICKED_UP',
    'ORDER_DELIVERED',
    'ORDER_CANCELLED',
    // Driver lifecycle
    'DRIVER_ASSIGNED',
    'DRIVER_ARRIVED_PICKUP',
    // Dispatch
    'DISPATCH_SENT',
    // Restaurant behaviour
    'PREP_TIME_UPDATED',
] as const;

export type OrderEventType = typeof orderEventTypeValues[number];
export const orderEventTypeEnum = pgEnum('order_event_type', orderEventTypeValues);

const actorTypeValues = ['SYSTEM', 'RESTAURANT', 'DRIVER', 'CUSTOMER', 'ADMIN'] as const;
export const orderEventActorType = pgEnum('order_event_actor_type', actorTypeValues);

export const orderEvents = pgTable('order_events', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    orderId: uuid('order_id')
        .notNull()
        .references(() => orders.id, { onDelete: 'cascade' }),
    eventType: orderEventTypeEnum('event_type').notNull(),
    /** Business time — when the action actually happened */
    eventTs: timestamp('event_ts', { withTimezone: true, mode: 'string' }).notNull(),
    /** Wall-clock time the row was written — for late-ingestion detection */
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    actorType: orderEventActorType('actor_type'),
    actorId: uuid('actor_id'),
    /** Restaurant/business involved in this event */
    businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'set null' }),
    /** Driver involved in this event */
    driverId: uuid('driver_id').references(() => users.id, { onDelete: 'set null' }),
    /** Freeform payload for future analytics enrichment */
    metadata: jsonb('metadata'),
}, (t) => ([
    index('idx_order_events_order_id').on(t.orderId),
    index('idx_order_events_event_type').on(t.eventType),
    index('idx_order_events_event_ts').on(t.eventTs),
    index('idx_order_events_business_id').on(t.businessId),
    index('idx_order_events_driver_id').on(t.driverId),
]));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
    order: one(orders, {
        fields: [orderEvents.orderId],
        references: [orders.id],
    }),
    actor: one(users, {
        fields: [orderEvents.actorId],
        references: [users.id],
    }),
    business: one(businesses, {
        fields: [orderEvents.businessId],
        references: [businesses.id],
    }),
    driver: one(users, {
        fields: [orderEvents.driverId],
        references: [users.id],
    }),
}));

export type DbOrderEvent = typeof orderEvents.$inferSelect;
export type NewDbOrderEvent = typeof orderEvents.$inferInsert;
