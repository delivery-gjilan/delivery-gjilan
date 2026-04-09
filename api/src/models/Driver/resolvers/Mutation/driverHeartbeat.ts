import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { cache } from '@/lib/cache';
import {
  DriverCustomerNotificationKind,
  hasDriverCustomerNotificationBeenSent,
  markDriverCustomerNotificationSent,
  notifyCustomerFromDriver,
} from '@/services/orderNotifications';

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
  { latitude, longitude, activeOrderId, navigationPhase, remainingEtaSeconds },
  { driverService, userData, orderService, notificationService, authService }
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
  const result = await driverService.processHeartbeat(userData.userId, latitude, longitude, {
    activeOrderId,
    navigationPhase,
    remainingEtaSeconds,
  });

  if (!result.success) {
    throw new GraphQLError('Failed to process heartbeat', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
  }

  const shouldAutoNotifyCustomer =
    Boolean(activeOrderId) &&
    navigationPhase === 'to_dropoff' &&
    remainingEtaSeconds != null &&
    Number.isFinite(remainingEtaSeconds) &&
    remainingEtaSeconds > 0 &&
    remainingEtaSeconds <= 180;

  if (shouldAutoNotifyCustomer && activeOrderId) {
    const dbOrder = await orderService.orderRepository.findById(activeOrderId);
    const etaKind: DriverCustomerNotificationKind = 'ETA_LT_3_MIN';

    if (
      dbOrder &&
      dbOrder.driverId === userData.userId &&
      dbOrder.status === 'OUT_FOR_DELIVERY'
    ) {
      const alreadySent = await hasDriverCustomerNotificationBeenSent(activeOrderId, etaKind);
      if (!alreadySent) {
        const customer = await authService.authRepository.findById(dbOrder.userId);
        const customerPreferredLanguage: 'en' | 'al' = customer?.preferredLanguage === 'al' ? 'al' : 'en';

        await markDriverCustomerNotificationSent(activeOrderId, etaKind);
        notifyCustomerFromDriver(
          notificationService,
          dbOrder.userId,
          activeOrderId,
          etaKind,
          Math.max(1, Math.ceil((remainingEtaSeconds as number) / 60)),
          customerPreferredLanguage,
        );
      }
    }
  }

  if (activeOrderId && remainingEtaSeconds != null && Number.isFinite(remainingEtaSeconds)) {
    const dbOrder = await orderService.orderRepository.findById(activeOrderId);
    if (
      dbOrder &&
      dbOrder.driverId === userData.userId &&
      dbOrder.status === 'OUT_FOR_DELIVERY'
    ) {
      const remainingMinutes = Math.max(0, Math.ceil((remainingEtaSeconds as number) / 60));
      const outForDeliveryMs = dbOrder.outForDeliveryAt
        ? new Date(dbOrder.outForDeliveryAt).getTime()
        : Date.now();
      const elapsedMinutes = Math.max(0, Math.floor((Date.now() - outForDeliveryMs) / 60000));
      const phaseInitialMinutes = Math.max(1, remainingMinutes + elapsedMinutes);

      const throttleKey = `cache:live-activity:last-minute:${activeOrderId}`;
      const lastSentMinute = await cache.get<number>(throttleKey);
      if (lastSentMinute !== remainingMinutes) {
        const customer = await authService.authRepository.findById(dbOrder.userId);
        const customerPreferredLanguage: 'en' | 'al' = customer?.preferredLanguage === 'al' ? 'al' : 'en';

        await notificationService.sendLiveActivityUpdate(activeOrderId, {
          driverName: 'Your driver',
          estimatedMinutes: remainingMinutes,
          status: 'out_for_delivery',
          phaseInitialMinutes,
          phaseStartedAt: outForDeliveryMs,
          locale: customerPreferredLanguage,
        });
        await cache.set(throttleKey, remainingMinutes, 60 * 60);
      }
    }
  }

  // Map the result to GraphQL type
  return {
    success: result.success,
    connectionStatus: result.connectionStatus as 'CONNECTED' | 'STALE' | 'LOST' | 'DISCONNECTED',
    locationUpdated: result.locationUpdated,
    lastHeartbeatAt: new Date(result.lastHeartbeatAt),
  };
};