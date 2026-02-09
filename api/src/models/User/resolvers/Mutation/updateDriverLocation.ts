import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const updateDriverLocation: NonNullable<MutationResolvers['updateDriverLocation']> = async (
        _parent,
        { latitude, longitude },
        { authService, userData },
) => {
        if (!userData.userId) {
                throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
        }

        if (userData.role !== 'DRIVER') {
                throw new GraphQLError('Only drivers can update location', { extensions: { code: 'FORBIDDEN' } });
        }

        const updated = await authService.authRepository.updateDriverLocation(userData.userId, latitude, longitude);
        if (!updated) {
                throw new GraphQLError('Driver not found', { extensions: { code: 'NOT_FOUND' } });
        }

        return updated;
};