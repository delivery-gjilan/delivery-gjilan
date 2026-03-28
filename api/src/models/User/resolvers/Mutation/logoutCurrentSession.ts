import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';

export const logoutCurrentSession: NonNullable<MutationResolvers['logoutCurrentSession']> = async (
    _parent,
    { refreshToken },
    { authService, userData },
) => {
    if (!userData?.userId) {
        throw new GraphQLError('Not authenticated', {
            extensions: { code: 'UNAUTHENTICATED' },
        });
    }

    return authService.revokeCurrentRefreshTokenSession(userData.userId, refreshToken);
};
