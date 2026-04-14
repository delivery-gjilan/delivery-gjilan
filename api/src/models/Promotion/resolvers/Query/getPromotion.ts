
import type { QueryResolvers } from './../../../../generated/types.generated';
import { getDB } from '@/database';
import { promotions } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const getPromotion: NonNullable<QueryResolvers['getPromotion']> = async (_parent, { id }, _ctx) => {
    const db = await getDB();
    
    const [promo] = await db
        .select()
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
        scheduleType: promo.scheduleType,
        scheduleTimezone: promo.scheduleTimezone,
        dailyStartTime: promo.dailyStartTime,
        dailyEndTime: promo.dailyEndTime,
        activeWeekdays: Array.isArray(promo.activeWeekdays) ? promo.activeWeekdays : [],
        newUserWindowDays: promo.newUserWindowDays,
        createdAt: toISOString(promo.createdAt)!,
        totalUsageCount: promo.totalUsageCount,
        totalRevenue: promo.totalRevenue || 0,
        isRecovery: promo.isRecovery,
        creatorType: promo.creatorType,
        creatorId: promo.creatorId,
    };
};
