import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const adminUpdateDriverLocation: NonNullable<MutationResolvers['adminUpdateDriverLocation']> = async (
    _parent,
    { driverId, latitude, longitude },
    { authService, driverService, userData },
) => {
    if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    if (!driverService) {
        throw new GraphQLError('Driver services unavailable', { extensions: { code: 'SERVICE_UNAVAILABLE' } });
    }

    const driver = await driverService.updateLocation(driverId, latitude, longitude);
    if (!driver) {
        throw new GraphQLError('Driver not found', { extensions: { code: 'NOT_FOUND' } });
    }

    const user = await authService.getUserById(driverId);
    if (!user) {
        throw new GraphQLError('Driver not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const onlinePreference = driver?.onlinePreference ?? false;
    return {
        ...user,
        isOnline: onlinePreference,
    };
};
