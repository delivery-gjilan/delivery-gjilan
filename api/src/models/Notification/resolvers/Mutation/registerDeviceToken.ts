import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';
import logger from '@/lib/logger';

export const registerDeviceToken: NonNullable<MutationResolvers['registerDeviceToken']> = async (
    _parent,
    { input },
    { userData, notificationService },
) => {
    if (!userData.userId) throw AppError.unauthorized();

    logger.info(
        { userId: userData.userId, platform: input.platform, appType: input.appType, deviceId: input.deviceId, tokenPreview: input.token.substring(0, 30) + '...' },
        'notification:registerDeviceToken — incoming token registration',
    );

    const result = await notificationService.registerToken(
        userData.userId,
        input.token,
        input.platform,
        input.deviceId,
        input.appType,
    );

    logger.info(
        { userId: userData.userId, tokenId: result.id },
        'notification:registerDeviceToken — token saved successfully',
    );

    return true;
};