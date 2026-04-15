import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { drivers as driversTable } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const adminUpdateDriverSettings: NonNullable<MutationResolvers['adminUpdateDriverSettings']> = async (
    _parent,
    { driverId, commissionPercentage, maxActiveOrders, hasOwnVehicle, vehicleType },
    { userData, authService, db },
) => {
    if (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only platform admins can update driver settings', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const user = await authService.getUserById(driverId);
    if (!user || user.role !== 'DRIVER') {
        throw new GraphQLError('Driver not found', { extensions: { code: 'NOT_FOUND' } });
    }

    const updates: Record<string, unknown> = {};
    if (commissionPercentage !== null && commissionPercentage !== undefined) {
        updates.commissionPercentage = String(commissionPercentage);
    }
    if (maxActiveOrders !== null && maxActiveOrders !== undefined) {
        updates.maxActiveOrders = String(maxActiveOrders);
    }
    if (hasOwnVehicle !== null && hasOwnVehicle !== undefined) {
        updates.hasOwnVehicle = hasOwnVehicle;
    }
    if (vehicleType !== null && vehicleType !== undefined) {
        updates.vehicleType = vehicleType;
    }

    if (Object.keys(updates).length > 0) {
        await db.update(driversTable).set(updates).where(eq(driversTable.userId, driverId));
    }

    return user as any;
};
