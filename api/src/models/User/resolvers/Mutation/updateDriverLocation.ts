// @ts-nocheck
import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { pubsub, publish, topics } from '@/lib/pubsub';
import logger from '@/lib/logger';

export const updateDriverLocation: NonNullable<MutationResolvers['updateDriverLocation']> = async (
        _parent,
        { latitude, longitude },
        { authService, driverService, userData },
) => {
        if (!userData.userId) {
                throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
        }

        if (userData.role !== 'DRIVER') {
                throw new GraphQLError('Only drivers can update location', { extensions: { code: 'FORBIDDEN' } });
        }

        if (!driverService) {
                throw new GraphQLError('Driver services unavailable', { extensions: { code: 'SERVICE_UNAVAILABLE' } });
        }

        const driver = await driverService.updateLocation(userData.userId, latitude, longitude);
        if (!driver) {
                throw new GraphQLError('Driver not found', { extensions: { code: 'NOT_FOUND' } });
        }

        // Publish driver updates for real-time dashboards
        try {
                const drivers = await authService.authRepository.findDrivers();
                publish(pubsub, topics.allDriversChanged(), { drivers });
        } catch (error) {
		logger.error({ err: error }, 'user:updateDriverLocation publish failed');
        }

        const user = await authService.authRepository.findById(userData.userId);
        if (!user) {
                throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
        }

        return {
                ...user,
                isOnline: driver.onlinePreference ?? false,
        };
};