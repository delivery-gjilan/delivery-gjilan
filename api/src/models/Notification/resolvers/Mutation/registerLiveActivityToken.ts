import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';
import { LiveActivityTokenRepository } from '@/repositories/LiveActivityTokenRepository';

export const registerLiveActivityToken: NonNullable<MutationResolvers['registerLiveActivityToken']> = async (
    _parent,
    { token, activityId, orderId },
    { userData },
) => {
    if (!userData.userId) throw AppError.unauthorized();

    const liveActivityRepo = new LiveActivityTokenRepository();

    await liveActivityRepo.upsertToken({
        userId: userData.userId,
        orderId,
        activityId,
        pushToken: token,
    });

    return true;
};
