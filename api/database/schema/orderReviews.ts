import { relations, sql } from 'drizzle-orm';
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';
import { orders } from './orders';
import { users } from './users';

export const orderReviews = pgTable(
    'order_reviews',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        orderId: uuid('order_id')
            .notNull()
            .references(() => orders.id, { onDelete: 'cascade' }),
        businessId: uuid('business_id')
            .notNull()
            .references(() => businesses.id, { onDelete: 'cascade' }),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        rating: integer('rating').notNull(),
        comment: varchar('comment', { length: 1000 }),
        quickFeedback: text('quick_feedback').array().notNull().default(sql`ARRAY[]::text[]`),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull()
            .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
    },
    (t) => [
        uniqueIndex('idx_order_reviews_order_id_unique').on(t.orderId),
        index('idx_order_reviews_business_id').on(t.businessId),
        index('idx_order_reviews_user_id').on(t.userId),
    ],
);

export const orderReviewsRelations = relations(orderReviews, ({ one }) => ({
    order: one(orders, {
        fields: [orderReviews.orderId],
        references: [orders.id],
    }),
    business: one(businesses, {
        fields: [orderReviews.businessId],
        references: [businesses.id],
    }),
    user: one(users, {
        fields: [orderReviews.userId],
        references: [users.id],
    }),
}));

export type DbOrderReview = typeof orderReviews.$inferSelect;
export type NewDbOrderReview = typeof orderReviews.$inferInsert;