
import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { promotions } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const getPromotion: NonNullable<QueryResolvers['getPromotion']> = async (_parent, { id }, _ctx) => {
    const db = await getDB();
    
    const [promo] = await db
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
            startsAt: promotions.startsAt,
            endsAt: promotions.endsAt,
            createdAt: promotions.createdAt,
            totalUsageCount: promotions.totalUsageCount,
            totalRevenue: promotions.totalRevenue,
            creatorType: promotions.creatorType,
            creatorId: promotions.creatorId,
        })
        .from(promotions)
        .where(eq(promotions.id, id))
        .limit(1);
    
    if (!promo) {
        return null;
    }

    // Helper to ensure ISO string format
    const toISOString = (date: Date | string | null | undefined): string | null => {
        if (!date) return null;
        if (typeof date === 'string') return date;
        return new Date(date).toISOString();
    };

    return {
        id: promo.id,
        name: promo.name,
        description: promo.description,
        code: promo.code,
        type: promo.type,
        target: promo.target,
        discountValue: promo.discountValue,
        maxDiscountCap: promo.maxDiscountCap,
        minOrderAmount: promo.minOrderAmount,
        spendThreshold: promo.spendThreshold,
        thresholdReward: promo.thresholdReward ? JSON.stringify(promo.thresholdReward) : null,
        maxGlobalUsage: promo.maxGlobalUsage,
        currentGlobalUsage: promo.currentGlobalUsage,
        maxUsagePerUser: promo.maxUsagePerUser,
        isStackable: promo.isStackable,
        priority: promo.priority,
        isActive: promo.isActive,
        startsAt: toISOString(promo.startsAt),
        endsAt: toISOString(promo.endsAt),
        scheduleType: 'DATE_RANGE',
        scheduleTimezone: null,
        dailyStartTime: null,
        dailyEndTime: null,
        activeWeekdays: [],
        newUserWindowDays: null,
        createdAt: toISOString(promo.createdAt)!,
        totalUsageCount: promo.totalUsageCount,
        totalRevenue: promo.totalRevenue || 0,
        isRecovery: promo.isRecovery,
        creatorType: promo.creatorType,
        creatorId: promo.creatorId,
    };
};
