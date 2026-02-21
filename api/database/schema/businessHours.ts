import { sql } from 'drizzle-orm';
import { pgTable, uuid, integer, timestamp, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { businesses } from './businesses';

/**
 * Per-day-of-week operating hours for businesses.
 *
 * dayOfWeek: 0 = Sunday, 1 = Monday, … 6 = Saturday  (matches JS Date.getDay())
 * opensAt / closesAt: minutes from midnight  (e.g. 600 = 10:00, 1380 = 23:00)
 *
 * A missing row for a given day means the business is **closed** that day.
 * Multiple rows per day are allowed for split shifts (e.g. 08:00-12:00 & 17:00-23:00).
 */
export const businessHours = pgTable(
    'business_hours',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        businessId: uuid('business_id')
            .notNull()
            .references(() => businesses.id, { onDelete: 'cascade' }),
        dayOfWeek: integer('day_of_week').notNull(), // 0-6
        opensAt: integer('opens_at').notNull(),       // minutes from midnight
        closesAt: integer('closes_at').notNull(),     // minutes from midnight
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (t) => [
        unique('uq_business_day_open').on(t.businessId, t.dayOfWeek, t.opensAt),
    ],
);

export const businessHoursRelations = relations(businessHours, ({ one }) => ({
    business: one(businesses, {
        fields: [businessHours.businessId],
        references: [businesses.id],
    }),
}));

export type DbBusinessHours = typeof businessHours.$inferSelect;
export type NewDbBusinessHours = typeof businessHours.$inferInsert;
