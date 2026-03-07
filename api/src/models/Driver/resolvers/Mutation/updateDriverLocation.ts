// @ts-nocheck
import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { pubsub, publish, topics } from '@/lib/pubsub';
import logger from '@/lib/logger';

/**
 * Updated updateDriverLocation mutation
 * 
 * Now:
 * 1. Updates drivers table (driverLat, driverLng, lastLocationUpdate)
 * 2. Triggers immediate heartbeat check for fast connection status update
 * 3. Publishes update to driversUpdated subscription
 * 4. Still updates users table for backward compatibility (optional)
 */
export const updateDriverLocation: NonNullable<
  MutationResolvers['updateDriverLocation']
> = async (_parent, { latitude, longitude }, { authService, driverService, userData }) => {
  if (!userData.userId) {
    throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
  }

  if (userData.role !== 'DRIVER') {
    throw new GraphQLError('Only drivers can update location', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  if (!driverService) {
    throw new GraphQLError('Driver service unavailable', { extensions: { code: 'INTERNAL_ERROR' } });
  }

  // Update driver location in drivers table
  const driver = await driverService.updateLocation(userData.userId, latitude, longitude);

  if (!driver) {
    throw new GraphQLError('Driver not found', { extensions: { code: 'NOT_FOUND' } });
  }

  // Publish update to subscriptions
  try {
    const drivers = await authService.getDrivers();
    publish(pubsub, topics.allDriversChanged(), { drivers });
  } catch (error) {
    logger.error({ err: error }, 'driver:updateDriverLocation publish failed');
  }

  // Return the full user object (with resolved driverConnection field)
  const user = await authService.getUserById(userData.userId);
  if (!user) {
    throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
  }
  return {
    ...user,
    isOnline: driver.onlinePreference ?? false,
  };
};
