import type { UserResolvers } from './../../../generated/types.generated';
import logger from '@/lib/logger';
import { getUserPermissions } from '@/lib/utils/permissions';

export const User: Pick<UserResolvers, 'address'|'adminNote'|'business'|'businessId'|'driverLocation'|'driverLocationUpdatedAt'|'email'|'emailVerified'|'firstName'|'flagColor'|'id'|'imageUrl'|'isOnline'|'lastName'|'permissions'|'phoneNumber'|'phoneVerified'|'referralCode'|'role'|'signupStep'|'__isTypeOf'> = {
    permissions: async (parent) => {
        // Get permissions for this user
        const perms = await getUserPermissions({
            userId: parent.id,
            role: parent.role as any,
            businessId: parent.businessId ?? undefined,
        });
        
        return perms as any;
    },
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
            logger.error({ err: error }, 'user:isOnline resolve failed');
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
            logger.error({ err: error }, 'user:driverLocation resolve failed');
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
                logger.error({ err: error }, 'user:driverLocationUpdatedAt resolve failed');
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
            logger.error({ err: error }, 'user:commissionPercentage resolve failed');
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
            logger.error({ err: error }, 'user:driverConnection resolve failed');
            return null;
        }
    },
};
