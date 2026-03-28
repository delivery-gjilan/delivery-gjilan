import { pgTable, uuid, integer, numeric, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

import { users } from './users';

export const userBehaviors = pgTable('user_behaviors', {
    userId: uuid('user_id')
        .primaryKey()
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    totalOrders: integer('total_orders').default(0).notNull(),
    deliveredOrders: integer('delivered_orders').default(0).notNull(),
    cancelledOrders: integer('cancelled_orders').default(0).notNull(),
    totalSpend: numeric('total_spend', { mode: 'number', precision: 10, scale: 2 }).default(0).notNull(),
    avgOrderValue: numeric('avg_order_value', { mode: 'number', precision: 10, scale: 2 }).default(0).notNull(),
    firstOrderAt: timestamp('first_order_at', { withTimezone: true, mode: 'string' }),
    lastOrderAt: timestamp('last_order_at', { withTimezone: true, mode: 'string' }),
    lastDeliveredAt: timestamp('last_delivered_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const userBehaviorsRelations = relations(userBehaviors, ({ one }) => ({
    user: one(users, {
        fields: [userBehaviors.userId],
        references: [users.id],
    }),
}));

export type DbUserBehavior = typeof userBehaviors.$inferSelect;
export type NewDbUserBehavior = typeof userBehaviors.$inferInsert;
