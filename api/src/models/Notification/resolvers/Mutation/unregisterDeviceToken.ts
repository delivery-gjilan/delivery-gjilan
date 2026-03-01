import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';

export const unregisterDeviceToken: NonNullable<MutationResolvers['unregisterDeviceToken']> = async (
    _parent,
    { token },
    { userData, notificationService },
) => {
    if (!userData.userId) throw AppError.unauthorized();

    await notificationService.unregisterToken(token);
    return true;
};