import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { pubsub, publish, topics } from '@/lib/pubsub';

export const updateDriverOnlineStatus: NonNullable<MutationResolvers['updateDriverOnlineStatus']> = async (
  _parent,
  { isOnline },
  { authService, driverService, userData }
) => {
  if (!userData.userId) {
    throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
  }

  if (userData.role !== 'DRIVER') {
    throw new GraphQLError('Only drivers can update online status', { extensions: { code: 'FORBIDDEN' } });
  }

  if (!driverService) {
    throw new GraphQLError('Driver services unavailable', { extensions: { code: 'SERVICE_UNAVAILABLE' } });
  }

  // Update driver's online preference in drivers table
  const driver = await driverService.setOnlinePreference(userData.userId, isOnline);
  if (!driver) {
    throw new GraphQLError('Driver not found', { extensions: { code: 'NOT_FOUND' } });
  }

  // BACKWARD COMPATIBILITY: Also update users table
  await authService.authRepository.updateDriverOnlineStatus(userData.userId, isOnline);

  // Fetch all drivers and publish update for real-time sync
  try {
    const drivers = await authService.authRepository.findDrivers();
    publish(pubsub, topics.allDriversChanged(), { drivers });
  } catch (error) {
    console.error('Failed to publish driver update:', error);
  }

  const user = await authService.authRepository.findById(userData.userId);
  return user;
};
