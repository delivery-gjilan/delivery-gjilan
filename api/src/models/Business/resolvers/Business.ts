import type { BusinessResolvers } from './../../../generated/types.generated';
import { getDB } from '@/database';
import { orderReviews } from '@/database/schema';
import { promotions, userPromotions } from '@/database/schema/promotions';
import { eq, and, isNull, lte, gte, or, sql, inArray } from 'drizzle-orm';

/**
 * Parse a working hours time string like "08:00" into total minutes from midnight.
 */
function parseTimeToMinutes(t: string): number {
    const parts = t.split(':');
    const h = Number(parts[0] ?? 0);
    const m = Number(parts[1] ?? 0);
    return h * 60 + m;
}

export const Business: BusinessResolvers = {
    isOpen: (parent) => {
        if (parent.isActive === false) {
            return false;
        }

        if (parent.isTemporarilyClosed) {
            return false;
        }

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const currentDay = now.getDay(); // 0 = Sunday

        // If a per-day schedule exists, use it
        if (parent.schedule && parent.schedule.length > 0) {
            const todaySlots = parent.schedule.filter((s) => s.dayOfWeek === currentDay);
            if (todaySlots.length === 0) return false; // no slot → closed today

            return todaySlots.some((slot) => {
                const opensAt = parseTimeToMinutes(slot.opensAt);
                const closesAt = parseTimeToMinutes(slot.closesAt);
                if (closesAt <= opensAt) {
                    // crosses midnight
                    return currentMinutes >= opensAt || currentMinutes < closesAt;
                }
                return currentMinutes >= opensAt && currentMinutes < closesAt;
            });
        }

        // Fallback to legacy workingHours on the business row
        const opensAt = parseTimeToMinutes(parent.workingHours.opensAt);
        const closesAt = parseTimeToMinutes(parent.workingHours.closesAt);

        if (closesAt <= opensAt) {
            return currentMinutes >= opensAt || currentMinutes < closesAt;
        }
        return currentMinutes >= opensAt && currentMinutes < closesAt;
    },

    activePromotion: async (parent, _args, ctx) => {
        const db = await getDB();
        const now = new Date().toISOString();
        const userId = (ctx as any)?.userData?.userId as string | undefined;

        // Find active promotions for this business.
        // A promotion applies if it is explicitly linked to this business
        // OR has no business eligibility entries (applies to all businesses).
        // SPECIFIC_USERS promos are excluded here — they only show if assigned to and unused by this user.
        const activePromotions = await db
            .select({
                id: promotions.id,
                name: promotions.name,
                description: promotions.description,
                code: promotions.code,
                type: promotions.type,
                creatorType: promotions.creatorType,
                discountValue: promotions.discountValue,
                spendThreshold: promotions.spendThreshold,
                priority: promotions.priority,
                target: promotions.target,
                maxUsagePerUser: promotions.maxUsagePerUser,
            })
            .from(promotions)
            .where(
                and(
                    eq(promotions.isActive, true),
                    eq(promotions.isDeleted, false),
                    // Business/public promo badges should only show auto-applicable promos.
                    isNull(promotions.code),
                    or(
                        isNull(promotions.startsAt),
                        lte(promotions.startsAt, now)
                    ),
                    or(
                        isNull(promotions.endsAt),
                        gte(promotions.endsAt, now)
                    ),
                    or(
                        // Explicitly linked to this business
                        sql`EXISTS (SELECT 1 FROM promotion_business_eligibility WHERE promotion_id = ${promotions.id} AND business_id = ${parent.id})`,
                        // No business restrictions → applies to all
                        sql`NOT EXISTS (SELECT 1 FROM promotion_business_eligibility WHERE promotion_id = ${promotions.id})`
                    )
                )
            )
            .orderBy(sql`${promotions.priority} DESC`);

        if (activePromotions.length === 0) {
            return null;
        }

        // Filter out SPECIFIC_USERS promos that aren't assigned to or have been fully used by this user.
        const specificUserPromos = activePromotions.filter((p) => p.target === 'SPECIFIC_USERS');
        let userAssignmentsByPromoId = new Map<string, { usageCount: number }>();

        if (specificUserPromos.length > 0 && userId) {
            // Single batch query instead of one per promo.
            const assignmentRows = await db
                .select({ promotionId: userPromotions.promotionId, usageCount: userPromotions.usageCount })
                .from(userPromotions)
                .where(
                    and(
                        inArray(userPromotions.promotionId, specificUserPromos.map((p) => p.id)),
                        eq(userPromotions.userId, userId),
                    ),
                );
            userAssignmentsByPromoId = new Map(assignmentRows.map((r) => [r.promotionId, { usageCount: r.usageCount }]));
        }

        const promo = activePromotions.find((p) => {
            if (p.target !== 'SPECIFIC_USERS') return true;
            if (!userId) return false;
            const assignment = userAssignmentsByPromoId.get(p.id);
            if (!assignment) return false;
            if (p.maxUsagePerUser && assignment.usageCount >= p.maxUsagePerUser) return false;
            return true;
        });
        if (!promo) return null;
        return {
            id: promo.id,
            name: promo.name,
            description: promo.description ?? null,
            code: promo.code,
            type: promo.type,
            creatorType: promo.creatorType,
            discountValue: promo.discountValue ?? null,
            spendThreshold: promo.spendThreshold ?? null,
        };
    },

    ratingAverage: async (parent) => {
        const db = await getDB();
        const [result] = await db
            .select({ avg: sql<number | null>`avg(${orderReviews.rating})` })
            .from(orderReviews)
            .where(eq(orderReviews.businessId, String(parent.id)));

        if (!result?.avg) return 0;
        return Number(result.avg);
    },

    ratingCount: async (parent) => {
        const db = await getDB();
        const [result] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(orderReviews)
            .where(eq(orderReviews.businessId, String(parent.id)));

        return result?.count ?? 0;
    },
};
