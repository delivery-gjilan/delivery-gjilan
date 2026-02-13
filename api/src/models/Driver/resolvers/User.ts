import type { UserResolvers } from './../../../generated/types.generated';

/**
 * Driver-related User resolver
 * Resolves the driverConnection field for driver users
 */
export const User: Pick<UserResolvers, 'driverConnection'|'__isTypeOf'> = {
  driverConnection: async (parent, _args, { driverService }) => {
    // Only drivers have connection info
    if (parent.role !== 'DRIVER') {
      return null;
    }

    if (!driverService) {
      return null;
    }

    try {
      const driver = await driverService.getDriverWithConnection(parent.id);
      if (!driver) {
        return null;
      }

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
      };
    } catch (error) {
      console.error('[Driver.User.driverConnection] Error resolving driver connection:', error);
      return null;
    }
  },
};