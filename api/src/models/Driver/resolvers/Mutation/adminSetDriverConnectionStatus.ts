// @ts-nocheck
import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

/**
 * Admin mutation to manually set a driver's connection status
 * 
 * Useful for:
 * - Testing connection state machine
 * - Recovering drivers stuck in "disconnected" state
 * - Simulating network failures
 * 
 * In production, connection status should only be set by the heartbeat checker.
 */
export const adminSetDriverConnectionStatus: NonNullable<
  MutationResolvers['adminSetDriverConnectionStatus']
> = async (_parent, { driverId, status }, { userData, authService, driverService }) => {
  // Check authorization
  if (userData.role !== 'SUPER_ADMIN') {
    throw new GraphQLError('Only super admins can set driver connection status', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  // Verify driver exists
  const user = await authService.getUserById(driverId);
  if (!user || user.role !== 'DRIVER') {
    throw new GraphQLError('Driver not found', { extensions: { code: 'NOT_FOUND' } });
  }

  if (!driverService) {
    throw new GraphQLError('Driver service unavailable', { extensions: { code: 'INTERNAL_ERROR' } });
  }

  // Set connection status
  const driver = await driverService.adminSetConnectionStatus(driverId, status);
  if (!driver) {
    throw new GraphQLError('Failed to update driver connection status', {
      extensions: { code: 'INTERNAL_ERROR' },
    });
  }

  return user;
};
