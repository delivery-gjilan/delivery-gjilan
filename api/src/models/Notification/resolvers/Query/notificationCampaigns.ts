import type { QueryResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';

export const notificationCampaigns: NonNullable<QueryResolvers['notificationCampaigns']> = async (
    _parent,
    _arg,
    { userData, notificationService },
) => {
    if (!userData.role || !['SUPER_ADMIN', 'ADMIN'].includes(userData.role)) {
        throw AppError.forbidden('Only admins can view campaigns');
    }

    const campaigns = await notificationService.repo.getAllCampaigns();
    return campaigns.map((c) => ({ ...c, sender: null }));
};