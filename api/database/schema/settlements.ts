import { pgTable, uuid, varchar, numeric, timestamp, pgEnum, index, boolean } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { drivers } from './drivers';
import { businesses } from './businesses';
import { orders } from './orders';
import { settlementRules, settlementDirection } from './settlementRules';
import { settlementPayments } from './settlementPayments';

export { settlementDirection };

const settlementTypeValues = ['DRIVER', 'BUSINESS'] as const;
export const settlementType = pgEnum('settlement_type', settlementTypeValues);

const settlementStatusValues = ['PENDING', 'PAID', 'OVERDUE', 'DISPUTED', 'CANCELLED'] as const;
export const settlementStatus = pgEnum('settlement_status', settlementStatusValues);

/**
 * Settlements table — who owes who and how much
 *
 * RECEIVABLE: the driver/business owes the platform
 * PAYABLE:    the platform owes the driver/business
 */
export const settlements = pgTable('settlements', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),

    type: settlementType('type').notNull(),
    direction: settlementDirection('direction').notNull(),

    driverId: uuid('driver_id').references(() => drivers.id, { onDelete: 'set null' }),
    businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'set null' }),
    orderId: uuid('order_id')
        .references(() => orders.id, { onDelete: 'cascade' }),

    // Which rule produced this settlement (null for manually created / backfilled)
    ruleId: uuid('rule_id').references(() => settlementRules.id, { onDelete: 'set null' }),

    // Which payment settled this settlement (set when is_settled = true via SettlingService)
    settlementPaymentId: uuid('settlement_payment_id').references(() => settlementPayments.id, { onDelete: 'set null' }),

    // If this is a carry-forward remainder settlement, which payment created it
    sourcePaymentId: uuid('source_payment_id').references(() => settlementPayments.id, { onDelete: 'set null' }),

    amount: numeric('amount', { mode: 'number', precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('EUR').notNull(),
    status: settlementStatus('status').default('PENDING').notNull(),

    /** Whether this settlement has been fully resolved (primary filter for active vs done) */
    isSettled: boolean('is_settled').default(false).notNull(),

    paidAt: timestamp('paid_at', { withTimezone: true, mode: 'string' }),
    paymentReference: varchar('payment_reference', { length: 100 }),
    paymentMethod: varchar('payment_method', { length: 50 }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
}, (t) => ([
    index('idx_settlements_order_id').on(t.orderId),
    index('idx_settlements_driver_id').on(t.driverId),
    index('idx_settlements_business_id').on(t.businessId),
    index('idx_settlements_status').on(t.status),
    index('idx_settlements_is_settled').on(t.isSettled),
    index('idx_settlements_type_direction').on(t.type, t.direction),
]));

export const settlementsRelations = relations(settlements, ({ one }) => ({
    driver: one(drivers, {
        fields: [settlements.driverId],
        references: [drivers.id],
    }),
    business: one(businesses, {
        fields: [settlements.businessId],
        references: [businesses.id],
    }),
    order: one(orders, {
        fields: [settlements.orderId],
        references: [orders.id],
    }),
    rule: one(settlementRules, {
        fields: [settlements.ruleId],
        references: [settlementRules.id],
    }),
    settlementPayment: one(settlementPayments, {
        fields: [settlements.settlementPaymentId],
        references: [settlementPayments.id],
        relationName: 'settledBy',
    }),
    sourcePayment: one(settlementPayments, {
        fields: [settlements.sourcePaymentId],
        references: [settlementPayments.id],
        relationName: 'spawnedFrom',
    }),
}));

export type DbSettlement = typeof settlements.$inferSelect;
export type NewDbSettlement = typeof settlements.$inferInsert;
