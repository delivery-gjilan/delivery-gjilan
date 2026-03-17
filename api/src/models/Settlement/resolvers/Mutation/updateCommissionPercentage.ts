import type { MutationResolvers } from './../../../../generated/types.generated';
import { randomUUID } from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import { drivers, businesses, settlementRules } from '@/database/schema';
import { AppError } from '@/lib/errors';

export const updateCommissionPercentage: NonNullable<MutationResolvers['updateCommissionPercentage']> = async (
    _parent,
    { driverId, businessId, percentage },
    { db },
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

            const driverRecord = await db.query.drivers.findFirst({
                where: eq(drivers.userId, driverId),
            });

            if (driverRecord) {
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
                const config = {
                    appliesTo: 'DELIVERY_FEE',
                    percentage,
                    source: 'DRIVER_PROFILE_COMMISSION',
                    description: 'Auto-synced from driver commission settings',
                };

                if (existingRule) {
                    await db
                        .update(settlementRules)
                        .set({
                            config,
                            isActive: percentage > 0,
                            updatedAt: now,
                        })
                        .where(eq(settlementRules.id, existingRule.id));
                } else {
                    await db.insert(settlementRules).values({
                        id: randomUUID(),
                        entityType: 'DRIVER',
                        entityId: driverRecord.id,
                        ruleType: 'PERCENTAGE',
                        config,
                        canStackWith: [],
                        priority: 100,
                        isActive: percentage > 0,
                        notes: 'Auto-created from driver commission settings',
                        activatedAt: now,
                        activatedBy: null,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            }
        }

        if (businessId) {
            await db
                .update(businesses)
                .set({ commissionPercentage: percentage.toString() })
                .where(eq(businesses.id, businessId))
                .execute();

            // Sync business commission to settlement rules (mirrors driver logic above)
            const existingBusinessRule = await db.query.settlementRules.findFirst({
                where: and(
                    eq(settlementRules.entityType, 'BUSINESS'),
                    eq(settlementRules.entityId, businessId),
                    eq(settlementRules.ruleType, 'PERCENTAGE'),
                    sql`(${settlementRules.config} ->> 'source') = 'BUSINESS_PROFILE_COMMISSION'`,
                    sql`(${settlementRules.config} ->> 'appliesTo') = 'ORDER_SUBTOTAL'`,
                ),
            });

            const now = new Date().toISOString();
            const businessConfig = {
                appliesTo: 'ORDER_SUBTOTAL',
                percentage,
                source: 'BUSINESS_PROFILE_COMMISSION',
                description: 'Auto-synced from business commission settings',
            };

            if (existingBusinessRule) {
                await db
                    .update(settlementRules)
                    .set({
                        config: businessConfig,
                        isActive: percentage > 0,
                        updatedAt: now,
                    })
                    .where(eq(settlementRules.id, existingBusinessRule.id));
            } else {
                await db.insert(settlementRules).values({
                    id: randomUUID(),
                    entityType: 'BUSINESS',
                    entityId: businessId,
                    ruleType: 'PERCENTAGE',
                    config: businessConfig,
                    canStackWith: [],
                    priority: 100,
                    isActive: percentage > 0,
                    notes: 'Auto-created from business commission settings',
                    activatedAt: now,
                    activatedBy: null,
                    createdAt: now,
                    updatedAt: now,
                });
            }
        }

        return true;
    } catch (error) {
        throw new AppError(`Failed to update commission percentage: ${error}`, 'INTERNAL_ERROR');
    }
};
