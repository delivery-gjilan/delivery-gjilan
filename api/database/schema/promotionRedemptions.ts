import { pgTable, uuid, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { promotions } from './promotions';
import { users } from './users';
import { orders } from './orders';

export const promotionRedemptions = pgTable('promotion_redemptions', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    promotionId: uuid('promotion_id')
        .notNull()
        .references(() => promotions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
        .notNull()
        .references(() => orders.id, { onDelete: 'cascade' }),
    discountAmount: numeric('discount_amount', { mode: 'number', precision: 10, scale: 2 }).default(0).notNull(),
    freeDeliveryApplied: boolean('free_delivery_applied').default(false).notNull(),
    referrerUserId: uuid('referrer_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
});

export const promotionRedemptionsRelations = relations(promotionRedemptions, ({ one }) => ({
    promotion: one(promotions, {
        fields: [promotionRedemptions.promotionId],
        references: [promotions.id],
    }),
    user: one(users, {
        fields: [promotionRedemptions.userId],
        references: [users.id],
    }),
    order: one(orders, {
        fields: [promotionRedemptions.orderId],
        references: [orders.id],
    }),
    referrer: one(users, {
        fields: [promotionRedemptions.referrerUserId],
        references: [users.id],
    }),
}));

export type DbPromotionRedemption = typeof promotionRedemptions.$inferSelect;
export type NewDbPromotionRedemption = typeof promotionRedemptions.$inferInsert;
