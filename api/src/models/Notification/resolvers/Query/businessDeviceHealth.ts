import type { QueryResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';

export const businessDeviceHealth: NonNullable<QueryResolvers['businessDeviceHealth']> = async (
    _parent,
    { hours },
    { userData, notificationService },
) => {
    if (!userData.userId || !userData.role) {
        throw AppError.unauthorized();
    }

    if (userData.role !== 'SUPER_ADMIN' && userData.role !== 'ADMIN') {
        throw AppError.forbidden('Only admins can monitor business devices');
    }

    const rows = await notificationService.getBusinessDeviceHealth(hours ?? 24);

    return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        businessId: row.businessId,
        deviceId: row.deviceId,
        platform: row.platform,
        appVersion: row.appVersion,
        appState: row.appState,
        networkType: row.networkType,
        batteryLevel: row.batteryLevel,
        isCharging: row.isCharging,
        subscriptionAlive: row.subscriptionAlive,
        lastHeartbeatAt: new Date(row.lastHeartbeatAt),
        lastOrderSignalAt: row.lastOrderSignalAt ? new Date(row.lastOrderSignalAt) : null,
        lastPushReceivedAt: row.lastPushReceivedAt ? new Date(row.lastPushReceivedAt) : null,
        lastOrderId: row.lastOrderId,
        metadata: row.metadata,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        onlineStatus: row.onlineStatus as 'ONLINE' | 'STALE' | 'OFFLINE',
        receivingOrders: row.receivingOrders,
    }));
};
