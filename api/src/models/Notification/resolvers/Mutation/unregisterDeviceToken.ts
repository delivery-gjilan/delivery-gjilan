import type { MutationResolvers } from './../../../../generated/types.generated';

export const unregisterDeviceToken: NonNullable<MutationResolvers['unregisterDeviceToken']> = async (
    _parent,
    { token },
    { userData, notificationService },
) => {
    if (!userData.userId) throw new Error('Unauthorized');

    await notificationService.unregisterToken(token);
    return true;
};