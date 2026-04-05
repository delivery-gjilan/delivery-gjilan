import { pgTable, uuid, numeric, varchar, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { businesses } from './businesses';
import { drivers } from './drivers';
import { users } from './users';
import { settlementEntityType } from './settlementRules';

const settlementRequestStatusValues = [
    'PENDING_APPROVAL',
    'ACCEPTED',
    'DISPUTED',
    'EXPIRED',
    'CANCELLED',
] as const;

export const settlementRequestStatus = pgEnum(
    'settlement_request_status',
    settlementRequestStatusValues,
);

export type SettlementRequestStatusValue = (typeof settlementRequestStatusValues)[number];

/**
 * settlement_requests — admin-initiated requests asking a business or driver
 * to acknowledge and approve a financial settlement for a given period.
 *
 * Flow:
 *  1. Admin calls createSettlementRequest  → row inserted (PENDING_APPROVAL),
 *     push notification sent to business/driver.
 *  2. Entity taps Accept                   → status becomes ACCEPTED,
 *     matching unsettled settlements are settled via SettlingService.
 *  3. Entity taps Dispute                  → status becomes DISPUTED,
 *     admin notified for manual review.
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

        requestedByUserId: uuid('requested_by_user_id').references(() => users.id, {
            onDelete: 'set null',
        }),

        /** The total commission amount the admin is requesting settlement for */
        amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
        currency: varchar('currency', { length: 3 }).default('EUR').notNull(),

        /** Inclusive date range this settlement covers */
        periodStart: timestamp('period_start', { withTimezone: true, mode: 'string' }).notNull(),
        periodEnd: timestamp('period_end', { withTimezone: true, mode: 'string' }).notNull(),

        /** Optional message from the admin */
        note: text('note'),

        status: settlementRequestStatus('status').default('PENDING_APPROVAL').notNull(),

        /** When the business owner responded */
        respondedAt: timestamp('responded_at', { withTimezone: true, mode: 'string' }),
        respondedByUserId: uuid('responded_by_user_id').references(() => users.id, {
            onDelete: 'set null',
        }),

        /** Reason supplied by the business when disputing */
        disputeReason: text('dispute_reason'),

        /** Request auto-expires after this timestamp */
        expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),

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
    requestedBy: one(users, {
        fields: [settlementRequests.requestedByUserId],
        references: [users.id],
        relationName: 'requestedBy',
    }),
    respondedBy: one(users, {
        fields: [settlementRequests.respondedByUserId],
        references: [users.id],
        relationName: 'respondedBy',
    }),
}));

export type DbSettlementRequest = typeof settlementRequests.$inferSelect;
export type NewDbSettlementRequest = typeof settlementRequests.$inferInsert;
