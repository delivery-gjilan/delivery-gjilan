
import type { QueryResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';

export const pushTelemetrySummary: NonNullable<QueryResolvers['pushTelemetrySummary']> = async (
        _parent,
        { hours },
        { userData, notificationService },
) => {
        if (!userData.role || !['SUPER_ADMIN', 'ADMIN'].includes(userData.role)) {
                throw AppError.forbidden('Only admins can view push telemetry summary');
        }

        return notificationService.repo.getPushTelemetrySummary(hours ?? 24);
};