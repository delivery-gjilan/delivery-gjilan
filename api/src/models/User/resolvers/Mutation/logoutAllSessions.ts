import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';

export const logoutAllSessions: NonNullable<MutationResolvers['logoutAllSessions']> = async (
    _parent,
    _args,
    { authService, userData },
) => {
    if (!userData?.userId) {
        throw new GraphQLError('Not authenticated', {
            extensions: { code: 'UNAUTHENTICATED' },
        });
    }

    await authService.revokeAllRefreshTokenSessions(userData.userId);
    return true;
};
