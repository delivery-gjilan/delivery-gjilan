import { getMessaging } from '@/lib/firebase';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { NotificationType, PushTelemetryEventType } from '@/database/schema/notifications';
import { DeviceAppType, DevicePlatform } from '@/database/schema/deviceTokens';
import logger from '@/lib/logger';
import type { Message, MulticastMessage } from 'firebase-admin/messaging';
import { LiveActivityTokenRepository } from '@/repositories/LiveActivityTokenRepository';
import { cache } from '@/lib/cache';

const LIVE_ACTIVITY_MIN_UPDATE_INTERVAL_SECONDS = Number(
    process.env.LIVE_ACTIVITY_MIN_UPDATE_INTERVAL_SECONDS ?? 15,
);
const LIVE_ACTIVITY_MIN_ETA_DELTA_MINUTES = Number(
    process.env.LIVE_ACTIVITY_MIN_ETA_DELTA_MINUTES ?? 1,
);

type LiveActivityUpdateGate = {
    status: 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
    estimatedMinutes: number;
    sentAtMs: number;
};

export interface NotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    /** Image URL to display in the notification (optional) */
    imageUrl?: string;
    /** Mark as time-sensitive to bypass Focus modes (iOS 15+) */
    timeSensitive?: boolean;
    /** Notification category for interactive actions (e.g., "order-delivered") */
    category?: string;
    /** Relevance score for notification ordering (0.0 to 1.0) */
    relevanceScore?: number;
}

export interface SendResult {
    successCount: number;
    failureCount: number;
    staleTokens: string[];
}

export interface PushTelemetryPayload {
    appType: DeviceAppType;
    platform: DevicePlatform;
    eventType: PushTelemetryEventType;
    token?: string;
    deviceId?: string;
    notificationTitle?: string;
    notificationBody?: string;
    campaignId?: string;
    orderId?: string;
    actionId?: string;
    metadata?: Record<string, unknown>;
}

export interface BusinessDeviceHeartbeatPayload {
    businessId: string;
    deviceId: string;
    platform: DevicePlatform;
    appVersion?: string;
    appState?: string;
    networkType?: string;
    batteryLevel?: number;
    isCharging?: boolean;
    subscriptionAlive: boolean;
    metadata?: Record<string, unknown>;
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

    async unregisterTokenForUser(userId: string, token: string) {
        return this.repo.removeDeviceTokenForUser(token, userId);
    }

    async unregisterAllTokensForUser(userId: string) {
        return this.repo.removeTokensForUser(userId);
    }

    async trackPushTelemetry(userId: string, payload: PushTelemetryPayload) {
        const event = await this.repo.createPushTelemetryEvent({
            userId,
            appType: payload.appType,
            platform: payload.platform,
            eventType: payload.eventType,
            token: payload.token,
            deviceId: payload.deviceId,
            notificationTitle: payload.notificationTitle,
            notificationBody: payload.notificationBody,
            campaignId: payload.campaignId,
            orderId: payload.orderId,
            actionId: payload.actionId,
            metadata: payload.metadata,
        });

        if (payload.appType === 'BUSINESS' && payload.eventType === 'RECEIVED' && payload.deviceId) {
            await this.repo.touchBusinessDevicePushReceived(userId, payload.deviceId);
        }

        return event;
    }

    async businessDeviceHeartbeat(userId: string, payload: BusinessDeviceHeartbeatPayload) {
        return this.repo.upsertBusinessDeviceHeartbeat({
            userId,
            businessId: payload.businessId,
            deviceId: payload.deviceId,
            platform: payload.platform,
            appVersion: payload.appVersion,
            appState: payload.appState,
            networkType: payload.networkType,
            batteryLevel: payload.batteryLevel,
            isCharging: payload.isCharging,
            subscriptionAlive: payload.subscriptionAlive,
            metadata: payload.metadata,
        });
    }

    async businessDeviceOrderSignal(userId: string, deviceId: string, orderId?: string) {
        await this.repo.touchBusinessDeviceOrderSignal(userId, deviceId, orderId);
    }

