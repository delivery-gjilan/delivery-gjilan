import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';

export const businessDeviceOrderSignal: NonNullable<MutationResolvers['businessDeviceOrderSignal']> = async (
    _parent,
    { deviceId, orderId },
    { userData, notificationService },
) => {
    if (!userData.userId || !userData.role) {
        throw AppError.unauthorized();
    }

    if (userData.role !== 'BUSINESS_OWNER' && userData.role !== 'BUSINESS_EMPLOYEE') {
        throw AppError.forbidden('Only business users can report order signals');
    }

    await notificationService.businessDeviceOrderSignal(userData.userId, deviceId, orderId ?? undefined);
    return true;
};
