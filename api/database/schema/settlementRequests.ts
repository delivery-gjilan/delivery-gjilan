import { pgTable, uuid, numeric, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { businesses } from './businesses';
import { drivers } from './drivers';
import { users } from './users';
import { settlementEntityType } from './settlementRules';
import { settlementPayments } from './settlementPayments';

const settlementRequestStatusValues = [
    'PENDING',
    'ACCEPTED',
    'REJECTED',
] as const;

export const settlementRequestStatus = pgEnum(
    'settlement_request_status',
    settlementRequestStatusValues,
);

export type SettlementRequestStatusValue = (typeof settlementRequestStatusValues)[number];

/**
 * settlement_requests — admin-initiated requests asking a business or driver
 * to acknowledge and approve a financial settlement.
 *
 * Flow:
 *  1. Admin calls createSettlementRequest  → row inserted (PENDING),
 *     push notification sent to business/driver.
 *  2. Entity taps Accept                   → status becomes ACCEPTED,
 *     all unsettled settlements are settled via SettlingService,
 *     settlement_payment_id is linked.
 *  3. Entity taps Reject                   → status becomes REJECTED,
 *     reason is stored, admin notified.
 */
export const settlementRequests = pgTable(
    'settlement_requests',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),

        /** DRIVER or BUSINESS — who this request targets */
        entityType: settlementEntityType('entity_type').default('BUSINESS').notNull(),

        businessId: uuid('business_id')
            .references(() => businesses.id, { onDelete: 'cascade' }),

        driverId: uuid('driver_id')
            .references(() => drivers.id, { onDelete: 'cascade' }),

        /** The total amount the admin is requesting settlement for */
        amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),

        /** Optional message from the admin */
        note: text('note'),

        status: settlementRequestStatus('status').default('PENDING').notNull(),

        /** When the business/driver responded */
        respondedAt: timestamp('responded_at', { withTimezone: true, mode: 'string' }),
        respondedByUserId: uuid('responded_by_user_id').references(() => users.id, {
            onDelete: 'set null',
        }),

        /** Reason supplied when rejecting */
        reason: text('reason'),

        /** The payment created when this request is accepted */
        settlementPaymentId: uuid('settlement_payment_id').references(() => settlementPayments.id, {
            onDelete: 'set null',
        }),

        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull()
            .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
    },
    (t) => ([
        index('idx_settlement_requests_business_id').on(t.businessId),
        index('idx_settlement_requests_driver_id').on(t.driverId),
        index('idx_settlement_requests_entity_type').on(t.entityType),
        index('idx_settlement_requests_status').on(t.status),
        index('idx_settlement_requests_created_at').on(t.createdAt),
    ]),
);

export const settlementRequestsRelations = relations(settlementRequests, ({ one }) => ({
    business: one(businesses, {
        fields: [settlementRequests.businessId],
        references: [businesses.id],
    }),
    driver: one(drivers, {
        fields: [settlementRequests.driverId],
        references: [drivers.id],
    }),
    respondedBy: one(users, {
        fields: [settlementRequests.respondedByUserId],
        references: [users.id],
    }),
    settlementPayment: one(settlementPayments, {
        fields: [settlementRequests.settlementPaymentId],
        references: [settlementPayments.id],
    }),
}));

export type DbSettlementRequest = typeof settlementRequests.$inferSelect;
export type NewDbSettlementRequest = typeof settlementRequests.$inferInsert;
