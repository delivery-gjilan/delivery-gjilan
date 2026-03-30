import { pgTable, uuid, numeric, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { drivers } from './drivers';
import { businesses } from './businesses';
import { users } from './users';
import { settlementEntityType } from './settlementRules';

/**
 * settlement_payments — records of actual money exchanged between
 * the platform and a driver/business during a settling operation.
 *
 * When an admin settles with a business or driver:
 *  1. A payment row is created here (how much was paid).
 *  2. All related unsettled settlements are marked is_settled = true
 *     and linked via settlement_payment_id.
 *  3. If the payment was partial (less than the net balance), a new
 *     carry-forward settlement is created with source_payment_id pointing here.
 */
export const settlementPayments = pgTable(
    'settlement_payments',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),

        /** DRIVER or BUSINESS — who this payment involves */
        entityType: settlementEntityType('entity_type').notNull(),

        driverId: uuid('driver_id').references(() => drivers.id, { onDelete: 'set null' }),
        businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'set null' }),

        /** The actual amount of money exchanged */
        amount: numeric('amount', { mode: 'number', precision: 10, scale: 2 }).notNull(),

        note: text('note'),

        createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),

        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (t) => ([
        index('idx_settlement_payments_entity_type').on(t.entityType),
        index('idx_settlement_payments_driver_id').on(t.driverId),
        index('idx_settlement_payments_business_id').on(t.businessId),
        index('idx_settlement_payments_created_at').on(t.createdAt),
    ]),
);

export const settlementPaymentsRelations = relations(settlementPayments, ({ one }) => ({
    driver: one(drivers, {
        fields: [settlementPayments.driverId],
        references: [drivers.id],
    }),
    business: one(businesses, {
        fields: [settlementPayments.businessId],
        references: [businesses.id],
    }),
    createdBy: one(users, {
        fields: [settlementPayments.createdByUserId],
        references: [users.id],
    }),
}));

export type DbSettlementPayment = typeof settlementPayments.$inferSelect;
export type NewDbSettlementPayment = typeof settlementPayments.$inferInsert;
