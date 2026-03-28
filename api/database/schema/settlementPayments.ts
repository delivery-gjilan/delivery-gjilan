import { pgTable, uuid, numeric, varchar, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { drivers } from './drivers';
import { businesses } from './businesses';
import { users } from './users';
import { settlementEntityType } from './settlementRules';

const paymentDirectionValues = ['ENTITY_TO_PLATFORM', 'PLATFORM_TO_ENTITY'] as const;
export const settlementPaymentDirection = pgEnum('settlement_payment_direction', paymentDirectionValues);

/**
 * settlement_payments — records of actual money exchanged between
 * the platform and a driver/business during a settling operation.
 *
 * When an admin settles with a business or driver:
 *  1. A payment row is created here (how much was paid, direction, method).
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

        /** Who paid whom */
        direction: settlementPaymentDirection('direction').notNull(),

        /** The net balance that existed at the time of settling (audit trail) */
        totalBalanceAtTime: numeric('total_balance_at_time', { mode: 'number', precision: 10, scale: 2 }).notNull(),

        paymentMethod: varchar('payment_method', { length: 50 }),
        paymentReference: varchar('payment_reference', { length: 100 }),
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
