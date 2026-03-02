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
    isOnline: async (parent, _args, { loaders }) => {
        if (parent.role !== 'DRIVER') return false;
        try {
            const driver = await loaders.driverByUserIdLoader.load(String(parent.id));
            return driver?.onlinePreference ?? false;
        } catch (error) {
            logger.error({ err: error }, 'user:isOnline resolve failed');
            return false;
        }
    },
    driverLocation: async (parent, _args, { loaders }) => {
        if (parent.role !== 'DRIVER') return null;
        try {
            const driver = await loaders.driverByUserIdLoader.load(String(parent.id));
            if (!driver?.driverLat || !driver?.driverLng) return null;
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
    driverLocationUpdatedAt: async (parent, _args, { loaders }) => {
        if (parent.role !== 'DRIVER') return null;
        try {
            const driver = await loaders.driverByUserIdLoader.load(String(parent.id));
            const value = driver?.lastLocationUpdate ?? null;
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
        } catch (error) {
            logger.error({ err: error }, 'user:driverLocationUpdatedAt resolve failed');
            return null;
        }
    },
    commissionPercentage: async (parent, _args, { loaders }) => {
        if (parent.role !== 'DRIVER') return null;
        try {
            const driver = await loaders.driverByUserIdLoader.load(String(parent.id));
            if (!driver?.commissionPercentage) return null;
            return parseFloat(driver.commissionPercentage);
        } catch (error) {
            logger.error({ err: error }, 'user:commissionPercentage resolve failed');
            return null;
        }
    },
    driverConnection: async (parent, _args, { loaders }) => {
        if (parent.role !== 'DRIVER') return null;
        try {
            const driver = await loaders.driverByUserIdLoader.load(String(parent.id));
            if (!driver) return null;
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
