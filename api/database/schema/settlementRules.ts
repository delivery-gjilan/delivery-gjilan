import { pgTable, uuid, varchar, boolean, timestamp, pgEnum, numeric } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { businesses } from './businesses';
import { promotions } from './promotions';

const entityTypeValues = ['DRIVER', 'BUSINESS'] as const;
export const settlementEntityType = pgEnum('settlement_entity_type', entityTypeValues);

const settlementDirectionValues = ['RECEIVABLE', 'PAYABLE'] as const;
export const settlementDirection = pgEnum('settlement_direction', settlementDirectionValues);

export const settlementRuleAmountType = pgEnum('settlement_rule_amount_type', ['FIXED', 'PERCENT']);

/**
 * Settlement Rules - simple commission/fee configuration
 *
 * A rule says: "for every order, create a settlement of X (fixed or % of subtotal/delivery fee)
 * between the platform and a driver/business".
 *
 * Scoping:
 *   - businessId set  → rule only applies to orders from that business
 *   - promotionId set → rule only applies to orders that used that promotion
 *   - both null       → global: applies to every order
 */
export const settlementRules = pgTable('settlement_rules', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),

    // Human-readable label, e.g. "10% commission on subtotal"
    name: varchar('name', { length: 200 }).notNull(),

    // Whether this settlement is for a driver or a business
    entityType: settlementEntityType('entity_type').notNull(),

    // From the platform's point of view:
    //   RECEIVABLE = the driver/business owes the platform
    //   PAYABLE    = the platform owes the driver/business
    direction: settlementDirection('direction').notNull(),

    // FIXED: amount is euros per order
    // PERCENT: amount is a percentage (0–100) applied to the base
    amountType: settlementRuleAmountType('amount_type').notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),

    // Only used when amountType = PERCENT: which value to apply % to
    // 'SUBTOTAL' = order item total, 'DELIVERY_FEE' = delivery charge
    appliesTo: varchar('applies_to', { length: 20 }),

    // Scope (both null = global rule)
    businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'set null' }),
    promotionId: uuid('promotion_id').references(() => promotions.id, { onDelete: 'set null' }),

    isActive: boolean('is_active').default(true).notNull(),
    notes: varchar('notes', { length: 500 }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const settlementRulesRelations = relations(settlementRules, ({ one }) => ({
    business: one(businesses, {
        fields: [settlementRules.businessId],
        references: [businesses.id],
    }),
    promotion: one(promotions, {
        fields: [settlementRules.promotionId],
        references: [promotions.id],
    }),
}));

export type DbSettlementRule = typeof settlementRules.$inferSelect;
export type NewDbSettlementRule = typeof settlementRules.$inferInsert;
