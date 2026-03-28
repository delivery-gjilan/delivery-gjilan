import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { orders } from './orders';

/**
 * Live Activity tokens for iOS Dynamic Island delivery tracking.
 * These are separate from regular push notification tokens and are
 * specific to a single order's Live Activity session.
 */
export const liveActivityTokens = pgTable('live_activity_tokens', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
        .notNull()
        .references(() => orders.id, { onDelete: 'cascade' }),
    activityId: text('activity_id').notNull().unique(), // iOS ActivityKit activity ID
    pushToken: text('push_token').notNull().unique(), // Push token for updating this specific Live Activity
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const liveActivityTokensRelations = relations(liveActivityTokens, ({ one }) => ({
    user: one(users, {
        fields: [liveActivityTokens.userId],
        references: [users.id],
    }),
    order: one(orders, {
        fields: [liveActivityTokens.orderId],
        references: [orders.id],
    }),
}));

export type DbLiveActivityToken = typeof liveActivityTokens.$inferSelect;
export type NewDbLiveActivityToken = typeof liveActivityTokens.$inferInsert;
