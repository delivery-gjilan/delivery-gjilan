import type { QueryResolvers } from './../../../../generated/types.generated';
import { UserQueryService } from '@/services/UserQueryService';

export const previewCampaignAudience: NonNullable<QueryResolvers['previewCampaignAudience']> = async (
    _parent,
    { query },
    { userData, db, authService },
) => {
    if (!userData.role || !['SUPER_ADMIN', 'ADMIN'].includes(userData.role)) {
        throw new Error('Only admins can preview audiences');
    }

    const queryService = new UserQueryService(db);
    const userIds = await queryService.resolveUserIds(query as Record<string, unknown>);

    // Get a sample of up to 10 users
    const sampleIds = userIds.slice(0, 10);
    const sampleUsers = await Promise.all(
        sampleIds.map((id) => authService.authRepository.findById(id)),
    );

    return {
        count: userIds.length,
        sampleUsers: sampleUsers.filter(Boolean).map((u) => ({
            ...u!,
            isOnline: false,
            permissions: [],
        })),
    };
};