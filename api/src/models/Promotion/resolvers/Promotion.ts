import type { PromotionResolvers } from './../../../generated/types.generated';
import { getDB } from '@/database';
import { userPromotions } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const Promotion: PromotionResolvers = {
    assignedUsers: async (parent) => {
        const db = await getDB();
        const rows = await db
            .select()
            .from(userPromotions)
            .where(eq(userPromotions.promotionId, (parent as any).id));
        return rows.map((r) => ({
            id: r.id,
            userId: r.userId,
            promotionId: r.promotionId,
            assignedAt: r.assignedAt,
            expiresAt: r.expiresAt ?? null,
            usageCount: r.usageCount,
        })) as any;
    },
};