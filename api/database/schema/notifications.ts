import { pgTable, uuid, text, timestamp, pgEnum, jsonb, integer, index, boolean, real } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { deviceAppTypeEnum, devicePlatformEnum } from './deviceTokens';

// ── Notification type enum ──────────────────────────────────────────
const notificationTypeValues = ['ORDER_STATUS', 'ORDER_ASSIGNED', 'PROMOTIONAL', 'ADMIN_ALERT'] as const;
export const notificationTypeEnum = pgEnum('notification_type', notificationTypeValues);
export type NotificationType = (typeof notificationTypeValues)[number];

// ── Campaign status enum ────────────────────────────────────────────
const campaignStatusValues = ['DRAFT', 'SENDING', 'SENT', 'FAILED'] as const;
export const campaignStatusEnum = pgEnum('campaign_status', campaignStatusValues);
export type CampaignStatus = (typeof campaignStatusValues)[number];

// ── Push telemetry event enum ─────────────────────────────────────
const pushTelemetryEventTypeValues = [
    'RECEIVED',
    'OPENED',
    'ACTION_TAPPED',
    'TOKEN_REGISTERED',
    'TOKEN_REFRESHED',
    'TOKEN_UNREGISTERED',
] as const;
export const pushTelemetryEventTypeEnum = pgEnum('push_telemetry_event_type', pushTelemetryEventTypeValues);
export type PushTelemetryEventType = (typeof pushTelemetryEventTypeValues)[number];

// ── notification_campaigns table ────────────────────────────────────
export const notificationCampaigns = pgTable('notification_campaigns', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>(),
    imageUrl: text('image_url'),
    timeSensitive: boolean('time_sensitive').default(false).notNull(),
    category: text('category'),
    relevanceScore: real('relevance_score'),
    query: jsonb('query').$type<Record<string, unknown>>(),
    targetCount: integer('target_count').default(0).notNull(),
    sentCount: integer('sent_count').default(0).notNull(),
    failedCount: integer('failed_count').default(0).notNull(),
    status: campaignStatusEnum('status').default('DRAFT').notNull(),
    sentBy: uuid('sent_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'string' }),
});

export const notificationCampaignsRelations = relations(notificationCampaigns, ({ one }) => ({
    sender: one(users, {
        fields: [notificationCampaigns.sentBy],
        references: [users.id],
    }),
}));

// ── notifications table (individual notification log) ───────────────
export const notifications = pgTable('notifications', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>(),
    type: notificationTypeEnum('type').notNull(),
    campaignId: uuid('campaign_id').references(() => notificationCampaigns.id, { onDelete: 'set null' }),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
}, (t) => ([
    index('idx_notifications_user_id').on(t.userId),
]));

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, {
        fields: [notifications.userId],
        references: [users.id],
    }),
    campaign: one(notificationCampaigns, {
        fields: [notifications.campaignId],
        references: [notificationCampaigns.id],
    }),
}));

// ── push_telemetry_events table ───────────────────────────────────
export const pushTelemetryEvents = pgTable('push_telemetry_events', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    appType: deviceAppTypeEnum('app_type').notNull(),
    platform: devicePlatformEnum('platform').notNull(),
    eventType: pushTelemetryEventTypeEnum('event_type').notNull(),
    token: text('token'),
    deviceId: text('device_id'),
    notificationTitle: text('notification_title'),
    notificationBody: text('notification_body'),
    campaignId: uuid('campaign_id').references(() => notificationCampaigns.id, { onDelete: 'set null' }),
    orderId: uuid('order_id'),
    actionId: text('action_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
}, (t) => ([
    index('idx_push_telemetry_events_created_at').on(t.createdAt),
    index('idx_push_telemetry_events_event_type').on(t.eventType),
    index('idx_push_telemetry_events_app_type').on(t.appType),
    index('idx_push_telemetry_events_platform').on(t.platform),
    index('idx_push_telemetry_events_user_id').on(t.userId),
]));

export const pushTelemetryEventsRelations = relations(pushTelemetryEvents, ({ one }) => ({
    user: one(users, {
        fields: [pushTelemetryEvents.userId],
        references: [users.id],
    }),
    campaign: one(notificationCampaigns, {
        fields: [pushTelemetryEvents.campaignId],
        references: [notificationCampaigns.id],
    }),
}));

export type DbNotification = typeof notifications.$inferSelect;
export type NewDbNotification = typeof notifications.$inferInsert;
export type DbNotificationCampaign = typeof notificationCampaigns.$inferSelect;
export type NewDbNotificationCampaign = typeof notificationCampaigns.$inferInsert;
export type DbPushTelemetryEvent = typeof pushTelemetryEvents.$inferSelect;
export type NewDbPushTelemetryEvent = typeof pushTelemetryEvents.$inferInsert;
