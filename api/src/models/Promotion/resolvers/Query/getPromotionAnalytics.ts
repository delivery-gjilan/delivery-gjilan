
import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { getDB } from '@/database';
import { promotions, promotionUsage } from '@/database/schema/promotions';
import { eq, sql } from 'drizzle-orm';

export const getPromotionAnalytics: NonNullable<QueryResolvers['getPromotionAnalytics']> = async (
        _parent,
        { promotionId },
        { userData },
) => {
        if (!userData.userId || (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN')) {
                throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
        }

        const db = await getDB();

        const [promo] = await db
                .select()
                .from(promotions)
                .where(eq(promotions.id, promotionId))
                .limit(1);

        if (!promo) {
                throw new GraphQLError('Promotion not found', { extensions: { code: 'NOT_FOUND' } });
        }

        const [agg] = await db
                .select({
                        usageCount: sql<number>`count(*)`,
                        totalDiscountGiven: sql<number>`coalesce(sum(${promotionUsage.discountAmount}), 0)`,
                        uniqueUsers: sql<number>`count(distinct ${promotionUsage.userId})`,
                        averageOrderValue: sql<number>`coalesce(avg(${promotionUsage.orderSubtotal}), 0)`,
                })
                .from(promotionUsage)
                .where(eq(promotionUsage.promotionId, promotionId));

        const toISOString = (date: Date | string | null | undefined): string | null => {
                if (!date) return null;
                if (typeof date === 'string') return date;
                return new Date(date).toISOString();
        };

        const promotion = {
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
                createdAt: toISOString(promo.createdAt)!,
                totalUsageCount: promo.totalUsageCount,
                totalRevenue: promo.totalRevenue || 0,
                creatorType: promo.creatorType,
                creatorId: promo.creatorId,
                isRecovery: promo.isRecovery,
        };

        return {
                promotion,
                totalUsageCount: Number(agg?.usageCount ?? 0),
                totalRevenue: Number(promo.totalRevenue ?? 0),
                totalDiscountGiven: Number(agg?.totalDiscountGiven ?? 0),
                uniqueUsers: Number(agg?.uniqueUsers ?? 0),
                averageOrderValue: Number(agg?.averageOrderValue ?? 0),
                conversionRate: null,
        };
};