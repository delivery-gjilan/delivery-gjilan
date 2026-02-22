import type { MutationResolvers } from './../../../../generated/types.generated';

export const deleteCampaign: NonNullable<MutationResolvers['deleteCampaign']> = async (
    _parent,
    { id },
    { userData, notificationService },
) => {
    if (!userData.role || !['SUPER_ADMIN', 'ADMIN'].includes(userData.role)) {
        throw new Error('Only admins can delete campaigns');
    }

    return notificationService.repo.deleteCampaign(id);
};