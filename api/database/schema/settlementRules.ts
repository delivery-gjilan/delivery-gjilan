import { pgTable, uuid, varchar, boolean, timestamp, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { drivers } from './drivers';
import { businesses } from './businesses';

const ruleTypeValues = [
    'PERCENTAGE',
    'FIXED_PER_ORDER',
    'PRODUCT_MARKUP',
    'DRIVER_VEHICLE_BONUS',
    'CUSTOM'
] as const;
export const ruleType = pgEnum('settlement_rule_type', ruleTypeValues);

const entityTypeValues = ['DRIVER', 'BUSINESS'] as const;
export const settlementEntityType = pgEnum('settlement_entity_type', entityTypeValues);

/**
 * Settlement Rules - Flexible commission/fee configuration
 * 
 * Supports multiple rule types per entity with stacking capability
 * Complete audit trail with activation history
 */
export const settlementRules = pgTable('settlement_rules', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    
    // Entity this rule applies to
    entityType: settlementEntityType('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(), // driver.id or business.id
    
    // Rule type determines calculation logic
    ruleType: ruleType('rule_type').notNull(),
    
    /**
     * Flexible configuration for different rule types
     * 
     * PERCENTAGE: { percentage: 10.5, appliesTo: 'ORDER_SUBTOTAL' | 'DELIVERY_FEE' }
     * FIXED_PER_ORDER: { amount: 2.50, description: 'Flat fee' }
     * PRODUCT_MARKUP: Built-in via products table pricing
     * DRIVER_VEHICLE_BONUS: { amount: 1.50, condition: 'HAS_OWN_VEHICLE' }
     * CUSTOM: { formula: 'custom logic', params: {...} }
     */
    config: jsonb('config').notNull(),
    
    // Stacking and priority
    canStackWith: jsonb('can_stack_with').$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    priority: integer('priority').default(0).notNull(), // Lower = calculated first
    
    // Active status and tracking
    isActive: boolean('is_active').default(true).notNull(),
    activatedAt: timestamp('activated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    activatedBy: uuid('activated_by'), // admin user ID
    
    // Notes for admin reference
    notes: varchar('notes', { length: 500 }),
    
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const settlementRulesRelations = relations(settlementRules, ({ one }) => ({
    driver: one(drivers, {
        fields: [settlementRules.entityId],
        references: [drivers.id],
    }),
    business: one(businesses, {
        fields: [settlementRules.entityId],
        references: [businesses.id],
    }),
}));

export type DbSettlementRule = typeof settlementRules.$inferSelect;
export type NewDbSettlementRule = typeof settlementRules.$inferInsert;

// Type definitions for config JSONB
export type PercentageRuleConfig = {
    percentage: number;
    appliesTo: 'ORDER_SUBTOTAL' | 'DELIVERY_FEE';
};

export type FixedPerOrderRuleConfig = {
    amount: number;
    description?: string;
};

export type DriverVehicleBonusConfig = {
    amount: number;
    condition: 'HAS_OWN_VEHICLE' | 'HAS_MOTORCYCLE' | 'HAS_BICYCLE';
    description?: string;
};

export type CustomRuleConfig = {
    formula: string;
    params: Record<string, any>;
    description?: string;
};

export type RuleConfig = 
    | PercentageRuleConfig 
    | FixedPerOrderRuleConfig 
    | DriverVehicleBonusConfig 
    | CustomRuleConfig;
