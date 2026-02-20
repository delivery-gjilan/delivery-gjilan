import type { UserResolvers } from './../../../generated/types.generated';
export const User: Pick<UserResolvers, 'address'|'adminNote'|'business'|'businessId'|'driverLocation'|'driverLocationUpdatedAt'|'email'|'emailVerified'|'firstName'|'flagColor'|'id'|'imageUrl'|'isOnline'|'lastName'|'phoneNumber'|'phoneVerified'|'referralCode'|'role'|'signupStep'|'__isTypeOf'> = {
    business: async (parent, _args, { businessService }) => {
        if (!parent.businessId) {
            return null;
        }
        return businessService.getBusiness(String(parent.businessId));
    },
    isOnline: async (parent, _args, { driverService }) => {
        if (parent.role !== 'DRIVER' || !driverService) {
            return false;
        }

        try {
            const driver = await driverService.getDriverWithConnection(String(parent.id));
            return driver?.onlinePreference ?? false;
        } catch (error) {
            console.error('[User.isOnline] Error resolving driver online preference:', error);
            return false;
        }
    },
    driverLocation: async (parent, _args, { driverService }) => {
        if (parent.role !== 'DRIVER' || !driverService) {
            return null;
        }

        try {
            const driver = await driverService.getDriverWithConnection(String(parent.id));
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
        let value: string | Date | null | undefined;
        if (parent.role === 'DRIVER' && driverService) {
            try {
                const driver = await driverService.getDriverWithConnection(String(parent.id));
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
    commissionPercentage: async (parent, _args, { driverService }) => {
        if (parent.role !== 'DRIVER' || !driverService) {
            return null;
        }

        try {
            const driver = await driverService.getDriverWithConnection(String(parent.id));
            if (!driver?.commissionPercentage) {
                return null;
            }
            return parseFloat(driver.commissionPercentage);
        } catch (error) {
            console.error('[User.commissionPercentage] Error resolving driver commission:', error);
            return null;
        }
    },
    driverConnection: async (parent, _args, { driverService }) => {
        if (parent.role !== 'DRIVER' || !driverService) {
            return null;
        }

        try {
            const driver = await driverService.getDriverWithConnection(String(parent.id));
            if (!driver) {
                return null;
            }
            return {
                onlinePreference: driver.onlinePreference ?? false,
                connectionStatus: driver.connectionStatus ?? 'DISCONNECTED',
                lastHeartbeatAt: driver.lastHeartbeatAt,
                lastLocationUpdate: driver.lastLocationUpdate,
                disconnectedAt: driver.disconnectedAt,
            };
        } catch (error) {
            console.error('[User.driverConnection] Error resolving driver connection:', error);
            return null;
        }
    },
};
