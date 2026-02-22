import type { MutationResolvers } from './../../../../generated/types.generated';

export const registerDeviceToken: NonNullable<MutationResolvers['registerDeviceToken']> = async (
    _parent,
    { input },
    { userData, notificationService },
) => {
    if (!userData.userId) throw new Error('Unauthorized');

    await notificationService.registerToken(
        userData.userId,
        input.token,
        input.platform,
        input.deviceId,
        input.appType,
    );

    return true;
};