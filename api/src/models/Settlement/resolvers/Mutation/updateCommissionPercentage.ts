// @ts-nocheck
import type { MutationResolvers } from './../../../../generated/types.generated';
import { AppContext } from '@/index';
import { eq } from 'drizzle-orm';
import { drivers, businesses } from '@/database/schema';
import { AppError } from '@/lib/errors';

export const updateCommissionPercentage: NonNullable<MutationResolvers['updateCommissionPercentage']> = async (
    _parent,
    { driverId, businessId, percentage },
    { db }
) => {
    if (!driverId && !businessId) {
        throw AppError.badInput('Must provide either driverId or businessId');
    }

    if (percentage < 0 || percentage > 100) {
        throw AppError.badInput('Percentage must be between 0 and 100');
    }

    try {
        if (driverId) {
            await db
                .update(drivers)
                .set({ commissionPercentage: percentage.toString() })
                .where(eq(drivers.userId, driverId))
                .execute();
        }

        if (businessId) {
            await db
                .update(businesses)
                .set({ commissionPercentage: percentage.toString() })
                .where(eq(businesses.id, businessId))
                .execute();
        }

        return true;
    } catch (error) {
        throw new AppError(`Failed to update commission percentage: ${error}`, 'INTERNAL_ERROR');
    }
};