import type { QueryResolvers } from './../../../../generated/types.generated';

export const notificationCampaign: NonNullable<QueryResolvers['notificationCampaign']> = async (
    _parent,
    { id },
    { userData, notificationService },
) => {
    if (!userData.role || !['SUPER_ADMIN', 'ADMIN'].includes(userData.role)) {
        throw new Error('Only admins can view campaigns');
    }

    const campaign = await notificationService.repo.getCampaignById(id);
    if (!campaign) return null;
    return { ...campaign, sender: null };
};