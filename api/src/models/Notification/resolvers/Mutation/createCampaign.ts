import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';

export const createCampaign: NonNullable<MutationResolvers['createCampaign']> = async (
    _parent,
    { input },
    { userData, notificationService },
) => {
    if (!userData.role || !['SUPER_ADMIN', 'ADMIN'].includes(userData.role)) {
        throw AppError.forbidden('Only admins can create campaigns');
    }

    const campaign = await notificationService.repo.createCampaign({
        title: input.title,
        body: input.body,
        data: input.data as Record<string, unknown> | undefined,
        query: input.query as Record<string, unknown>,
        sentBy: userData.userId,
    });

    return {
        ...campaign,
        sender: null,
    };
};