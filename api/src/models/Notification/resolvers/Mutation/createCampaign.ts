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
        titleAl: input.titleAl ?? null,
        bodyAl: input.bodyAl ?? null,
        data: input.data as Record<string, unknown> | undefined,
        imageUrl: input.imageUrl ?? null,
        timeSensitive: input.timeSensitive ?? false,
        category: input.category ?? null,
        relevanceScore: input.relevanceScore ?? null,
        query: input.query as Record<string, unknown>,
        sentBy: userData.userId,
    });

    return {
        ...campaign,
        sender: null,
    };
};