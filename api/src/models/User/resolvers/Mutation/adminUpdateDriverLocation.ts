import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const adminUpdateDriverLocation: NonNullable<MutationResolvers['adminUpdateDriverLocation']> = async (
    _parent,
    { driverId, latitude, longitude },
    { authService, userData },
) => {
    if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    const updated = await authService.authRepository.updateDriverLocation(driverId, latitude, longitude);
    if (!updated) {
        throw new GraphQLError('Driver not found', { extensions: { code: 'NOT_FOUND' } });
    }

    return updated;
};
