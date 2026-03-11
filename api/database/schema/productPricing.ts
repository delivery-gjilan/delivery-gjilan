import { pgTable, uuid, numeric, timestamp, jsonb, boolean, varchar, pgEnum, integer } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { products } from './products';
import { businesses } from './businesses';

const pricingConditionTypeValues = [
    'TIME_OF_DAY',
    'DAY_OF_WEEK',
    'WEATHER',
    'DEMAND',
    'SPECIAL_EVENT',
    'CUSTOM'
] as const;
export const pricingConditionType = pgEnum('pricing_condition_type', pricingConditionTypeValues);

/**
 * Product Pricing Configuration
 * Stores base pricing (business + platform) and pricing history
 */
export const productPricing = pgTable('product_pricing', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    
    productId: uuid('product_id')
        .notNull()
        .unique()
        .references(() => products.id, { onDelete: 'cascade' }),
    
    businessId: uuid('business_id')
        .notNull()
        .references(() => businesses.id, { onDelete: 'cascade' }),
    
    // Base pricing (what's always true)
    businessPrice: numeric('business_price', { precision: 10, scale: 2 }).notNull(),
    platformMarkup: numeric('platform_markup', { precision: 10, scale: 2 }).default('0').notNull(),
    baseCustomerPrice: numeric('base_customer_price', { precision: 10, scale: 2 }).notNull(),
    
    // Pricing history for audit trail
    priceHistory: jsonb('price_history').$type<PriceHistoryEntry[]>().default(sql`'[]'::jsonb`).notNull(),
    
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

/**
 * Dynamic Pricing Rules (conditional pricing adjustments)
 * E.g., +20% after midnight, +10% when raining, surge pricing
 */
export const dynamicPricingRules = pgTable('dynamic_pricing_rules', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    
    // Can apply to specific business or all businesses
    businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }),
    
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 500 }),
    
    // Condition type
    conditionType: pricingConditionType('condition_type').notNull(),
    
    /**
     * Condition configuration
     * 
     * TIME_OF_DAY: { startHour: 0, endHour: 6, daysOfWeek: [0,1,2,3,4,5,6] }
     * DAY_OF_WEEK: { days: [6, 0], description: 'Weekends' }
     * WEATHER: { conditions: ['rain', 'snow'], minIntensity: 'moderate' }
     * DEMAND: { algorithm: 'surge', multiplierRange: [1.1, 2.0] }
     * SPECIAL_EVENT: { eventId: 'uuid', activeFrom: '...', activeTo: '...' }
     * CUSTOM: { expression: '...', params: {...} }
     */
    conditionConfig: jsonb('condition_config').notNull(),
    
    /**
     * Adjustment configuration
     * 
     * { type: 'PERCENTAGE', value: 20 } // +20%
     * { type: 'FIXED_AMOUNT', value: 1.50 } // +€1.50
     * { type: 'MULTIPLIER', value: 1.5 } // 1.5x
     */
    adjustmentConfig: jsonb('adjustment_config').notNull(),
    
    // Scope - what products does this apply to?
    appliesTo: jsonb('applies_to').$type<{
        categoryIds?: string[];
        subcategoryIds?: string[];
        productIds?: string[];
        allProducts?: boolean;
    }>().notNull(),
    
    // Active status
    isActive: boolean('is_active').default(true).notNull(),
    priority: integer('priority').default(0).notNull(),
    
    // Validity period
    validFrom: timestamp('valid_from', { withTimezone: true, mode: 'string' }),
    validUntil: timestamp('valid_until', { withTimezone: true, mode: 'string' }),
    
    // Audit
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const productPricingRelations = relations(productPricing, ({ one }) => ({
    product: one(products, {
        fields: [productPricing.productId],
        references: [products.id],
    }),
    business: one(businesses, {
        fields: [productPricing.businessId],
        references: [businesses.id],
    }),
}));

export const dynamicPricingRulesRelations = relations(dynamicPricingRules, ({ one }) => ({
    business: one(businesses, {
        fields: [dynamicPricingRules.businessId],
        references: [businesses.id],
    }),
}));

export type DbProductPricing = typeof productPricing.$inferSelect;
export type NewDbProductPricing = typeof productPricing.$inferInsert;
export type DbDynamicPricingRule = typeof dynamicPricingRules.$inferSelect;
export type NewDbDynamicPricingRule = typeof dynamicPricingRules.$inferInsert;

// Type definitions
export type PriceHistoryEntry = {
    businessPrice: string;
    platformMarkup: string;
    baseCustomerPrice: string;
    changedAt: string;
    changedBy: string | null;
    reason?: string;
};

export type TimeOfDayCondition = {
    startHour: number;
    endHour: number;
    daysOfWeek?: number[]; // 0=Sunday, 6=Saturday
};

export type DayOfWeekCondition = {
    days: number[];
    description?: string;
};

export type WeatherCondition = {
    conditions: ('rain' | 'snow' | 'storm' | 'extreme_heat' | 'extreme_cold')[];
    minIntensity?: 'light' | 'moderate' | 'heavy';
};

export type AdjustmentConfig = 
    | { type: 'PERCENTAGE'; value: number }
    | { type: 'FIXED_AMOUNT'; value: number }
    | { type: 'MULTIPLIER'; value: number };
