
import type { QueryResolvers } from './../../../../generated/types.generated';
import { AnalyticsService } from '@/services/AnalyticsService';
import { AppError } from '@/lib/errors';

export const businessKPIs: NonNullable<QueryResolvers['businessKPIs']> = async (
    _parent,
    { startDate, endDate, businessId },
    { userData },
) => {
    if (!userData?.role) throw AppError.unauthorized();

    const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN';
    const isBusinessOwner = userData.role === 'BUSINESS_OWNER';

    if (!isAdmin && !isBusinessOwner) {
        throw AppError.forbidden('Analytics access requires ADMIN or BUSINESS_OWNER role');
    }

    // Business owners can only query their own business
    const effectiveBusinessId = isBusinessOwner
        ? (userData.businessId ?? undefined)
        : (businessId ?? undefined);

    const service = new AnalyticsService();
    return service.getBusinessKPIs({ startDate, endDate }, effectiveBusinessId);
};