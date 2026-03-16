import { DbType } from '@/database';
import {
    deviceTokens,
    DbDeviceToken,
    NewDbDeviceToken,
} from '@/database/schema/deviceTokens';
import {
    notifications,
    notificationCampaigns,
    pushTelemetryEvents,
    businessDeviceHealth,
    DbNotification,
    NewDbNotification,
    DbNotificationCampaign,
    NewDbNotificationCampaign,
    DbPushTelemetryEvent,
    NewDbPushTelemetryEvent,
    DbBusinessDeviceHealth,
} from '@/database/schema/notifications';
import { eq, inArray, and, sql, gte, desc } from 'drizzle-orm';

export interface PushTelemetryEventsFilter {
    hours?: number;
    appType?: DbPushTelemetryEvent['appType'];
    platform?: DbPushTelemetryEvent['platform'];
    eventType?: DbPushTelemetryEvent['eventType'];
    limit?: number;
}

export interface PushTelemetrySummary {
    totalEvents: number;
    byEvent: Array<{ key: string; count: number }>;
    byAppType: Array<{ key: string; count: number }>;
    byPlatform: Array<{ key: string; count: number }>;
}

export class NotificationRepository {
    constructor(private db: DbType) {}

    // ── Device tokens ───────────────────────────────────────────────

    async upsertDeviceToken(data: NewDbDeviceToken): Promise<DbDeviceToken> {
        // Keep one token per user+device+appType, while still allowing true multi-device users.
        await this.removeTokenForUserDeviceAppType(data.userId, data.deviceId, data.appType);

        const [row] = await this.db
            .insert(deviceTokens)
            .values(data)
            .onConflictDoUpdate({
                target: deviceTokens.token,
                set: {
                    userId: data.userId,
                    deviceId: data.deviceId,
                    platform: data.platform,
                    appType: data.appType,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                },
            })
            .returning();

        return row!;
    }

    async removeDeviceToken(token: string): Promise<void> {
        await this.db.delete(deviceTokens).where(eq(deviceTokens.token, token));
    }

    async removeDeviceTokenForUser(token: string, userId: string): Promise<void> {
        await this.db
            .delete(deviceTokens)
            .where(and(eq(deviceTokens.token, token), eq(deviceTokens.userId, userId)));
    }

    async removeDeviceTokensByIds(tokens: string[]): Promise<void> {
        if (tokens.length === 0) return;
        await this.db.delete(deviceTokens).where(inArray(deviceTokens.token, tokens));
    }

    async getTokensByUserId(userId: string): Promise<DbDeviceToken[]> {
        return this.db.select().from(deviceTokens).where(eq(deviceTokens.userId, userId));
    }

    async getTokensByUserIdAndAppType(
        userId: string,
        appType: DbDeviceToken['appType'],
    ): Promise<DbDeviceToken[]> {
        return this.db
            .select()
            .from(deviceTokens)
            .where(and(eq(deviceTokens.userId, userId), eq(deviceTokens.appType, appType)));
    }

    async getTokensByUserIds(userIds: string[]): Promise<DbDeviceToken[]> {
        if (userIds.length === 0) return [];
        return this.db.select().from(deviceTokens).where(inArray(deviceTokens.userId, userIds));
    }

    async getTokensByUserIdsAndAppType(
        userIds: string[],
        appType: DbDeviceToken['appType'],
    ): Promise<DbDeviceToken[]> {
        if (userIds.length === 0) return [];
        return this.db
            .select()
            .from(deviceTokens)
            .where(and(inArray(deviceTokens.userId, userIds), eq(deviceTokens.appType, appType)));
    }

    async removeTokensForUser(userId: string): Promise<void> {
        await this.db.delete(deviceTokens).where(eq(deviceTokens.userId, userId));
    }

    async removeTokenForUserDevice(userId: string, deviceId: string): Promise<void> {
        await this.db
            .delete(deviceTokens)
            .where(and(eq(deviceTokens.userId, userId), eq(deviceTokens.deviceId, deviceId)));
    }

    async removeTokenForUserDeviceAppType(userId: string, deviceId: string, appType: DbDeviceToken['appType']): Promise<void> {
        await this.db
            .delete(deviceTokens)
            .where(
                and(
                    eq(deviceTokens.userId, userId),
                    eq(deviceTokens.deviceId, deviceId),
                    eq(deviceTokens.appType, appType),
                ),
            );
    }

    // ── Notifications log ───────────────────────────────────────────

    async createNotification(data: NewDbNotification): Promise<DbNotification> {
        const [notification] = await this.db.insert(notifications).values(data).returning();
        return notification!;
    }

    async createNotifications(data: NewDbNotification[]): Promise<void> {
        if (data.length === 0) return;
        await this.db.insert(notifications).values(data);
    }

    async createPushTelemetryEvent(data: NewDbPushTelemetryEvent): Promise<DbPushTelemetryEvent> {
        const [event] = await this.db.insert(pushTelemetryEvents).values(data).returning();
        return event!;
    }

    async getPushTelemetryEvents(filter: PushTelemetryEventsFilter): Promise<DbPushTelemetryEvent[]> {
        const conditions = [];
        const hours = filter.hours ?? 24;
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        conditions.push(gte(pushTelemetryEvents.createdAt, since));

        if (filter.appType) {
            conditions.push(eq(pushTelemetryEvents.appType, filter.appType));
        }

        if (filter.platform) {
            conditions.push(eq(pushTelemetryEvents.platform, filter.platform));
        }

        if (filter.eventType) {
            conditions.push(eq(pushTelemetryEvents.eventType, filter.eventType));
        }

        return this.db
            .select()
            .from(pushTelemetryEvents)
            .where(and(...conditions))
            .orderBy(desc(pushTelemetryEvents.createdAt))
            .limit(Math.min(Math.max(filter.limit ?? 100, 1), 500));
    }

