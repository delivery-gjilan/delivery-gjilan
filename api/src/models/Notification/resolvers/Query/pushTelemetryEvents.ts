
import type { QueryResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';

export const pushTelemetryEvents: NonNullable<QueryResolvers['pushTelemetryEvents']> = async (
        _parent,
        { hours, limit, appType, platform, eventType },
        { userData, notificationService },
) => {
        if (!userData.role || !['SUPER_ADMIN', 'ADMIN'].includes(userData.role)) {
                throw AppError.forbidden('Only admins can view push telemetry events');
        }

        return notificationService.repo.getPushTelemetryEvents({
                hours: hours ?? 24,
                limit: limit ?? 100,
                appType: appType || undefined,
                platform: platform || undefined,
                eventType: eventType || undefined,
        });
};