import type { UserResolvers } from './../../../generated/types.generated';
import logger from '@/lib/logger';
import { getUserPermissions } from '@/lib/utils/permissions';
import { getLiveDriverEta } from '@/lib/driverEtaCache';

export const User: Pick<UserResolvers, 'address'|'adminNote'|'business'|'businessId'|'driverLocation'|'driverLocationUpdatedAt'|'email'|'emailVerified'|'firstName'|'flagColor'|'id'|'imageUrl'|'isOnline'|'lastName'|'permissions'|'phoneNumber'|'phoneVerified'|'preferredLanguage'|'referralCode'|'role'|'signupStep'|'__isTypeOf'> = {
    permissions: async (parent) => {
        // Get permissions for this user
        const perms = await getUserPermissions({
            userId: String(parent.id),
            role: parent.role as any,
            businessId: parent.businessId ? String(parent.businessId) : undefined,
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
            if (typeof value === 'string') {
                const normalized = value
                    .replace(' ', 'T')
                    .replace(/\+00\.?$/, 'Z')
                    .replace(/Z\.$/, 'Z');
                const parsed = new Date(normalized);
                return isNaN(parsed.getTime()) ? null : parsed;
            }
            if (typeof value === 'number') {
                const parsed = new Date(value);
                return isNaN(parsed.getTime()) ? null : parsed;
            }
            return null;
        } catch (error) {
            logger.error({ err: error }, 'user:driverLocationUpdatedAt resolve failed');
            return null;
        }
    },
    preferredLanguage: (parent) => {
        const raw = (parent as any).preferredLanguage;
        return raw?.toUpperCase() === 'AL' ? 'AL' : 'EN';
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
            const liveEta = await getLiveDriverEta(String(parent.id));
            return {
                onlinePreference: driver.onlinePreference ?? false,
                connectionStatus: driver.connectionStatus ?? 'DISCONNECTED',
                lastHeartbeatAt: driver.lastHeartbeatAt,
                lastLocationUpdate: driver.lastLocationUpdate,
                disconnectedAt: driver.disconnectedAt,
                batteryLevel: driver.batteryLevel ?? null,
                batteryOptIn: driver.batteryOptIn ?? false,
                batteryUpdatedAt: driver.batteryUpdatedAt ?? null,
                isCharging: driver.isCharging ?? null,
                activeOrderId: liveEta?.activeOrderId ?? null,
                navigationPhase: liveEta?.navigationPhase ?? null,
                remainingEtaSeconds: liveEta?.remainingEtaSeconds ?? null,
                etaUpdatedAt: liveEta?.etaUpdatedAt ?? null,
            };
        } catch (error) {
            logger.error({ err: error }, 'user:driverConnection resolve failed');
            return null;
        }
    },
};
