import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { promotionUsage } from '@/database/schema/promotions';
import { orderPromotions } from '@/database/schema/orderPromotions';
import { businesses } from '@/database/schema/businesses';
import { and, gte, inArray, lte, sql } from 'drizzle-orm';

const toNumber = (value: number | string | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const toISOString = (date: Date | string | null | undefined): string | null => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return new Date(date).toISOString();
};

export const getPromotionsAnalytics: NonNullable<QueryResolvers['getPromotionsAnalytics']> = async (
    _parent,
    { from, to, includeRecovery, isActive },
    { userData, db, promotionService },
) => {
    if (!userData.userId || (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN')) {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
    }

    const allPromotions = await promotionService.listPromotions({
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
    });

    const filteredPromotions = (includeRecovery ? allPromotions : allPromotions.filter((p) => !p.isRecovery)).sort(
        (a, b) => Number(new Date(b.createdAt as any)) - Number(new Date(a.createdAt as any)),
    );

    if (filteredPromotions.length === 0) {
        return {
            summary: {
                totalUsageCount: 0,
                totalDeducted: 0,
                totalDiscountDeducted: 0,
                totalDeliveryDeducted: 0,
                platformPaid: 0,
                businessPaid: 0,
                uniqueUsers: 0,
                averageOrderValue: 0,
            },
            items: [],
            dailyPoints: [],
        };
    }

    const promotionIds = filteredPromotions.map((p) => p.id);

    const usageConditions = [inArray(promotionUsage.promotionId, promotionIds)];
    if (from) usageConditions.push(gte(promotionUsage.createdAt, from));
    if (to) usageConditions.push(lte(promotionUsage.createdAt, to));

    const deductionConditions = [inArray(orderPromotions.promotionId, promotionIds)];
    if (from) deductionConditions.push(gte(orderPromotions.createdAt, from));
    if (to) deductionConditions.push(lte(orderPromotions.createdAt, to));

    const creatorBusinessIds = Array.from(
        new Set(filteredPromotions.map((p) => p.creatorId).filter((id): id is string => Boolean(id))),
    );
    const promotionById = new Map(filteredPromotions.map((promo) => [promo.id, promo]));

    const [usageAgg, deductionAgg, summaryAgg, creatorBusinesses, dailyUsageAgg, dailyDeductionAgg] = await Promise.all([
        db
            .select({
                promotionId: promotionUsage.promotionId,
                totalUsageCount: sql<number>`count(*)`,
                uniqueUsers: sql<number>`count(distinct ${promotionUsage.userId})`,
                freeDeliveryUsageCount: sql<number>`sum(case when ${promotionUsage.freeDeliveryApplied} then 1 else 0 end)`,
                averageOrderValue: sql<number>`coalesce(avg(${promotionUsage.orderSubtotal}), 0)`,
            })
            .from(promotionUsage)
            .where(and(...usageConditions))
            .groupBy(promotionUsage.promotionId),
        db
            .select({
                promotionId: orderPromotions.promotionId,
                totalDeducted: sql<number>`coalesce(sum(${orderPromotions.discountAmount}), 0)`,
                totalDiscountDeducted: sql<number>`coalesce(sum(case when ${orderPromotions.appliesTo} = 'PRICE' then ${orderPromotions.discountAmount} else 0 end), 0)`,
                totalDeliveryDeducted: sql<number>`coalesce(sum(case when ${orderPromotions.appliesTo} = 'DELIVERY' then ${orderPromotions.discountAmount} else 0 end), 0)`,
            })
            .from(orderPromotions)
            .where(and(...deductionConditions))
            .groupBy(orderPromotions.promotionId),
        db
            .select({
                uniqueUsers: sql<number>`count(distinct ${promotionUsage.userId})`,
                averageOrderValue: sql<number>`coalesce(avg(${promotionUsage.orderSubtotal}), 0)`,
                totalUsageCount: sql<number>`count(*)`,
            })
            .from(promotionUsage)
            .where(and(...usageConditions)),
        creatorBusinessIds.length > 0
            ? db
                  .select({ id: businesses.id, name: businesses.name })
                  .from(businesses)
                  .where(inArray(businesses.id, creatorBusinessIds))
            : Promise.resolve([]),
        db
            .select({
                day: sql<string>`to_char(date_trunc('day', ${promotionUsage.createdAt}), 'YYYY-MM-DD')`,
                usageCount: sql<number>`count(*)`,
                uniqueUsers: sql<number>`count(distinct ${promotionUsage.userId})`,
            })
            .from(promotionUsage)
            .where(and(...usageConditions))
            .groupBy(sql`date_trunc('day', ${promotionUsage.createdAt})`)
            .orderBy(sql`date_trunc('day', ${promotionUsage.createdAt})`),
        db
            .select({
                day: sql<string>`to_char(date_trunc('day', ${orderPromotions.createdAt}), 'YYYY-MM-DD')`,
                promotionId: orderPromotions.promotionId,
                totalDeducted: sql<number>`coalesce(sum(${orderPromotions.discountAmount}), 0)`,
                totalDiscountDeducted: sql<number>`coalesce(sum(case when ${orderPromotions.appliesTo} = 'PRICE' then ${orderPromotions.discountAmount} else 0 end), 0)`,
                totalDeliveryDeducted: sql<number>`coalesce(sum(case when ${orderPromotions.appliesTo} = 'DELIVERY' then ${orderPromotions.discountAmount} else 0 end), 0)`,
            })
            .from(orderPromotions)
            .where(and(...deductionConditions))
            .groupBy(sql`date_trunc('day', ${orderPromotions.createdAt})`, orderPromotions.promotionId)
            .orderBy(sql`date_trunc('day', ${orderPromotions.createdAt})`),
    ]);

    const usageMap = new Map(usageAgg.map((row) => [row.promotionId, row]));
    const deductionMap = new Map(deductionAgg.map((row) => [row.promotionId, row]));
    const creatorBusinessNameMap = new Map(creatorBusinesses.map((row) => [row.id, row.name]));

    const items = filteredPromotions.map((promo) => {
        const usage = usageMap.get(promo.id);
        const deduction = deductionMap.get(promo.id);

        const totalDeducted = toNumber(deduction?.totalDeducted);
        const totalDiscountDeducted = toNumber(deduction?.totalDiscountDeducted);
        const totalDeliveryDeducted = toNumber(deduction?.totalDeliveryDeducted);

        const platformPaid = promo.creatorType === 'PLATFORM' ? totalDeducted : 0;
        const businessPaid = promo.creatorType === 'BUSINESS' ? totalDeducted : 0;

        return {
            promotion: {
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
                creatorType: promo.creatorType,
                creatorId: promo.creatorId,
                isRecovery: promo.isRecovery,
            },
            creatorName: promo.creatorId ? creatorBusinessNameMap.get(promo.creatorId) ?? null : null,
            totalUsageCount: toNumber(usage?.totalUsageCount),
            uniqueUsers: toNumber(usage?.uniqueUsers),
            totalDeducted,
            totalDiscountDeducted,
            totalDeliveryDeducted,
            platformPaid,
            businessPaid,
            freeDeliveryUsageCount: toNumber(usage?.freeDeliveryUsageCount),
            averageOrderValue: toNumber(usage?.averageOrderValue),
        };
    });

    const summaryFromItems = items.reduce(
        (acc, item) => {
            acc.totalDeducted += item.totalDeducted;
            acc.totalDiscountDeducted += item.totalDiscountDeducted;
            acc.totalDeliveryDeducted += item.totalDeliveryDeducted;
            acc.platformPaid += item.platformPaid;
            acc.businessPaid += item.businessPaid;
            return acc;
        },
        {
            totalDeducted: 0,
            totalDiscountDeducted: 0,
            totalDeliveryDeducted: 0,
            platformPaid: 0,
            businessPaid: 0,
        },
    );

    const dailyPointMap = new Map<
        string,
        {
            date: string;
            usageCount: number;
            uniqueUsers: number;
            totalDeducted: number;
            totalDiscountDeducted: number;
            totalDeliveryDeducted: number;
            platformPaid: number;
            businessPaid: number;
        }
    >();

    for (const row of dailyUsageAgg) {
        const day = row.day;
        const existing = dailyPointMap.get(day);
        dailyPointMap.set(day, {
            date: day,
            usageCount: toNumber(row.usageCount),
            uniqueUsers: toNumber(row.uniqueUsers),
            totalDeducted: existing?.totalDeducted ?? 0,
            totalDiscountDeducted: existing?.totalDiscountDeducted ?? 0,
            totalDeliveryDeducted: existing?.totalDeliveryDeducted ?? 0,
            platformPaid: existing?.platformPaid ?? 0,
            businessPaid: existing?.businessPaid ?? 0,
        });
    }

    for (const row of dailyDeductionAgg) {
        const day = row.day;
        const promo = promotionById.get(row.promotionId);
        const existing = dailyPointMap.get(day) ?? {
            date: day,
            usageCount: 0,
            uniqueUsers: 0,
            totalDeducted: 0,
            totalDiscountDeducted: 0,
            totalDeliveryDeducted: 0,
            platformPaid: 0,
            businessPaid: 0,
        };

        const rowTotalDeducted = toNumber(row.totalDeducted);

        existing.totalDeducted += rowTotalDeducted;
        existing.totalDiscountDeducted += toNumber(row.totalDiscountDeducted);
        existing.totalDeliveryDeducted += toNumber(row.totalDeliveryDeducted);

        if (promo?.creatorType === 'BUSINESS') {
            existing.businessPaid += rowTotalDeducted;
        } else {
            existing.platformPaid += rowTotalDeducted;
        }

        dailyPointMap.set(day, existing);
    }

    const dailyPoints = Array.from(dailyPointMap.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((point) => ({
            date: point.date,
            usageCount: point.usageCount,
            uniqueUsers: point.uniqueUsers,
            totalDeducted: Number(point.totalDeducted.toFixed(2)),
            totalDiscountDeducted: Number(point.totalDiscountDeducted.toFixed(2)),
            totalDeliveryDeducted: Number(point.totalDeliveryDeducted.toFixed(2)),
            platformPaid: Number(point.platformPaid.toFixed(2)),
            businessPaid: Number(point.businessPaid.toFixed(2)),
        }));

    return {
        summary: {
            totalUsageCount: toNumber(summaryAgg[0]?.totalUsageCount),
            totalDeducted: Number(summaryFromItems.totalDeducted.toFixed(2)),
            totalDiscountDeducted: Number(summaryFromItems.totalDiscountDeducted.toFixed(2)),
            totalDeliveryDeducted: Number(summaryFromItems.totalDeliveryDeducted.toFixed(2)),
            platformPaid: Number(summaryFromItems.platformPaid.toFixed(2)),
            businessPaid: Number(summaryFromItems.businessPaid.toFixed(2)),
            uniqueUsers: toNumber(summaryAgg[0]?.uniqueUsers),
            averageOrderValue: Number(toNumber(summaryAgg[0]?.averageOrderValue).toFixed(2)),
        },
        items,
        dailyPoints,
    };
};
