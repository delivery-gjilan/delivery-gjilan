import { pgTable, uuid, varchar, boolean, timestamp, pgEnum, numeric } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { businesses } from './businesses';
import { promotions } from './promotions';

const entityTypeValues = ['DRIVER', 'BUSINESS'] as const;
export const settlementEntityType = pgEnum('settlement_entity_type', entityTypeValues);

const settlementDirectionValues = ['RECEIVABLE', 'PAYABLE'] as const;
export const settlementDirection = pgEnum('settlement_direction', settlementDirectionValues);

export const settlementRuleAmountType = pgEnum('settlement_rule_amount_type', ['FIXED', 'PERCENT']);

// What the rule applies to: order item price or delivery price
const settlementRuleTypeValues = ['ORDER_PRICE', 'DELIVERY_PRICE'] as const;
export const settlementRuleType = pgEnum('settlement_rule_type', settlementRuleTypeValues);

/**
 * Settlement Rules - commission/fee configuration
 *
 * A rule says: "for every order, create a settlement of X (fixed or % of actualPrice/deliveryPrice)
 * between the platform and a driver/business".
 *
 * Scoping (determines specificity for delivery rules):
 *   - businessId + promotionId set → most specific (business+promotion combo)
 *   - promotionId set (no business) → promotion-only
 *   - businessId set (no promotion) → business-only
 *   - both null                     → global: applies to every order
 *
 * Rule application:
 *   - DELIVERY_PRICE rules: most-specific-wins (only the most specific scope level is applied)
 *   - ORDER_PRICE rules: stack all (every matching rule at every scope level is applied)
 */
export const settlementRules = pgTable('settlement_rules', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),

    // Human-readable label, e.g. "10% commission on subtotal"
    name: varchar('name', { length: 200 }).notNull(),

    // What the rule applies to
    type: settlementRuleType('type').notNull(),

    // Whether this settlement is for a driver or a business
    entityType: settlementEntityType('entity_type').notNull(),

    // From the platform's point of view:
    //   RECEIVABLE = the driver/business owes the platform
    //   PAYABLE    = the platform owes the driver/business
    direction: settlementDirection('direction').notNull(),

    // FIXED: amount is euros per order
    // PERCENT: amount is a percentage (0–100) applied to the base
    //   For ORDER_PRICE type: % of actualPrice
    //   For DELIVERY_PRICE type: % of deliveryPrice
    amountType: settlementRuleAmountType('amount_type').notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),

    // For PERCENT rules only: cap the calculated amount at this value (euros).
    // null = no cap.
    maxAmount: numeric('max_amount', { precision: 10, scale: 2 }),

    // Scope (both null = global rule)
    businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'set null' }),
    promotionId: uuid('promotion_id').references(() => promotions.id, { onDelete: 'set null' }),

    isActive: boolean('is_active').default(true).notNull(),
    isDeleted: boolean('is_deleted').default(false).notNull(),
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
