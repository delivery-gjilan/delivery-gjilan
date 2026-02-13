import type { UserResolvers } from './../../../generated/types.generated';
export const User: Pick<UserResolvers, 'address'|'adminNote'|'business'|'businessId'|'driverLocation'|'driverLocationUpdatedAt'|'email'|'emailVerified'|'firstName'|'flagColor'|'id'|'imageUrl'|'isOnline'|'lastName'|'phoneNumber'|'phoneVerified'|'role'|'signupStep'|'__isTypeOf'> = {
    business: async (parent, _args, { businessService }) => {
        if (!parent.businessId) {
            return null;
        }
        return businessService.getBusiness(parent.businessId);
    },
    driverLocation: async (parent, _args, { driverService }) => {
        if (parent.driverLat && parent.driverLng) {
            return {
                latitude: parent.driverLat,
                longitude: parent.driverLng,
                address: 'Driver location',
            };
        }

        if (parent.role !== 'DRIVER' || !driverService) {
            return null;
        }

        try {
            const driver = await driverService.getDriverWithConnection(parent.id);
            if (!driver?.driverLat || !driver?.driverLng) {
                return null;
            }
            return {
                latitude: driver.driverLat,
                longitude: driver.driverLng,
                address: 'Driver location',
            };
        } catch (error) {
            console.error('[User.driverLocation] Error resolving driver location:', error);
            return null;
        }
    },
    driverLocationUpdatedAt: async (parent, _args, { driverService }) => {
        let value = parent.driverLocationUpdatedAt;
        if (!value && parent.role === 'DRIVER' && driverService) {
            try {
                const driver = await driverService.getDriverWithConnection(parent.id);
                value = driver?.lastLocationUpdate ?? null;
            } catch (error) {
                console.error('[User.driverLocationUpdatedAt] Error resolving driver location timestamp:', error);
            }
        }
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

            return {
                onlinePreference: driver.onlinePreference,
                connectionStatus: driver.connectionStatus,
                lastLocationUpdate: driver.lastLocationUpdate
                    ? driver.lastLocationUpdate instanceof Date
                        ? driver.lastLocationUpdate
                        : new Date(driver.lastLocationUpdate)
                    : null,
            };
        } catch (error) {
            console.error('[User.driverConnection] Error resolving driver connection:', error);
            return null;
        }
    },
};
