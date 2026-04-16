import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { drivers as driversTable } from '@/database/schema';
import { eq, inArray } from 'drizzle-orm';

export const adminBulkUpdateDriverCommissions: NonNullable<MutationResolvers['adminBulkUpdateDriverCommissions']> = async (
    _parent,
    { driverIds, commissionPercentage },
    { userData, authService, db },
) => {
    if (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN') {
        throw new GraphQLError('Only platform admins can update driver settings', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    if (!driverIds || driverIds.length === 0) {
        throw new GraphQLError('At least one driver ID is required', {
            extensions: { code: 'INVALID_INPUT' },
        });
    }

    if (commissionPercentage < 0 || commissionPercentage > 100) {
        throw new GraphQLError('Commission percentage must be between 0 and 100', {
            extensions: { code: 'INVALID_INPUT' },
        });
    }

    // Verify all drivers exist
    const users = await Promise.all(
        driverIds.map((id) => authService.getUserById(id))
    );
    
    for (let i = 0; i < users.length; i++) {
        if (!users[i] || users[i]!.role !== 'DRIVER') {
            throw new GraphQLError(`Driver not found: ${driverIds[i]}`, {
                extensions: { code: 'NOT_FOUND' },
            });
        }
    }

    // Update all drivers with explicit type casting
    const updates: Record<string, any> = {};
    updates.commissionPercentage = commissionPercentage;
    
    await db
        .update(driversTable)
        .set(updates as any)
        .where(inArray(driversTable.userId, driverIds));

    // Fetch and return updated drivers
    const updatedUsers = await Promise.all(
        driverIds.map((id) => authService.getUserById(id))
    );

    return updatedUsers as any[];
};
