import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';

export const businessDeviceHeartbeat: NonNullable<MutationResolvers['businessDeviceHeartbeat']> = async (
    _parent,
    { input },
    { userData, notificationService },
) => {
    if (!userData.userId || !userData.role) {
        throw AppError.unauthorized();
    }

    if (userData.role !== 'BUSINESS_OWNER' && userData.role !== 'BUSINESS_EMPLOYEE') {
        throw AppError.forbidden('Only business users can report device heartbeat');
    }

    if (!userData.businessId) {
        throw AppError.forbidden('Business account is missing a businessId');
    }

    await notificationService.businessDeviceHeartbeat(userData.userId, {
        businessId: userData.businessId,
        deviceId: input.deviceId,
        platform: input.platform,
        appVersion: input.appVersion ?? undefined,
        appState: input.appState ?? undefined,
        networkType: input.networkType ?? undefined,
        batteryLevel: input.batteryLevel ?? undefined,
        isCharging: input.isCharging ?? undefined,
        subscriptionAlive: input.subscriptionAlive,
        metadata: (input.metadata as Record<string, unknown> | null) ?? undefined,
    });

    return true;
};
