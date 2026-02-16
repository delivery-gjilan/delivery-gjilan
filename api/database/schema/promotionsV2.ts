import { pgTable, uuid, text, integer, numeric, timestamp, boolean, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { businesses } from './businesses';
import { orders } from './orders';

// ==================== ENUMS ====================

export const promotionTypeEnum = pgEnum('promotion_type_v2', [
    'FIXED_AMOUNT',      // $5 off
    'PERCENTAGE',        // 20% off
    'FREE_DELIVERY',     // Free delivery
    'WALLET_CREDIT',     // Add to wallet
]);

export const promotionTargetEnum = pgEnum('promotion_target', [
    'ALL_USERS',         // Public promo code
    'SPECIFIC_USERS',    // Assigned to specific users
    'FIRST_ORDER',       // Auto-applied to first orders
    'CONDITIONAL',       // Spend X get Y
]);

export const walletTransactionTypeEnum = pgEnum('wallet_transaction_type', [
    'CREDIT',            // Money added
    'DEBIT',             // Money spent
    'REFUND',            // Refund from cancelled order
    'REFERRAL_REWARD',   // Earned from referral
    'ADMIN_ADJUSTMENT',  // Manual admin change
    'PROMOTION',         // From promotion
    'EXPIRATION',        // Credit expired
]);

// ==================== PROMOTIONS ====================

export const promotionsV2 = pgTable('promotions_v2', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    
    // Basic Info
    code: text('code').unique(), // Can be null for auto-applied promos
    name: text('name').notNull(),
    description: text('description'),
    
    // Type & Target
    type: promotionTypeEnum('type').notNull(),
    target: promotionTargetEnum('target').notNull(),
    
    // Discount Configuration
    discountValue: numeric('discount_value', { mode: 'number', precision: 10, scale: 2 }), // Amount or percentage
    maxDiscountCap: numeric('max_discount_cap', { mode: 'number', precision: 10, scale: 2 }), // Max discount for percentage
    
    // Conditions
    minOrderAmount: numeric('min_order_amount', { mode: 'number', precision: 10, scale: 2 }),
    
    // Spend Threshold (for conditional promos: "Spend $20 get $3 off")
    spendThreshold: numeric('spend_threshold', { mode: 'number', precision: 10, scale: 2 }),
    thresholdReward: jsonb('threshold_reward').$type<{
        type: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'FREE_DELIVERY';
        value?: number;
    }>(),
    
    // Usage Limits
    maxGlobalUsage: integer('max_global_usage'), // Total times this promo can be used
    maxUsagePerUser: integer('max_usage_per_user'), // Times each user can use
    currentGlobalUsage: integer('current_global_usage').default(0).notNull(),
    
    // Stacking Rules
    isStackable: boolean('is_stackable').default(false).notNull(),
    priority: integer('priority').default(0).notNull(), // Higher = applied first
    
    // Status & Timing
    isActive: boolean('is_active').default(true).notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true, mode: 'string' }),
    endsAt: timestamp('ends_at', { withTimezone: true, mode: 'string' }),
    
    // Analytics
    totalRevenue: numeric('total_revenue', { mode: 'number', precision: 12, scale: 2 }).default(0),
    totalUsageCount: integer('total_usage_count').default(0).notNull(),
    
    // Metadata
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    codeIdx: index('idx_promotions_v2_code').on(table.code),
    activeIdx: index('idx_promotions_v2_active').on(table.isActive, table.target),
    targetIdx: index('idx_promotions_v2_target').on(table.target),
}));

// ==================== USER PROMOTIONS (Assignments) ====================

export const userPromotions = pgTable('user_promotions', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull(),
    promotionId: uuid('promotion_id')
        .references(() => promotionsV2.id, { onDelete: 'cascade' })
        .notNull(),
    
    // Assignment metadata
    assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
    
    // Usage tracking
    usageCount: integer('usage_count').default(0).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'string' }),
    
    // Status
    isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
    userIdx: index('idx_user_promotions_user').on(table.userId),
    promoIdx: index('idx_user_promotions_promo').on(table.promotionId),
    activeIdx: index('idx_user_promotions_active').on(table.userId, table.isActive),
}));

// ==================== PROMOTION USAGE (Redemptions) ====================

export const promotionUsage = pgTable('promotion_usage', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    promotionId: uuid('promotion_id')
        .references(() => promotionsV2.id, { onDelete: 'cascade' })
        .notNull(),
    userId: uuid('user_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull(),
    orderId: uuid('order_id')
        .references(() => orders.id, { onDelete: 'cascade' })
        .notNull(),
    
    // Applied discount details
    discountAmount: numeric('discount_amount', { mode: 'number', precision: 10, scale: 2 }).notNull(),
    freeDeliveryApplied: boolean('free_delivery_applied').default(false).notNull(),
    
    // Context
    orderSubtotal: numeric('order_subtotal', { mode: 'number', precision: 10, scale: 2 }).notNull(),
    businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'set null' }),
    
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
}, (table) => ({
    promoIdx: index('idx_promotion_usage_promo').on(table.promotionId),
    userIdx: index('idx_promotion_usage_user').on(table.userId),
    orderIdx: index('idx_promotion_usage_order').on(table.orderId),
}));

// ==================== BUSINESS ELIGIBILITY ====================

