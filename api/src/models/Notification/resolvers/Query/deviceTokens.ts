import type { QueryResolvers } from './../../../../generated/types.generated';
import { AppError } from '@/lib/errors';

export const deviceTokens: NonNullable<QueryResolvers['deviceTokens']> = async (
    _parent,
    { userId },
    { userData, notificationService },
) => {
    // Super admins can view any user's tokens, or their own
    const targetUserId = userId || userData.userId;

    if (userId && userId !== userData.userId) {
        // Viewing another user's tokens - must be admin
        if (!userData.role || !['SUPER_ADMIN', 'ADMIN'].includes(userData.role)) {
            throw AppError.forbidden('Only admins can view other users\' device tokens');
        }
    }

    if (!targetUserId) {
        throw AppError.badRequest('User ID is required');
    }

    const tokens = await notificationService.repo.getTokensByUserId(targetUserId);
    return tokens;
};
