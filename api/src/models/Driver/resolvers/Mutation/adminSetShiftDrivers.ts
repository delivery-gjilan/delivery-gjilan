import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { cache } from '@/lib/cache';
import logger from '@/lib/logger';

export const SHIFT_DRIVERS_CACHE_KEY = 'admin:shift:driverIds';
/** 24 hours — long enough to survive a full ops day without re-setting */
const SHIFT_TTL_S = 86_400;

export const adminSetShiftDrivers: NonNullable<MutationResolvers['adminSetShiftDrivers']> =
    async (_parent, { driverIds }, { userData }) => {
        if (!userData.userId) {
            throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
        }
        if (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN') {
            throw new GraphQLError('Admin access required', { extensions: { code: 'FORBIDDEN' } });
        }

        if (driverIds.length === 0) {
            // Empty list = clear the restriction (all eligible drivers get notifications)
            await cache.del(SHIFT_DRIVERS_CACHE_KEY);
            logger.info({ adminId: userData.userId }, 'adminSetShiftDrivers: shift restriction cleared');
        } else {
            await cache.set(SHIFT_DRIVERS_CACHE_KEY, driverIds, SHIFT_TTL_S);
            logger.info(
                { adminId: userData.userId, count: driverIds.length, driverIds },
                'adminSetShiftDrivers: shift set',
            );
        }

        return true;
    };
