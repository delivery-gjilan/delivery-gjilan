import { pgTable, uuid, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

/**
 * Available permissions for business users
 * 
 * Order Management:
 * - view_orders: Can view orders for their business
 * - manage_orders: Can update order status, assign drivers
 * 
 * Product Management:
 * - view_products: Can view products and inventory
 * - manage_products: Can create, update, delete products and manage stock
 * 
 * Financial:
 * - view_finances: Can view settlements and financial reports
 * 
 * Settings:
 * - manage_settings: Can edit business settings (hours, commission, etc.)
 * 
 * Analytics:
 * - view_analytics: Can view business statistics and reports
 */
const permissionValues = [
    'view_orders',
    'manage_orders',
    'view_products',
    'manage_products',
    'view_finances',
    'manage_settings',
    'view_analytics',
] as const;

export type UserPermission = typeof permissionValues[number];

export const userPermissionEnum = pgEnum('user_permission', permissionValues);

export const userPermissions = pgTable('user_permissions', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull(),
    permission: userPermissionEnum('permission').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
}, (t) => ([
    index('idx_user_permissions_user_id').on(t.userId),
]));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
    user: one(users, {
        fields: [userPermissions.userId],
        references: [users.id],
    }),
}));

export type DbUserPermission = typeof userPermissions.$inferSelect;
export type NewDbUserPermission = typeof userPermissions.$inferInsert;