export const promotionBusinessEligibility = pgTable('promotion_business_eligibility', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    promotionId: uuid('promotion_id')
        .references(() => promotionsV2.id, { onDelete: 'cascade' })
        .notNull(),
    businessId: uuid('business_id')
        .references(() => businesses.id, { onDelete: 'cascade' })
        .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
}, (table) => ({
    promoBusinessIdx: index('idx_promo_business').on(table.promotionId, table.businessId),
}));

// ==================== USER WALLET ====================

export const userWallet = pgTable('user_wallet', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull()
        .unique(),
    
    balance: numeric('balance', { mode: 'number', precision: 10, scale: 2 }).default(0).notNull(),
    
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    userIdx: index('idx_user_wallet_user').on(table.userId),
}));

// ==================== WALLET TRANSACTIONS ====================

export const walletTransactions = pgTable('wallet_transactions', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    walletId: uuid('wallet_id')
        .references(() => userWallet.id, { onDelete: 'cascade' })
        .notNull(),
    userId: uuid('user_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull(),
    
    type: walletTransactionTypeEnum('type').notNull(),
    amount: numeric('amount', { mode: 'number', precision: 10, scale: 2 }).notNull(),
    balanceBefore: numeric('balance_before', { mode: 'number', precision: 10, scale: 2 }).notNull(),
    balanceAfter: numeric('balance_after', { mode: 'number', precision: 10, scale: 2 }).notNull(),
    
    // References
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    promotionId: uuid('promotion_id').references(() => promotionsV2.id, { onDelete: 'set null' }),
    
    description: text('description'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
    
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
}, (table) => ({
    walletIdx: index('idx_wallet_transactions_wallet').on(table.walletId),
    userIdx: index('idx_wallet_transactions_user').on(table.userId),
    typeIdx: index('idx_wallet_transactions_type').on(table.type),
}));

// ==================== USER METADATA ====================

export const userPromoMetadata = pgTable('user_promo_metadata', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull()
        .unique(),
    
    hasUsedFirstOrderPromo: boolean('has_used_first_order_promo').default(false).notNull(),
    firstOrderPromoUsedAt: timestamp('first_order_promo_used_at', { withTimezone: true, mode: 'string' }),
    
    totalPromotionsUsed: integer('total_promotions_used').default(0).notNull(),
    totalSavings: numeric('total_savings', { mode: 'number', precision: 10, scale: 2 }).default(0).notNull(),
    
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    userIdx: index('idx_user_promo_metadata_user').on(table.userId),
}));

// ==================== RELATIONS ====================

export const promotionsV2Relations = relations(promotionsV2, ({ many, one }) => ({
    userAssignments: many(userPromotions),
    usage: many(promotionUsage),
    businessEligibility: many(promotionBusinessEligibility),
    walletTransactions: many(walletTransactions),
    creator: one(users, {
        fields: [promotionsV2.createdBy],
        references: [users.id],
    }),
}));

export const userPromotionsRelations = relations(userPromotions, ({ one }) => ({
    user: one(users, {
        fields: [userPromotions.userId],
        references: [users.id],
    }),
    promotion: one(promotionsV2, {
        fields: [userPromotions.promotionId],
        references: [promotionsV2.id],
    }),
    assignedByUser: one(users, {
        fields: [userPromotions.assignedBy],
        references: [users.id],
    }),
}));

export const promotionUsageRelations = relations(promotionUsage, ({ one }) => ({
    promotion: one(promotionsV2, {
        fields: [promotionUsage.promotionId],
        references: [promotionsV2.id],
    }),
    user: one(users, {
        fields: [promotionUsage.userId],
        references: [users.id],
    }),
    order: one(orders, {
        fields: [promotionUsage.orderId],
        references: [orders.id],
    }),
    business: one(businesses, {
        fields: [promotionUsage.businessId],
        references: [businesses.id],
    }),
}));

export const userWalletRelations = relations(userWallet, ({ one, many }) => ({
    user: one(users, {
        fields: [userWallet.userId],
        references: [users.id],
    }),
    transactions: many(walletTransactions),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
    wallet: one(userWallet, {
        fields: [walletTransactions.walletId],
        references: [userWallet.id],
    }),
    user: one(users, {
        fields: [walletTransactions.userId],
        references: [users.id],
    }),
    order: one(orders, {
        fields: [walletTransactions.orderId],
        references: [orders.id],
    }),
    promotion: one(promotionsV2, {
        fields: [walletTransactions.promotionId],
        references: [promotionsV2.id],
    }),
}));

export const userPromoMetadataRelations = relations(userPromoMetadata, ({ one }) => ({
    user: one(users, {
        fields: [userPromoMetadata.userId],
        references: [users.id],
    }),
}));

// ==================== TYPES ====================

export type DbPromotionV2 = typeof promotionsV2.$inferSelect;
export type NewDbPromotionV2 = typeof promotionsV2.$inferInsert;
export type DbUserPromotion = typeof userPromotions.$inferSelect;
export type NewDbUserPromotion = typeof userPromotions.$inferInsert;
export type DbPromotionUsage = typeof promotionUsage.$inferSelect;
export type NewDbPromotionUsage = typeof promotionUsage.$inferInsert;
export type DbUserWallet = typeof userWallet.$inferSelect;
export type NewDbUserWallet = typeof userWallet.$inferInsert;
export type DbWalletTransaction = typeof walletTransactions.$inferSelect;
export type NewDbWalletTransaction = typeof walletTransactions.$inferInsert;
export type DbUserPromoMetadata = typeof userPromoMetadata.$inferSelect;
export type NewDbUserPromoMetadata = typeof userPromoMetadata.$inferInsert;
