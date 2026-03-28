
import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';
import { toUserParent } from '../utils/toUserParent';

export const setMyPreferredLanguage: NonNullable<MutationResolvers['setMyPreferredLanguage']> = async (
        _parent,
        { language },
        { authService, userData },
) => {
        if (!userData.userId) {
                throw new GraphQLError('Unauthorized', {
                        extensions: { code: 'UNAUTHORIZED' },
                });
        }

        const preferredLanguage = language === 'AL' ? 'al' : 'en';

        const updatedUser = await authService.authRepository.updateUser(userData.userId, {
                preferredLanguage,
        });

        if (!updatedUser) {
                throw new GraphQLError('User not found', {
                        extensions: { code: 'NOT_FOUND' },
                });
        }

        return toUserParent(updatedUser);
};