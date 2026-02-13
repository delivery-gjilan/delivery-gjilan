import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

/**
 * Driver Heartbeat Mutation
 * 
 * Called every 5 seconds by driver app while online.
 * 
 * Features:
 * - Always updates lastHeartbeatAt
 * - Sets connectionStatus to CONNECTED
 * - Throttles location DB writes to every 10 seconds
 * - Skips location write if position hasn't changed significantly
 */
export const driverHeartbeat: NonNullable<MutationResolvers['driverHeartbeat']> = async (
  _parent,
  { latitude, longitude },
  { driverService, userData }
) => {
  // Authorization
  if (!userData.userId) {
    throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
  }

  if (userData.role !== 'DRIVER') {
    throw new GraphQLError('Only drivers can send heartbeats', { extensions: { code: 'FORBIDDEN' } });
  }

  if (!driverService) {
    throw new GraphQLError('Driver services unavailable', { extensions: { code: 'SERVICE_UNAVAILABLE' } });
  }

  // Validate coordinates
  if (latitude < -90 || latitude > 90) {
    throw new GraphQLError('Invalid latitude', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  if (longitude < -180 || longitude > 180) {
    throw new GraphQLError('Invalid longitude', { extensions: { code: 'BAD_USER_INPUT' } });
  }

  // Process heartbeat
  const result = await driverService.processHeartbeat(userData.userId, latitude, longitude);

  if (!result.success) {
    throw new GraphQLError('Failed to process heartbeat', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
  }

  // Map the result to GraphQL type
  return {
    success: result.success,
    connectionStatus: result.connectionStatus as 'CONNECTED' | 'STALE' | 'LOST' | 'DISCONNECTED',
    locationUpdated: result.locationUpdated,
    lastHeartbeatAt: new Date(result.lastHeartbeatAt),
  };
};