import { pgTable, uuid, text, integer, numeric, timestamp, boolean, pgEnum, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { businesses } from './businesses';
import { orders } from './orders';

// ==================== ENUMS ====================

export const promotionTypeEnum = pgEnum('promotion_type', [
    'FIXED_AMOUNT', // Fixed € off
    'PERCENTAGE', // % off
    'FREE_DELIVERY', // Free delivery
    'SPEND_X_GET_FREE', // Spend X → free delivery
    'SPEND_X_PERCENT', // Spend X → % discount
    'SPEND_X_FIXED', // Spend X → fixed € discount
]);

export const promotionTargetEnum = pgEnum('promotion_target', [
    'ALL_USERS', // Public promo code
    'SPECIFIC_USERS', // Assigned to specific users
    'FIRST_ORDER', // Auto-applied to first orders
    'NEW_USERS', // Auto-applied/eligible for users within a signup-age window
    'CONDITIONAL', // Spend X get Y (legacy; prefer SPEND_X_* types)
]);

export const promotionScheduleTypeEnum = pgEnum('promotion_schedule_type', [
    'ALWAYS',
    'DATE_RANGE',
    'RECURRING',
]);

export const promotionCreatorTypeEnum = pgEnum('promotion_creator_type', [
    'PLATFORM', // Created by platform admin
    'BUSINESS', // Created by (or on behalf of) a business
]);

// ==================== PROMOTIONS ====================

// Use the canonical `promotions` table name in the database.
// This file defines the `promotions` table shape used throughout the codebase.
export const promotions = pgTable(
    'promotions',
    {
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
        maxDiscountCap: numeric('max_discount_cap', { mode: 'number', precision: 10, scale: 2 }),
        // Max discount for percentage

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
        scheduleType: promotionScheduleTypeEnum('schedule_type').default('DATE_RANGE').notNull(),
        scheduleTimezone: text('schedule_timezone'),
        dailyStartTime: text('daily_start_time'), // HH:mm in schedule timezone
        dailyEndTime: text('daily_end_time'), // HH:mm in schedule timezone
        activeWeekdays: jsonb('active_weekdays').$type<number[]>(), // 0=Sun ... 6=Sat

        // Applies when target=NEW_USERS: user must be within N days since signup.
        newUserWindowDays: integer('new_user_window_days'),

        // Analytics
        totalRevenue: numeric('total_revenue', { mode: 'number', precision: 12, scale: 2 }).default(0),
        totalUsageCount: integer('total_usage_count').default(0).notNull(),

        // Creator tracking
        creatorType: promotionCreatorTypeEnum('creator_type').default('PLATFORM').notNull(),
        creatorId: uuid('creator_id').references(() => businesses.id, { onDelete: 'set null' }), // null = platform

        // Recovery / compensation flag — hidden from main promotions list
        isRecovery: boolean('is_recovery').default(false).notNull(),

        // For recovery promos: the order that triggered the compensation
        orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),

        // Soft-delete
        isDeleted: boolean('is_deleted').default(false).notNull(),

        // Metadata
        createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull()
            .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
    },
    (table) => ({
        codeIdx: index('idx_promotions_code').on(table.code),
        activeIdx: index('idx_promotions_active').on(table.isActive, table.target),
        targetIdx: index('idx_promotions_target').on(table.target),
    }),
);

// ==================== USER PROMOTIONS (Assignments) ====================

export const userPromotions = pgTable(
    'user_promotions',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        userId: uuid('user_id')
            .references(() => users.id, { onDelete: 'cascade' })
            .notNull(),
        promotionId: uuid('promotion_id')
            .references(() => promotions.id, { onDelete: 'cascade' })
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
    },
    (table) => ({
        userIdx: index('idx_user_promotions_user').on(table.userId),
        promoIdx: index('idx_user_promotions_promo').on(table.promotionId),
        activeIdx: index('idx_user_promotions_active').on(table.userId, table.isActive),
    }),
);

// ==================== PROMOTION USAGE (Redemptions) ====================

export const promotionUsage = pgTable(
    'promotion_usage',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        promotionId: uuid('promotion_id')
            .references(() => promotions.id, { onDelete: 'cascade' })
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
    },
    (table) => ({
        promoIdx: index('idx_promotion_usage_promo').on(table.promotionId),
        userIdx: index('idx_promotion_usage_user').on(table.userId),
        orderIdx: index('idx_promotion_usage_order').on(table.orderId),
    }),
);

// ==================== BUSINESS ELIGIBILITY ====================

