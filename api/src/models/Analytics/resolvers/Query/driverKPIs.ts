
import type { QueryResolvers } from './../../../../generated/types.generated';
import { AnalyticsService } from '@/services/AnalyticsService';
import { AppError } from '@/lib/errors';

export const driverKPIs: NonNullable<QueryResolvers['driverKPIs']> = async (
    _parent,
    { startDate, endDate, driverId },
    { userData },
) => {
    if (!userData?.role) throw AppError.unauthorized();

    const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN';
    const isDriver = userData.role === 'DRIVER';

    if (!isAdmin && !isDriver) {
        throw AppError.forbidden('Analytics access requires ADMIN or DRIVER role');
    }

    // Drivers can only query their own metrics
    const effectiveDriverId = isDriver
        ? (userData.userId ?? undefined)
        : (driverId ?? undefined);

    const service = new AnalyticsService();
    return service.getDriverKPIs({ startDate, endDate }, effectiveDriverId);
};