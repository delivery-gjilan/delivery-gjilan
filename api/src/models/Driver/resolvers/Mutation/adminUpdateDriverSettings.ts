import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { randomUUID } from 'crypto';
import { drivers as driversTable, settlementRules } from '@/database/schema';
import { and, eq, sql } from 'drizzle-orm';

export const adminUpdateDriverSettings: NonNullable<MutationResolvers['adminUpdateDriverSettings']> = async (
    _parent,
    { driverId, commissionPercentage, maxActiveOrders, hasOwnVehicle },
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

    if (Object.keys(updates).length > 0) {
        await db.update(driversTable).set(updates).where(eq(driversTable.userId, driverId));
    }

    if (commissionPercentage !== null && commissionPercentage !== undefined) {
        const driverRecord = await db.query.drivers.findFirst({
            where: eq(driversTable.userId, driverId),
        });

        if (!driverRecord) {
            throw new GraphQLError('Driver profile not found', { extensions: { code: 'NOT_FOUND' } });
        }

        const existingRule = await db.query.settlementRules.findFirst({
            where: and(
                eq(settlementRules.entityType, 'DRIVER'),
                eq(settlementRules.entityId, driverRecord.id),
                eq(settlementRules.ruleType, 'PERCENTAGE'),
                sql`(${settlementRules.config} ->> 'source') = 'DRIVER_PROFILE_COMMISSION'`,
                sql`(${settlementRules.config} ->> 'appliesTo') = 'DELIVERY_FEE'`,
            ),
        });

        const now = new Date().toISOString();
        const normalizedCommission = Math.max(0, Math.min(100, Number(commissionPercentage)));
        const baseConfig = {
            appliesTo: 'DELIVERY_FEE',
            percentage: normalizedCommission,
            source: 'DRIVER_PROFILE_COMMISSION',
            description: 'Auto-synced from driver commission settings',
        };

        if (existingRule) {
            await db
                .update(settlementRules)
                .set({
                    config: baseConfig,
                    isActive: normalizedCommission > 0,
                    updatedAt: now,
                })
                .where(eq(settlementRules.id, existingRule.id));
        } else {
            await db.insert(settlementRules).values({
                id: randomUUID(),
                entityType: 'DRIVER',
                entityId: driverRecord.id,
                ruleType: 'PERCENTAGE',
                config: baseConfig,
                canStackWith: [],
                priority: 100,
                isActive: normalizedCommission > 0,
                notes: 'Auto-created from driver commission settings',
                activatedAt: now,
                activatedBy: userData.userId,
                createdAt: now,
                updatedAt: now,
            });
        }
    }

    return user;
};