    async getPushTelemetrySummary(hours = 24): Promise<PushTelemetrySummary> {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        const timeCondition = gte(pushTelemetryEvents.createdAt, since);

        const [totalRow] = await this.db
            .select({ count: sql<number>`COUNT(*)::INT` })
            .from(pushTelemetryEvents)
            .where(timeCondition);

        const byEventRows = await this.db
            .select({
                key: pushTelemetryEvents.eventType,
                count: sql<number>`COUNT(*)::INT`,
            })
            .from(pushTelemetryEvents)
            .where(timeCondition)
            .groupBy(pushTelemetryEvents.eventType);

        const byAppTypeRows = await this.db
            .select({
                key: pushTelemetryEvents.appType,
                count: sql<number>`COUNT(*)::INT`,
            })
            .from(pushTelemetryEvents)
            .where(timeCondition)
            .groupBy(pushTelemetryEvents.appType);

        const byPlatformRows = await this.db
            .select({
                key: pushTelemetryEvents.platform,
                count: sql<number>`COUNT(*)::INT`,
            })
            .from(pushTelemetryEvents)
            .where(timeCondition)
            .groupBy(pushTelemetryEvents.platform);

        return {
            totalEvents: totalRow?.count ?? 0,
            byEvent: byEventRows,
            byAppType: byAppTypeRows,
            byPlatform: byPlatformRows,
        };
    }

    async upsertBusinessDeviceHeartbeat(data: {
        userId: string;
        businessId: string;
        deviceId: string;
        platform: DbBusinessDeviceHealth['platform'];
        appVersion?: string | null;
        appState?: string | null;
        networkType?: string | null;
        batteryLevel?: number | null;
        isCharging?: boolean | null;
        subscriptionAlive: boolean;
        metadata?: Record<string, unknown>;
    }): Promise<DbBusinessDeviceHealth> {
        const now = new Date().toISOString();

        const [row] = await this.db
            .insert(businessDeviceHealth)
            .values({
                userId: data.userId,
                businessId: data.businessId,
                deviceId: data.deviceId,
                platform: data.platform,
                appVersion: data.appVersion ?? null,
                appState: data.appState ?? null,
                networkType: data.networkType ?? null,
                batteryLevel: data.batteryLevel ?? null,
                isCharging: data.isCharging ?? null,
                subscriptionAlive: data.subscriptionAlive,
                lastHeartbeatAt: now,
                metadata: data.metadata,
            })
            .onConflictDoUpdate({
                target: [businessDeviceHealth.userId, businessDeviceHealth.deviceId],
                set: {
                    businessId: data.businessId,
                    platform: data.platform,
                    appVersion: data.appVersion ?? null,
                    appState: data.appState ?? null,
                    networkType: data.networkType ?? null,
                    batteryLevel: data.batteryLevel ?? null,
                    isCharging: data.isCharging ?? null,
                    subscriptionAlive: data.subscriptionAlive,
                    lastHeartbeatAt: now,
                    metadata: data.metadata,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                },
            })
            .returning();

        return row!;
    }

    async touchBusinessDeviceOrderSignal(userId: string, deviceId: string, orderId?: string): Promise<void> {
        const now = new Date().toISOString();
        await this.db
            .update(businessDeviceHealth)
            .set({
                lastOrderSignalAt: now,
                lastOrderId: orderId ?? null,
                updatedAt: sql`CURRENT_TIMESTAMP`,
            })
            .where(and(eq(businessDeviceHealth.userId, userId), eq(businessDeviceHealth.deviceId, deviceId)));
    }

    async touchBusinessDevicePushReceived(userId: string, deviceId: string): Promise<void> {
        const now = new Date().toISOString();
        await this.db
            .update(businessDeviceHealth)
            .set({
                lastPushReceivedAt: now,
                updatedAt: sql`CURRENT_TIMESTAMP`,
            })
            .where(and(eq(businessDeviceHealth.userId, userId), eq(businessDeviceHealth.deviceId, deviceId)));
    }

    async getBusinessDeviceHealthRows(hours = 24): Promise<DbBusinessDeviceHealth[]> {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        return this.db
            .select()
            .from(businessDeviceHealth)
            .where(gte(businessDeviceHealth.lastHeartbeatAt, since))
            .orderBy(desc(businessDeviceHealth.lastHeartbeatAt));
    }

    // ── Campaigns ───────────────────────────────────────────────────

    async createCampaign(data: NewDbNotificationCampaign): Promise<DbNotificationCampaign> {
        const [campaign] = await this.db.insert(notificationCampaigns).values(data).returning();
        return campaign!;
    }

    async getCampaignById(id: string): Promise<DbNotificationCampaign | undefined> {
        const [campaign] = await this.db
            .select()
            .from(notificationCampaigns)
            .where(eq(notificationCampaigns.id, id));
        return campaign;
    }

    async updateCampaign(
        id: string,
        data: Partial<NewDbNotificationCampaign>,
    ): Promise<DbNotificationCampaign | undefined> {
        const [campaign] = await this.db
            .update(notificationCampaigns)
            .set(data)
            .where(eq(notificationCampaigns.id, id))
            .returning();
        return campaign;
    }

    async getAllCampaigns(): Promise<DbNotificationCampaign[]> {
        return this.db
            .select()
            .from(notificationCampaigns)
            .orderBy(notificationCampaigns.createdAt);
    }

    async deleteCampaign(id: string): Promise<boolean> {
        const result = await this.db
            .delete(notificationCampaigns)
            .where(and(eq(notificationCampaigns.id, id), eq(notificationCampaigns.status, 'DRAFT')))
            .returning();
        return result.length > 0;
    }
}
