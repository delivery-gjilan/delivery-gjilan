
import type { QueryResolvers } from './../../../../generated/types.generated';
import { AnalyticsService } from '@/services/AnalyticsService';
import { AppError } from '@/lib/errors';

export const operationalKPIs: NonNullable<QueryResolvers['operationalKPIs']> = async (
    _parent,
    { startDate, endDate, businessId },
    { userData },
) => {
    if (!userData?.role || !['SUPER_ADMIN', 'ADMIN'].includes(userData.role)) {
        throw AppError.forbidden('Analytics access requires ADMIN role');
    }

    const service = new AnalyticsService();
    return service.getOperationalKPIs(
        { startDate, endDate },
        businessId ?? undefined,
    );
};