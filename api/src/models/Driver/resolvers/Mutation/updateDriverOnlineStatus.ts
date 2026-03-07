// @ts-nocheck
import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { pubsub, publish, topics } from '@/lib/pubsub';
import logger from '@/lib/logger';

/**
 * Updated updateDriverOnlineStatus mutation
 * 
 * Now updates drivers.onlinePreference (user's preference)
 * instead of users.isOnline
 * 
 * Note: connectionStatus is still system-calculated by heartbeat checker
 * and not directly set by this mutation.
 */
export const updateDriverOnlineStatus: NonNullable<
  MutationResolvers['updateDriverOnlineStatus']
> = async (_parent, { isOnline }, { authService, driverService, userData }) => {
  if (!userData.userId) {
    throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
  }

  if (userData.role !== 'DRIVER') {
    throw new GraphQLError('Only drivers can update online status', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  if (!driverService) {
    throw new GraphQLError('Driver service unavailable', { extensions: { code: 'INTERNAL_ERROR' } });
  }

  // Update driver's online preference in drivers table
  const driver = await driverService.setOnlinePreference(userData.userId, isOnline);

  if (!driver) {
    throw new GraphQLError('Driver not found', { extensions: { code: 'NOT_FOUND' } });
  }

  // Fetch all drivers and publish update for real-time sync
  try {
    const drivers = await authService.getDrivers();
    publish(pubsub, topics.allDriversChanged(), { drivers });
  } catch (error) {
    logger.error({ err: error }, 'driver:updateDriverOnlineStatus publish failed');
  }

  // Return the full user object
  const user = await authService.getUserById(userData.userId);
  if (!user) {
    throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
  }
  return {
    ...user,
    isOnline: driver.onlinePreference ?? false,
  };
};
