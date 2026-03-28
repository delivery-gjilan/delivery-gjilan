
import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { drivers as driversTable } from '@/database/schema/drivers';
import { eq } from 'drizzle-orm';

export const driverUpdateBatteryStatus: NonNullable<MutationResolvers['driverUpdateBatteryStatus']> = async (
        _parent,
        { level, optIn, isCharging },
        { userData, db }
) => {
        if (!userData.userId) {
                throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
        }

        if (userData.role !== 'DRIVER') {
                throw new GraphQLError('Only drivers can update battery status', { extensions: { code: 'FORBIDDEN' } });
        }

        if (level < 0 || level > 100) {
                throw new GraphQLError('Battery level must be between 0 and 100', {
                        extensions: { code: 'BAD_USER_INPUT' },
                });
        }

        const now = new Date().toISOString();
        const [driver] = await db
                .update(driversTable)
                .set({
                        batteryLevel: optIn ? Math.round(level) : null,
                        batteryOptIn: optIn,
                        batteryUpdatedAt: now,
                        isCharging: optIn ? (isCharging ?? null) : null,
                })
                .where(eq(driversTable.userId, userData.userId))
                .returning();

        if (!driver) {
                throw new GraphQLError('Driver not found', { extensions: { code: 'NOT_FOUND' } });
        }

        return {
                onlinePreference: driver.onlinePreference,
                connectionStatus: driver.connectionStatus,
                lastHeartbeatAt: driver.lastHeartbeatAt ? new Date(driver.lastHeartbeatAt) : null,
                lastLocationUpdate: driver.lastLocationUpdate ? new Date(driver.lastLocationUpdate) : null,
                disconnectedAt: driver.disconnectedAt ? new Date(driver.disconnectedAt) : null,
                batteryLevel: driver.batteryLevel,
                batteryOptIn: driver.batteryOptIn,
                batteryUpdatedAt: driver.batteryUpdatedAt ? new Date(driver.batteryUpdatedAt) : null,
                isCharging: driver.isCharging,
                activeOrderId: null,
                navigationPhase: null,
                remainingEtaSeconds: null,
                etaUpdatedAt: null,
        };
};