    async getBusinessDeviceHealth(hours = 24) {
        const rows = await this.repo.getBusinessDeviceHealthRows(hours);
        const now = Date.now();

        return rows.map((row) => {
            const lastHeartbeatMs = row.lastHeartbeatAt ? new Date(row.lastHeartbeatAt).getTime() : 0;
            const heartbeatAgeMs = now - lastHeartbeatMs;
            const onlineStatus =
                heartbeatAgeMs <= 90_000 ? 'ONLINE' : heartbeatAgeMs <= 5 * 60_000 ? 'STALE' : 'OFFLINE';

            const lastOrderSignalMs = row.lastOrderSignalAt ? new Date(row.lastOrderSignalAt).getTime() : 0;
            const receivingOrders = lastOrderSignalMs > 0 && now - lastOrderSignalMs <= 15 * 60_000;

            return {
                ...row,
                onlineStatus,
                receivingOrders,
            };
        });
    }

    // ────────────────────────────────────────────────────────────────
    // Send to a single user (all their devices)
    // ────────────────────────────────────────────────────────────────

    async sendToUser(
        userId: string,
        payload: NotificationPayload,
        type: NotificationType,
    ): Promise<SendResult> {
        logger.info({ userId, title: payload.title }, 'notification:sendToUser — looking up device tokens');
        const tokens = await this.repo.getTokensByUserId(userId);
        if (tokens.length === 0) {
            logger.warn({ userId }, 'notification:sendToUser — NO device tokens found for user, skipping push');
            return { successCount: 0, failureCount: 0, staleTokens: [] };
        }

        logger.info({ userId, tokenCount: tokens.length, platforms: tokens.map(t => t.platform) }, 'notification:sendToUser — found tokens, sending multicast');
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

    async sendToUserByAppType(
        userId: string,
        appType: DeviceAppType,
        payload: NotificationPayload,
        type: NotificationType,
    ): Promise<SendResult> {
        const tokens = await this.repo.getTokensByUserIdAndAppType(userId, appType);
        if (tokens.length === 0) {
            return { successCount: 0, failureCount: 0, staleTokens: [] };
        }

        const tokenStrings = tokens.map((t) => t.token);
        const result = await this.sendMulticast(tokenStrings, payload);

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

    async sendToUsersByAppType(
        userIds: string[],
        appType: DeviceAppType,
        payload: NotificationPayload,
        type: NotificationType,
    ): Promise<SendResult> {
        if (userIds.length === 0) {
            return { successCount: 0, failureCount: 0, staleTokens: [] };
        }

        const allTokens = await this.repo.getTokensByUserIdsAndAppType(userIds, appType);
        if (allTokens.length === 0) {
            return { successCount: 0, failureCount: 0, staleTokens: [] };
        }

        const tokenStrings = allTokens.map((t) => t.token);
        const result = await this.sendMulticast(tokenStrings, payload);

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

        logger.info(
            { totalTokens: tokens.length },
            'notification:sendMulticast — sending via Firebase',
        );

        const messaging = getMessaging();
        const BATCH_SIZE = 500;
        
        let totalSuccess = 0;
        let totalFailure = 0;
        const staleTokens: string[] = [];

        // Send in batches (Firebase limit is 500 tokens per call)
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
                            // Time-sensitive: bypasses Focus modes for urgent notifications
                            ...(payload.timeSensitive && {
                                'interruption-level': 'time-sensitive',
                                'relevance-score': payload.relevanceScore || 1.0,
                            }),
                            // Category: enables interactive action buttons
                            ...(payload.category && { category: payload.category }),
                        },
                    },
                    headers: {
                        // High priority for time-sensitive notifications
                        'apns-priority': payload.timeSensitive ? '10' : '5',
                    },
                },
            };

            const response = await messaging.sendEachForMulticast(multicastMessage);
            totalSuccess += response.successCount;
            totalFailure += response.failureCount;

            // Detect stale tokens
            response.responses.forEach((resp, idx) => {
                const token = batch[idx];
                if (!token) return;
                if (resp.error) {
                    const code = resp.error.code;
                    if (
                        code === 'messaging/registration-token-not-registered' ||
                        code === 'messaging/invalid-registration-token'
                    ) {
                        staleTokens.push(token);
                    } else {
                        logger.warn({ token, errorCode: code }, 'notification:sendMulticast — FCM send error');
                    }
                }
            });
        }

        // Clean up stale tokens
        if (staleTokens.length > 0) {
            logger.info({ count: staleTokens.length }, 'notification:sendMulticast — removing stale tokens');
            await this.repo.removeDeviceTokensByIds(staleTokens);
        }

        logger.info(
            { successCount: totalSuccess, failureCount: totalFailure },
            'notification:sendMulticast — result',
        );
        return { successCount: totalSuccess, failureCount: totalFailure, staleTokens };
    }

    // ────────────────────────────────────────────────────────────────
    // Live Activity support (iOS Dynamic Island)
    // ────────────────────────────────────────────────────────────────

    /**
     * Send Live Activity update to all active sessions for an order
     * Updates the Dynamic Island with new ETA and status
     */
    async sendLiveActivityUpdate(
        orderId: string,
        updates: {
            driverName: string;
            estimatedMinutes: number;
            status: 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
            phaseInitialMinutes?: number;
            phaseStartedAt?: number;
        },
    ): Promise<void> {
        const gateKey = `cache:live-activity:last-update:${orderId}`;
        const nowMs = Date.now();
        const lastUpdate = await cache.get<LiveActivityUpdateGate>(gateKey);

        const statusChanged = !lastUpdate || lastUpdate.status !== updates.status;
        const etaDeltaMinutes = Math.abs((lastUpdate?.estimatedMinutes ?? updates.estimatedMinutes) - updates.estimatedMinutes);
        const etaChangedEnough = !lastUpdate || etaDeltaMinutes >= LIVE_ACTIVITY_MIN_ETA_DELTA_MINUTES;
        const intervalElapsed =
            !lastUpdate ||
            nowMs - lastUpdate.sentAtMs >= LIVE_ACTIVITY_MIN_UPDATE_INTERVAL_SECONDS * 1000;

        // Always allow status changes immediately. Throttle only repetitive same-status noise.
        if (!statusChanged && !etaChangedEnough && !intervalElapsed) {
            logger.debug(
                {
                    orderId,
                    status: updates.status,
                    estimatedMinutes: updates.estimatedMinutes,
                    minIntervalSeconds: LIVE_ACTIVITY_MIN_UPDATE_INTERVAL_SECONDS,
                    minEtaDeltaMinutes: LIVE_ACTIVITY_MIN_ETA_DELTA_MINUTES,
                },
                'Skipped redundant Live Activity update (throttled)',
            );
            return;
        }

        const liveActivityTopic =
            process.env.LIVE_ACTIVITY_APNS_TOPIC ||
            process.env.IOS_EXTENSION_BUNDLE_ID ||
            'com.artshabani.mobilecustomer.DeliveryLiveActivityExtension';
        const liveActivityRepo = new LiveActivityTokenRepository();
        const tokens = await liveActivityRepo.getTokensByOrderId(orderId);

        if (tokens.length === 0) {
            logger.debug({ orderId }, 'No Live Activity tokens for order');
            return;
        }

        const messaging = getMessaging();

        // Send update to each Live Activity
        for (const tokenRecord of tokens) {
            try {
                const message: Message = {
                    token: tokenRecord.pushToken,
                    data: {
                        driverName: updates.driverName,
                        estimatedMinutes: String(updates.estimatedMinutes),
                        status: updates.status,
                        orderId: orderId,
                        phaseInitialMinutes: String(
                            updates.phaseInitialMinutes ?? updates.estimatedMinutes,
                        ),
                        phaseStartedAt: String(
                            updates.phaseStartedAt ?? Date.now(),
                        ),
                        lastUpdated: String(Date.now()),
                    },
                    apns: {
                        headers: {
                            'apns-push-type': 'liveactivity', // Required for Live Activity updates
                            'apns-priority': '10',
                            'apns-topic': liveActivityTopic,
                        },
                        payload: {
                            aps: {
                                timestamp: Math.floor(Date.now() / 1000),
                                event: 'update',
                                'content-state': {
                                    driverName: updates.driverName,
                                    estimatedMinutes: updates.estimatedMinutes,
                                    status: updates.status,
                                    orderId: orderId,
                                    phaseInitialMinutes:
                                        updates.phaseInitialMinutes ?? updates.estimatedMinutes,
                                    phaseStartedAt: updates.phaseStartedAt ?? Date.now(),
                                    lastUpdated: Date.now(),
                                },
                            },
                        },
                    },
                };

                await messaging.send(message);
                logger.info(
                    { orderId, activityId: tokenRecord.activityId, estimatedMinutes: updates.estimatedMinutes },
                    'Sent Live Activity update',
                );
            } catch (error: any) {
                const code = error?.code;
                if (
                    code === 'messaging/registration-token-not-registered' ||
                    code === 'messaging/invalid-registration-token'
                ) {
                    // Token is stale, remove it
                    logger.info({ activityId: tokenRecord.activityId }, 'Removing stale Live Activity token');
                    await liveActivityRepo.removeToken(tokenRecord.activityId);
                } else {
                    logger.error({ error, orderId, activityId: tokenRecord.activityId }, 'Failed to send Live Activity update');
                }
            }
        }

        await cache.set(
            gateKey,
            {
                status: updates.status,
                estimatedMinutes: updates.estimatedMinutes,
                sentAtMs: nowMs,
            } satisfies LiveActivityUpdateGate,
            60 * 60 * 4,
        );
    }

    /**
     * End all Live Activities for an order (when order is completed/cancelled)
     */
    async endLiveActivities(
        orderId: string,
        finalStatus: 'delivered' | 'cancelled' = 'delivered',
    ): Promise<void> {
        const liveActivityTopic =
            process.env.LIVE_ACTIVITY_APNS_TOPIC ||
            process.env.IOS_EXTENSION_BUNDLE_ID ||
            'com.artshabani.mobilecustomer.DeliveryLiveActivityExtension';
        const liveActivityRepo = new LiveActivityTokenRepository();
        const tokens = await liveActivityRepo.getTokensByOrderId(orderId);

        if (tokens.length === 0) {
            return;
        }

        const messaging = getMessaging();

        // Send end event to each Live Activity
        for (const tokenRecord of tokens) {
            try {
                const finalState = {
                    driverName: 'Your driver',
                    estimatedMinutes: 0,
                    status: finalStatus,
                    orderId,
                    lastUpdated: Date.now(),
                };

                const message: Message = {
                    token: tokenRecord.pushToken,
                    data: {
                        driverName: finalState.driverName,
                        estimatedMinutes: String(finalState.estimatedMinutes),
                        status: finalState.status,
                        orderId,
                        lastUpdated: String(finalState.lastUpdated),
                    },
                    apns: {
                        headers: {
                            'apns-push-type': 'liveactivity',
                            'apns-priority': '10',
                            'apns-topic': liveActivityTopic,
                        },
                        payload: {
                            aps: {
                                timestamp: Math.floor(Date.now() / 1000),
                                event: 'end',
                                'content-state': finalState,
                                'dismissal-date': Math.floor(Date.now() / 1000) + 10, // Dismiss after 10 seconds
                            },
                        },
                    },
                };

                await messaging.send(message);
                logger.info({ orderId, activityId: tokenRecord.activityId }, 'Ended Live Activity');
            } catch (error: any) {
                logger.error({ error, orderId, activityId: tokenRecord.activityId }, 'Failed to end Live Activity');
            }
        }

        // Clean up tokens after ending Live Activities
        await liveActivityRepo.removeTokensByOrderId(orderId);
    }
}

