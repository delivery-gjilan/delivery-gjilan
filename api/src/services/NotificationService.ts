import { getMessaging, getFirebaseApp } from '@/lib/firebase';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { NotificationType } from '@/database/schema/notifications';
import { DeviceAppType, DevicePlatform } from '@/database/schema/deviceTokens';
import logger from '@/lib/logger';
import type { Message, MulticastMessage } from 'firebase-admin/messaging';

/** Returns true only if Firebase was successfully initialized at startup. */
function isFirebaseReady(): boolean {
    try {
        getFirebaseApp();
        return true;
    } catch {
        return false;
    }
}

export interface NotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    /** Image URL to display in the notification (optional) */
    imageUrl?: string;
}

export interface SendResult {
    successCount: number;
    failureCount: number;
    staleTokens: string[];
}

export class NotificationService {
    constructor(public readonly repo: NotificationRepository) {}

    // ────────────────────────────────────────────────────────────────
    // Token management
    // ────────────────────────────────────────────────────────────────

    async registerToken(
        userId: string,
        token: string,
        platform: DevicePlatform,
        deviceId: string,
        appType: DeviceAppType,
    ) {
        return this.repo.upsertDeviceToken({ userId, token, platform, deviceId, appType });
    }

    async unregisterToken(token: string) {
        return this.repo.removeDeviceToken(token);
    }

    async unregisterAllTokensForUser(userId: string) {
        return this.repo.removeTokensForUser(userId);
    }

    // ────────────────────────────────────────────────────────────────
    // Send to a single user (all their devices)
    // ────────────────────────────────────────────────────────────────

    async sendToUser(
        userId: string,
        payload: NotificationPayload,
        type: NotificationType,
    ): Promise<SendResult> {
        const tokens = await this.repo.getTokensByUserId(userId);
        if (tokens.length === 0) {
            logger.debug({ userId }, 'No device tokens for user, skipping push');
            return { successCount: 0, failureCount: 0, staleTokens: [] };
        }

        const tokenStrings = tokens.map((t) => t.token);
        const result = await this.sendMulticast(tokenStrings, payload);

        // Log the notification
        await this.repo.createNotification({
            userId,
            title: payload.title,
            body: payload.body,
            data: payload.data as Record<string, unknown> | undefined,
            type,
        });

        return result;
    }

    // ────────────────────────────────────────────────────────────────
    // Send to multiple users
    // ────────────────────────────────────────────────────────────────

    async sendToUsers(
        userIds: string[],
        payload: NotificationPayload,
        type: NotificationType,
    ): Promise<SendResult> {
        if (userIds.length === 0) return { successCount: 0, failureCount: 0, staleTokens: [] };

        const allTokens = await this.repo.getTokensByUserIds(userIds);
        if (allTokens.length === 0) {
            logger.debug({ userCount: userIds.length }, 'No device tokens for any users, skipping push');
            return { successCount: 0, failureCount: 0, staleTokens: [] };
        }

        const tokenStrings = allTokens.map((t) => t.token);
        const result = await this.sendMulticast(tokenStrings, payload);

        // Log notifications for all users
        const notificationRecords = userIds.map((uid) => ({
            userId: uid,
            title: payload.title,
            body: payload.body,
            data: payload.data as Record<string, unknown> | undefined,
            type,
        }));
        await this.repo.createNotifications(notificationRecords);

        return result;
    }

    // ────────────────────────────────────────────────────────────────
    // Send to a topic (e.g., "admins")
    // ────────────────────────────────────────────────────────────────

    async sendToTopic(topic: string, payload: NotificationPayload): Promise<string> {
        if (!isFirebaseReady()) {
            logger.warn({ topic }, 'Firebase not initialized — skipping sendToTopic');
            return '';
        }
        const messaging = getMessaging();
        const message: Message = {
            topic,
            notification: {
                title: payload.title,
                body: payload.body,
                imageUrl: payload.imageUrl,
            },
            data: payload.data,
            android: {
                priority: 'high' as const,
                notification: {
                    channelId: 'default',
                    sound: 'default',
                },
            },
            apns: {
                payload: {
                    aps: {
                        alert: { title: payload.title, body: payload.body },
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        };

        const messageId = await messaging.send(message);
        logger.info({ topic, messageId }, 'Sent push to topic');
        return messageId;
    }

    // ────────────────────────────────────────────────────────────────
    // Low-level multicast with stale-token cleanup
    // ────────────────────────────────────────────────────────────────

    private async sendMulticast(tokens: string[], payload: NotificationPayload): Promise<SendResult> {
        if (tokens.length === 0) return { successCount: 0, failureCount: 0, staleTokens: [] };

        if (!isFirebaseReady()) {
            logger.warn('Firebase not initialized — skipping push notification delivery');
            return { successCount: 0, failureCount: 0, staleTokens: [] };
        }

        const messaging = getMessaging();

        // FCM sendEachForMulticast accepts up to 500 tokens
        const BATCH_SIZE = 500;
        let totalSuccess = 0;
        let totalFailure = 0;
        const allStaleTokens: string[] = [];

        for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
            const batch = tokens.slice(i, i + BATCH_SIZE);

            const multicastMessage: MulticastMessage = {
                tokens: batch,
                notification: {
                    title: payload.title,
                    body: payload.body,
                    imageUrl: payload.imageUrl,
                },
                data: payload.data,
                android: {
                    priority: 'high' as const,
                    notification: {
                        channelId: 'default',
                        sound: 'default',
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            alert: { title: payload.title, body: payload.body },
                            sound: 'default',
                            badge: 1,
                        },
                    },
                },
            };

            const response = await messaging.sendEachForMulticast(multicastMessage);

            totalSuccess += response.successCount;
            totalFailure += response.failureCount;

            // Identify stale/invalid tokens
            response.responses.forEach((resp, idx) => {
                const token = batch[idx];
                if (!token) return;
                if (resp.error) {
                    const code = resp.error.code;
                    if (
                        code === 'messaging/registration-token-not-registered' ||
                        code === 'messaging/invalid-registration-token'
                    ) {
                        allStaleTokens.push(token);
                    } else {
                        logger.warn({ token, errorCode: code }, 'FCM send error');
                    }
                }
            });
        }

        // Clean up stale tokens
        if (allStaleTokens.length > 0) {
            logger.info({ count: allStaleTokens.length }, 'Removing stale FCM tokens');
            await this.repo.removeDeviceTokensByIds(allStaleTokens);
        }

        logger.info({ successCount: totalSuccess, failureCount: totalFailure }, 'Multicast push result');
        return { successCount: totalSuccess, failureCount: totalFailure, staleTokens: allStaleTokens };
    }
}
