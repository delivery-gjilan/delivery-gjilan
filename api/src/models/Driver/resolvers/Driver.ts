import type { UserResolvers } from './../../../generated/types.generated';
import type { DbUser } from '@/database/schema/users';

/**
 * Extended User resolver with driver connection info
 * 
 * This resolver bridges the User and Driver data by:
 * 1. Fetching the driver profile from the drivers table
 * 2. Mapping it to the DriverConnection GraphQL type
 * 3. Keeping backward compatibility with existing fields
 */
export const User: UserResolvers = {
  business: async (parent, _args, { businessService }) => {
    const businessId = (parent as any).businessId;
    if (!businessId) {
      return null;
    }
    return businessService.getBusiness(String(businessId));
  },

  // BACKWARD COMPATIBILITY: Existing field
  driverLocation: (parent) => {
    const p = parent as any;
    if (!p.driverLat || !p.driverLng) {
      return null;
    }
    return {
      latitude: p.driverLat,
      longitude: p.driverLng,
      address: 'Driver location',
    };
  },

  // BACKWARD COMPATIBILITY: Existing field
  driverLocationUpdatedAt: (parent) => {
    const value = (parent as any).driverLocationUpdatedAt;
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const normalized = value
        .replace(' ', 'T')
        .replace(/\+00\.?$/, 'Z')
        .replace(/Z\.$/, 'Z');
      const parsed = new Date(normalized);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  },

  // NEW: Driver connection status from drivers table
  driverConnection: async (parent, _args, { driverService }) => {
    const p = parent as any;
    
    // Only drivers have connection info
    if (p.role !== 'DRIVER') {
      return null;
    }

    if (!driverService) {
      console.warn('[User.driverConnection] driverService not available');
      return null;
    }

    const driver = await driverService.getDriverWithConnection(p.id);
    if (!driver) {
      return null;
    }

    // Helper to parse date strings
    const parseDate = (value: string | Date | null): Date | null => {
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
  },
};
