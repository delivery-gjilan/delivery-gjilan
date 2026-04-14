import { pgTable, uuid, varchar, timestamp, pgEnum, jsonb, text, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

// User types who can perform actions
const actorTypeValues = ['ADMIN', 'BUSINESS', 'DRIVER', 'CUSTOMER', 'SYSTEM'] as const;
export const actorType = pgEnum('actor_type', actorTypeValues);

// Types of actions that can be logged
const actionTypeValues = [
    // User management
    'USER_CREATED',
    'USER_UPDATED',
    'USER_DELETED',
    'USER_ROLE_CHANGED',
    
    // Business management
    'BUSINESS_CREATED',
    'BUSINESS_UPDATED',
    'BUSINESS_DELETED',
    'BUSINESS_APPROVED',
    'BUSINESS_REJECTED',
    
    // Product management
    'PRODUCT_CREATED',
    'PRODUCT_UPDATED',
    'PRODUCT_DELETED',
    'PRODUCT_PUBLISHED',
    'PRODUCT_UNPUBLISHED',
    'PRODUCT_AVAILABILITY_CHANGED',
    'PRODUCT_PRICE_CHANGED',
    
    // Order management
    'ORDER_CREATED',
    'ORDER_UPDATED',
    'ORDER_STATUS_CHANGED',
    'ORDER_CANCELLED',
    'ORDER_ASSIGNED',
    'ORDER_DELIVERED',
    'ORDER_ITEM_REMOVED',
    
    // Settlement management
    'SETTLEMENT_CREATED',
    'SETTLEMENT_PAID',
    'SETTLEMENT_PARTIAL_PAID',
    'SETTLEMENT_UNSETTLED',
    
    // Driver management
    'DRIVER_CREATED',
    'DRIVER_UPDATED',
    'DRIVER_APPROVED',
    'DRIVER_REJECTED',
    'DRIVER_STATUS_CHANGED',
    
    // Authentication
    'USER_LOGIN',
    'USER_LOGOUT',
    'PASSWORD_CHANGED',
    'PASSWORD_RESET',
    
    // Category management
    'CATEGORY_CREATED',
    'CATEGORY_UPDATED',
    'CATEGORY_DELETED',
    'SUBCATEGORY_CREATED',
    'SUBCATEGORY_UPDATED',
    'SUBCATEGORY_DELETED',
] as const;
export const actionType = pgEnum('action_type', actionTypeValues);

// Types of entities that actions can be performed on
const entityTypeValues = [
    'USER',
    'BUSINESS',
    'PRODUCT',
    'ORDER',
    'SETTLEMENT',
    'DRIVER',
    'CATEGORY',
    'SUBCATEGORY',
    'DELIVERY_ZONE',
] as const;
export const entityType = pgEnum('entity_type', entityTypeValues);

/**
 * Audit logs table - tracks all significant actions in the system
 */
export const auditLogs = pgTable('audit_logs', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    
    // Who performed the action (can be null for system actions)
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorType: actorType('actor_type').notNull(),
    
    // What action was performed
    action: actionType('action').notNull(),
    
    // What entity was affected
    entityType: entityType('entity_type').notNull(),
    entityId: uuid('entity_id'), // Can be null if entity was deleted
    
    // Additional context as JSON
    metadata: jsonb('metadata'), // e.g., { oldValue: "x", newValue: "y", changes: [...] }
    
    // Request context
    ipAddress: varchar('ip_address', { length: 45 }), // IPv6 max length
    userAgent: text('user_agent'),
    
    // Timestamp
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
}, (t) => ([
    index('idx_audit_logs_actor_id').on(t.actorId),
    index('idx_audit_logs_entity').on(t.entityType, t.entityId),
    index('idx_audit_logs_created_at').on(t.createdAt),
]));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    actor: one(users, {
        fields: [auditLogs.actorId],
        references: [users.id],
    }),
}));

export type DbAuditLog = typeof auditLogs.$inferSelect;
export type NewDbAuditLog = typeof auditLogs.$inferInsert;
export type ActionType = typeof actionTypeValues[number];
export type EntityType = typeof entityTypeValues[number];
export type ActorType = typeof actorTypeValues[number];
