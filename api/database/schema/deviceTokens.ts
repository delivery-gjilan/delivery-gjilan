import { pgTable, uuid, text, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

const platformValues = ['IOS', 'ANDROID'] as const;
export const devicePlatformEnum = pgEnum('device_platform', platformValues);

const appTypeValues = ['CUSTOMER', 'DRIVER'] as const;
export const deviceAppTypeEnum = pgEnum('device_app_type', appTypeValues);

export type DevicePlatform = (typeof platformValues)[number];
export type DeviceAppType = (typeof appTypeValues)[number];

export const deviceTokens = pgTable(
    'device_tokens',
    {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        token: text('token').notNull(),
        platform: devicePlatformEnum('platform').notNull(),
        deviceId: text('device_id').notNull(),
        appType: deviceAppTypeEnum('app_type').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull()
            .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
    },
    (table) => [
        uniqueIndex('device_tokens_user_device_idx').on(table.userId, table.deviceId),
        uniqueIndex('device_tokens_token_idx').on(table.token),
    ],
);

export const deviceTokensRelations = relations(deviceTokens, ({ one }) => ({
    user: one(users, {
        fields: [deviceTokens.userId],
        references: [users.id],
    }),
}));

export type DbDeviceToken = typeof deviceTokens.$inferSelect;
export type NewDbDeviceToken = typeof deviceTokens.$inferInsert;
