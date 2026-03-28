
import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';

export const trackPushTelemetry: NonNullable<MutationResolvers['trackPushTelemetry']> = async (
        _parent,
        { input },
        { userData, notificationService },
) => {
        if (!userData.userId) {
                throw AppError.unauthorized();
        }

        await notificationService.trackPushTelemetry(userData.userId, {
                appType: input.appType,
                platform: input.platform,
                eventType: input.eventType,
                token: input.token || undefined,
                deviceId: input.deviceId || undefined,
                notificationTitle: input.notificationTitle || undefined,
                notificationBody: input.notificationBody || undefined,
                campaignId: input.campaignId || undefined,
                orderId: input.orderId || undefined,
                actionId: input.actionId || undefined,
                metadata: (input.metadata as Record<string, unknown>) || undefined,
        });

        return true;
};