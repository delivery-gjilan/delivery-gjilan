import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';

export const adminSimulateDriverHeartbeat: NonNullable<MutationResolvers['adminSimulateDriverHeartbeat']> = async (
  _parent,
  { driverId, latitude, longitude, activeOrderId, navigationPhase, remainingEtaSeconds },
  { driverService, userData }
) => {
  if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
    throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
  }

  if (!driverService) {
    throw new GraphQLError('Driver services unavailable', { extensions: { code: 'SERVICE_UNAVAILABLE' } });
  }

  if (latitude < -90 || latitude > 90) {
    throw new GraphQLError('Invalid latitude', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  if (longitude < -180 || longitude > 180) {
    throw new GraphQLError('Invalid longitude', { extensions: { code: 'BAD_USER_INPUT' } });
  }

  const result = await driverService.processHeartbeat(driverId, latitude, longitude, {
    activeOrderId: activeOrderId ?? undefined,
    navigationPhase: navigationPhase ?? undefined,
    remainingEtaSeconds: remainingEtaSeconds ?? undefined,
  });

  if (!result.success) {
    throw new GraphQLError('Failed to process heartbeat', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
  }

  return {
    success: result.success,
    connectionStatus: result.connectionStatus as 'CONNECTED' | 'STALE' | 'LOST' | 'DISCONNECTED',
    locationUpdated: result.locationUpdated,
    lastHeartbeatAt: new Date(result.lastHeartbeatAt),
  };
};
