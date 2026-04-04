import type { BusinessResolvers } from './../../../generated/types.generated';
import { getDB } from '@/database';
import { promotions } from '@/database/schema/promotions';
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

    activePromotion: async (parent) => {
        const db = await getDB();
        const now = new Date().toISOString();

        // Find active promotions for this business.
        // A promotion applies if it is explicitly linked to this business
        // OR has no business eligibility entries (applies to all businesses).
        const activePromotions = await db
            .select({
                id: promotions.id,
                name: promotions.name,
                description: promotions.description,
                type: promotions.type,
                discountValue: promotions.discountValue,
                spendThreshold: promotions.spendThreshold,
                priority: promotions.priority,
            })
            .from(promotions)
            .where(
                and(
                    eq(promotions.isActive, true),
                    eq(promotions.isDeleted, false),
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
            spendThreshold: promo.spendThreshold ?? null,
        };
    },
};
