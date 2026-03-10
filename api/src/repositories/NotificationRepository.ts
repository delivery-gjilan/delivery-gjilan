import { DbType } from '@/database';
import {
    deviceTokens,
    DbDeviceToken,
    NewDbDeviceToken,
} from '@/database/schema/deviceTokens';
import {
    notifications,
    notificationCampaigns,
    DbNotification,
    NewDbNotification,
    DbNotificationCampaign,
    NewDbNotificationCampaign,
} from '@/database/schema/notifications';
import { eq, inArray, and, sql } from 'drizzle-orm';

export class NotificationRepository {
    constructor(private db: DbType) {}

    // ── Device tokens ───────────────────────────────────────────────

    async upsertDeviceToken(data: NewDbDeviceToken): Promise<DbDeviceToken> {
        // Delete all existing tokens for this user first, then insert the new one.
        // A user/device only needs one active FCM token at a time.
        await this.db
            .delete(deviceTokens)
            .where(eq(deviceTokens.userId, data.userId));

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

    async removeDeviceTokensByIds(tokens: string[]): Promise<void> {
        if (tokens.length === 0) return;
        await this.db.delete(deviceTokens).where(inArray(deviceTokens.token, tokens));
    }

    async getTokensByUserId(userId: string): Promise<DbDeviceToken[]> {
        return this.db.select().from(deviceTokens).where(eq(deviceTokens.userId, userId));
    }

    async getTokensByUserIds(userIds: string[]): Promise<DbDeviceToken[]> {
        if (userIds.length === 0) return [];
        return this.db.select().from(deviceTokens).where(inArray(deviceTokens.userId, userIds));
    }

    async removeTokensForUser(userId: string): Promise<void> {
        await this.db.delete(deviceTokens).where(eq(deviceTokens.userId, userId));
    }

    async removeTokenForUserDevice(userId: string, deviceId: string): Promise<void> {
        await this.db
            .delete(deviceTokens)
            .where(and(eq(deviceTokens.userId, userId), eq(deviceTokens.deviceId, deviceId)));
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
