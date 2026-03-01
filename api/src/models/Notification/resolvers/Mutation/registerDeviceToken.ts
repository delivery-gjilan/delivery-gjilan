import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';

export const registerDeviceToken: NonNullable<MutationResolvers['registerDeviceToken']> = async (
    _parent,
    { input },
    { userData, notificationService },
) => {
    if (!userData.userId) throw AppError.unauthorized();

    await notificationService.registerToken(
        userData.userId,
        input.token,
        input.platform,
        input.deviceId,
        input.appType,
    );

    return true;
};