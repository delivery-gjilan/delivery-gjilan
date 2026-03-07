// @ts-nocheck
import type { BusinessResolvers } from './../../../generated/types.generated';
import { getDB } from '@/database';
import { promotions, promotionBusinessEligibility } from '@/database/schema/promotions';
import { eq, and, isNull, lte, gte, or, sql } from 'drizzle-orm';

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

    activePromotion: async (parent) => {
        const db = await getDB();
        const now = new Date().toISOString();

        // Find active promotions for this business
        const activePromotions = await db
            .select({
                id: promotions.id,
                name: promotions.name,
                description: promotions.description,
                type: promotions.type,
                discountValue: promotions.discountValue,
                priority: promotions.priority,
            })
            .from(promotions)
            .innerJoin(
                promotionBusinessEligibility,
                eq(promotionBusinessEligibility.promotionId, promotions.id)
            )
            .where(
                and(
                    eq(promotionBusinessEligibility.businessId, parent.id),
                    eq(promotions.isActive, true),
                    or(
                        isNull(promotions.startsAt),
                        lte(promotions.startsAt, now)
                    ),
                    or(
                        isNull(promotions.endsAt),
                        gte(promotions.endsAt, now)
                    )
                )
            )
            .orderBy(sql`${promotions.priority} DESC`)
            .limit(1);

        if (activePromotions.length === 0) {
            return null;
        }

        const promo = activePromotions[0];
        return {
            id: promo.id,
            name: promo.name,
            description: promo.description ?? null,
            type: promo.type,
            discountValue: promo.discountValue ?? null,
        };
    },
};
