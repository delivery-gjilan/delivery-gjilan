import type { UserResolvers } from './../../../generated/types.generated';
import logger from '@/lib/logger';
import { getLiveDriverEta } from '@/lib/driverEtaCache';

/**
 * Driver-related User resolver
 * Resolves the driverConnection field for driver users
 */
export const User: Pick<UserResolvers, 'commissionPercentage'|'driverConnection'|'hasOwnVehicle'|'maxActiveOrders'|'vehicleType'|'__isTypeOf'> = {
  hasOwnVehicle: async (parent, _args, { driverService }) => {
    if (parent.role !== 'DRIVER' || !driverService) return null;
    try {
      const driver = await driverService.getDriverWithConnection(String(parent.id));
      return driver?.hasOwnVehicle ?? false;
    } catch {
      return null;
    }
  },
  vehicleType: async (parent, _args, { driverService }) => {
    if (parent.role !== 'DRIVER' || !driverService) return null;
    try {
      const driver = await driverService.getDriverWithConnection(String(parent.id));
      return driver?.vehicleType ?? null;
    } catch {
      return null;
    }
  },
  driverConnection: async (parent, _args, { driverService }) => {
    // Only drivers have connection info
    if (parent.role !== 'DRIVER') {
      return null;
    }

    if (!driverService) {
      return null;
    }

    try {
      const parentId = String(parent.id);
      const driver = await driverService.getDriverWithConnection(parentId);
      if (!driver) {
        return null;
      }
      const liveEta = await getLiveDriverEta(parentId);

      const parseDate = (value: string | Date | null | undefined): Date | null => {
        if (!value) return null;
        if (value instanceof Date) return value;
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      return {
        onlinePreference: driver.onlinePreference,
        connectionStatus: driver.connectionStatus,
        lastHeartbeatAt: parseDate(driver.lastHeartbeatAt),
        lastLocationUpdate: parseDate(driver.lastLocationUpdate),
        disconnectedAt: parseDate(driver.disconnectedAt),
        batteryLevel: driver.batteryLevel ?? null,
        batteryOptIn: driver.batteryOptIn ?? false,
        batteryUpdatedAt: parseDate(driver.batteryUpdatedAt),
        isCharging: driver.isCharging ?? null,
        activeOrderId: liveEta?.activeOrderId ?? null,
        navigationPhase: liveEta?.navigationPhase ?? null,
        remainingEtaSeconds: liveEta?.remainingEtaSeconds ?? null,
        etaUpdatedAt: parseDate(liveEta?.etaUpdatedAt),
      };
    } catch (error) {
      logger.error({ err: error, userId: String(parent.id) }, 'driver:driverConnection resolve failed');
      return null;
    }
  },
};