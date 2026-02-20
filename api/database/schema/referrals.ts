import { pgTable, uuid, text, timestamp, boolean, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

const referralStatusValues = ['PENDING', 'COMPLETED', 'EXPIRED'] as const;
export const referralStatusEnum = pgEnum('referral_status', referralStatusValues);

export const userReferrals = pgTable('user_referrals', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    referrerUserId: uuid('referrer_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    referredUserId: uuid('referred_user_id')
        .references(() => users.id, { onDelete: 'cascade' }),
    referralCode: text('referral_code').notNull().unique(),
    status: referralStatusEnum('status').default('PENDING').notNull(),
    rewardGiven: boolean('reward_given').default(false).notNull(),
    rewardAmount: decimal('reward_amount', { precision: 10, scale: 2 }),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const userReferralsRelations = relations(userReferrals, ({ one }) => ({
    referrer: one(users, {
        fields: [userReferrals.referrerUserId],
        references: [users.id],
    }),
    referred: one(users, {
        fields: [userReferrals.referredUserId],
        references: [users.id],
    }),
}));