export const promotionBusinessEligibility = pgTable(
    'promotion_business_eligibility',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        promotionId: uuid('promotion_id')
            .references(() => promotions.id, { onDelete: 'cascade' })
            .notNull(),
        businessId: uuid('business_id')
            .references(() => businesses.id, { onDelete: 'cascade' })
            .notNull(),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (table) => ({
        promoBusinessIdx: index('idx_promo_business').on(table.promotionId, table.businessId),
    }),
);

// ==================== PERSISTENT AUDIENCE GROUPS ====================

export const promotionAudienceGroups = pgTable(
    'promotion_audience_groups',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        name: text('name').notNull(),
        description: text('description'),
        isActive: boolean('is_active').default(true).notNull(),
        createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull()
            .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
    },
    (table) => ({
        nameIdx: index('idx_promotion_audience_groups_name').on(table.name),
        activeIdx: index('idx_promotion_audience_groups_active').on(table.isActive),
    }),
);

export const promotionAudienceGroupMembers = pgTable(
    'promotion_audience_group_members',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        groupId: uuid('group_id')
            .references(() => promotionAudienceGroups.id, { onDelete: 'cascade' })
            .notNull(),
        userId: uuid('user_id')
            .references(() => users.id, { onDelete: 'cascade' })
            .notNull(),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (table) => ({
        groupIdx: index('idx_promotion_audience_group_members_group').on(table.groupId),
        userIdx: index('idx_promotion_audience_group_members_user').on(table.userId),
        groupUserUnique: uniqueIndex('uq_promotion_audience_group_members_group_user').on(table.groupId, table.userId),
    }),
);

// ==================== USER METADATA ====================

export const userPromoMetadata = pgTable(
    'user_promo_metadata',
    {
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
    },
    (table) => ({
        userIdx: index('idx_user_promo_metadata_user').on(table.userId),
    }),
);

// ==================== RELATIONS ====================

export const promotionsRelations = relations(promotions, ({ many, one }) => ({
    userAssignments: many(userPromotions),
    usage: many(promotionUsage),
    businessEligibility: many(promotionBusinessEligibility),
    creatorBusiness: one(businesses, {
        fields: [promotions.creatorId],
        references: [businesses.id],
    }),
    creator: one(users, {
        fields: [promotions.createdBy],
        references: [users.id],
    }),
}));

export const userPromotionsRelations = relations(userPromotions, ({ one }) => ({
    user: one(users, {
        fields: [userPromotions.userId],
        references: [users.id],
    }),
    promotion: one(promotions, {
        fields: [userPromotions.promotionId],
        references: [promotions.id],
    }),
    assignedByUser: one(users, {
        fields: [userPromotions.assignedBy],
        references: [users.id],
    }),
}));

export const promotionUsageRelations = relations(promotionUsage, ({ one }) => ({
    promotion: one(promotions, {
        fields: [promotionUsage.promotionId],
        references: [promotions.id],
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

export const userPromoMetadataRelations = relations(userPromoMetadata, ({ one }) => ({
    user: one(users, {
        fields: [userPromoMetadata.userId],
        references: [users.id],
    }),
}));

export const promotionAudienceGroupsRelations = relations(promotionAudienceGroups, ({ many, one }) => ({
    members: many(promotionAudienceGroupMembers),
    createdByUser: one(users, {
        fields: [promotionAudienceGroups.createdBy],
        references: [users.id],
    }),
}));

export const promotionAudienceGroupMembersRelations = relations(promotionAudienceGroupMembers, ({ one }) => ({
    group: one(promotionAudienceGroups, {
        fields: [promotionAudienceGroupMembers.groupId],
        references: [promotionAudienceGroups.id],
    }),
    user: one(users, {
        fields: [promotionAudienceGroupMembers.userId],
        references: [users.id],
    }),
}));

// ==================== TYPES ====================

export type DbPromotion = typeof promotions.$inferSelect;
export type NewDbPromotion = typeof promotions.$inferInsert;
export type DbUserPromotion = typeof userPromotions.$inferSelect;
export type NewDbUserPromotion = typeof userPromotions.$inferInsert;
export type DbPromotionUsage = typeof promotionUsage.$inferSelect;
export type NewDbPromotionUsage = typeof promotionUsage.$inferInsert;
export type DbUserPromoMetadata = typeof userPromoMetadata.$inferSelect;
export type NewDbUserPromoMetadata = typeof userPromoMetadata.$inferInsert;
export type DbPromotionAudienceGroup = typeof promotionAudienceGroups.$inferSelect;
export type NewDbPromotionAudienceGroup = typeof promotionAudienceGroups.$inferInsert;
export type DbPromotionAudienceGroupMember = typeof promotionAudienceGroupMembers.$inferSelect;
export type NewDbPromotionAudienceGroupMember = typeof promotionAudienceGroupMembers.$inferInsert;
