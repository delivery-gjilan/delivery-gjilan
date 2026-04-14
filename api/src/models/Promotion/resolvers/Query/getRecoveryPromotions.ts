import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { promotions } from '@/database/schema';
import { and, eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export const getRecoveryPromotions: NonNullable<QueryResolvers['getRecoveryPromotions']> = async (
    _parent,
    _args,
    { userData },
) => {
    if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
        throw AppError.forbidden();
    }

    const db = await getDB();

    const promoList = await db
        .select({
            id: promotions.id,
            name: promotions.name,
            description: promotions.description,
            code: promotions.code,
            type: promotions.type,
            target: promotions.target,
            discountValue: promotions.discountValue,
            maxDiscountCap: promotions.maxDiscountCap,
            minOrderAmount: promotions.minOrderAmount,
            spendThreshold: promotions.spendThreshold,
            thresholdReward: promotions.thresholdReward,
            maxGlobalUsage: promotions.maxGlobalUsage,
            currentGlobalUsage: promotions.currentGlobalUsage,
            maxUsagePerUser: promotions.maxUsagePerUser,
            isStackable: promotions.isStackable,
            priority: promotions.priority,
            isActive: promotions.isActive,
            isRecovery: promotions.isRecovery,
            orderId: promotions.orderId,
            startsAt: promotions.startsAt,
            endsAt: promotions.endsAt,
            createdAt: promotions.createdAt,
            totalUsageCount: promotions.totalUsageCount,
            totalRevenue: promotions.totalRevenue,
            creatorType: promotions.creatorType,
            creatorId: promotions.creatorId,
        })
        .from(promotions)
        .where(and(eq(promotions.isDeleted, false), eq(promotions.isRecovery, true)));

    const toISO = (d: any) => (!d ? null : typeof d === 'string' ? d : new Date(d).toISOString());

    return promoList.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        code: p.code,
        type: p.type,
        target: p.target,
        discountValue: p.discountValue,
        maxDiscountCap: p.maxDiscountCap,
        minOrderAmount: p.minOrderAmount,
        spendThreshold: p.spendThreshold,
        thresholdReward: p.thresholdReward ? JSON.stringify(p.thresholdReward) : null,
        maxGlobalUsage: p.maxGlobalUsage,
        currentGlobalUsage: p.currentGlobalUsage,
        maxUsagePerUser: p.maxUsagePerUser,
        isStackable: p.isStackable,
        priority: p.priority,
        isActive: p.isActive,
        isRecovery: p.isRecovery,
        orderId: p.orderId ?? null,
        startsAt: toISO(p.startsAt),
        endsAt: toISO(p.endsAt),
        createdAt: toISO(p.createdAt)!,
        totalUsageCount: p.totalUsageCount,
        totalRevenue: p.totalRevenue || 0,
        creatorType: p.creatorType,
        creatorId: p.creatorId,
    })) as any;
};
