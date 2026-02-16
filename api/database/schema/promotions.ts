import { pgTable, uuid, text, integer, numeric, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { promotionRedemptions } from './promotionRedemptions';

const promotionTypeValues = ['FIXED_DISCOUNT', 'PERCENT_DISCOUNT', 'FREE_DELIVERY', 'REFERRAL'] as const;
export const promotionTypeEnum = pgEnum('promotion_type', promotionTypeValues);

export const promotions = pgTable('promotions', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    type: promotionTypeEnum('type').notNull(),
    value: numeric('value', { mode: 'number', precision: 10, scale: 2 }).default(0).notNull(),
    maxRedemptions: integer('max_redemptions'),
    maxRedemptionsPerUser: integer('max_redemptions_per_user'),
    freeDeliveryCount: integer('free_delivery_count'),
    firstOrderOnly: boolean('first_order_only').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    autoApply: boolean('auto_apply').default(false).notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true, mode: 'string' }),
    endsAt: timestamp('ends_at', { withTimezone: true, mode: 'string' }),
    referrerUserId: uuid('referrer_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const promotionTargetUsers = pgTable('promotion_target_users', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    promotionId: uuid('promotion_id')
        .references(() => promotions.id, { onDelete: 'cascade' })
        .notNull(),
    userId: uuid('user_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
});

export const promotionsRelations = relations(promotions, ({ many, one }) => ({
    redemptions: many(promotionRedemptions),
    targetUsers: many(promotionTargetUsers),
    referrer: one(users, {
        fields: [promotions.referrerUserId],
        references: [users.id],
    }),
}));

export const promotionTargetUsersRelations = relations(promotionTargetUsers, ({ one }) => ({
    promotion: one(promotions, {
        fields: [promotionTargetUsers.promotionId],
        references: [promotions.id],
    }),
    user: one(users, {
        fields: [promotionTargetUsers.userId],
        references: [users.id],
    }),
}));

export type DbPromotion = typeof promotions.$inferSelect;
export type NewDbPromotion = typeof promotions.$inferInsert;
export type DbPromotionTargetUser = typeof promotionTargetUsers.$inferSelect;
export type NewDbPromotionTargetUser = typeof promotionTargetUsers.$inferInsert;
