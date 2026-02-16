import { DbType } from '@/database';
import { promotions, promotionRedemptions, promotionTargetUsers } from '@/database/schema';
import type { DbPromotion, NewDbPromotion } from '@/database/schema/promotions';
import type { NewDbPromotionRedemption } from '@/database/schema/promotionRedemptions';
import { and, eq, sql, inArray } from 'drizzle-orm';

export class PromotionRepository {
    constructor(private db: DbType) {}

    async findAll(): Promise<DbPromotion[]> {
        return this.db.select().from(promotions).orderBy(promotions.createdAt);
    }

    async findById(id: string): Promise<DbPromotion | undefined> {
        const [promotion] = await this.db.select().from(promotions).where(eq(promotions.id, id));
        return promotion;
    }

    async findByCode(code: string): Promise<DbPromotion | undefined> {
        const [promotion] = await this.db
            .select()
            .from(promotions)
            .where(eq(promotions.code, code));
        return promotion;
    }

    async create(data: NewDbPromotion): Promise<DbPromotion> {
        const [promotion] = await this.db.insert(promotions).values(data).returning();
        return promotion;
    }

    async update(id: string, data: Partial<NewDbPromotion>): Promise<DbPromotion | undefined> {
        const [promotion] = await this.db.update(promotions).set(data).where(eq(promotions.id, id)).returning();
        return promotion;
    }

    async delete(id: string): Promise<boolean> {
        const [deleted] = await this.db.delete(promotions).where(eq(promotions.id, id)).returning();
        return !!deleted;
    }

    async countRedemptions(promotionId: string): Promise<number> {
        const [row] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(promotionRedemptions)
            .where(eq(promotionRedemptions.promotionId, promotionId));
        return Number(row?.count || 0);
    }

    async countRedemptionsByUser(promotionId: string, userId: string): Promise<number> {
        const [row] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(promotionRedemptions)
            .where(and(eq(promotionRedemptions.promotionId, promotionId), eq(promotionRedemptions.userId, userId)));
        return Number(row?.count || 0);
    }

    async createRedemption(data: NewDbPromotionRedemption) {
        const [redemption] = await this.db.insert(promotionRedemptions).values(data).returning();
        return redemption;
    }

    async findAutoApplyPromotions(userId: string): Promise<DbPromotion[]> {
        const now = new Date();
        
        // Find all auto-apply promotions that are:
        // 1. Active
        // 2. Auto-apply is true
        // 3. Within date range (or no date restrictions)
        // 4. Either: no target users OR user is in target users
        
        const allAutoApply = await this.db
            .select()
            .from(promotions)
            .where(
                and(
                    eq(promotions.isActive, true),
                    eq(promotions.autoApply, true)
                )
            );
        
        // Filter by date range
        const validPromos = allAutoApply.filter(promo => {
            if (promo.startsAt && new Date(promo.startsAt) > now) return false;
            if (promo.endsAt && new Date(promo.endsAt) < now) return false;
            return true;
        });
        
        // For each promo, check if it's user-targeted
        const result: DbPromotion[] = [];
        for (const promo of validPromos) {
            const targetUsers = await this.getTargetUserIds(promo.id);
            // If no target users, it's for everyone
            // If has target users, check if this user is included
            if (targetUsers.length === 0 || targetUsers.includes(userId)) {
                result.push(promo);
            }
        }
        
        return result;
    }

    async getTargetUserIds(promotionId: string): Promise<string[]> {
        const targets = await this.db
            .select({ userId: promotionTargetUsers.userId })
            .from(promotionTargetUsers)
            .where(eq(promotionTargetUsers.promotionId, promotionId));
        return targets.map(t => t.userId);
    }

    async setTargetUsers(promotionId: string, userIds: string[]): Promise<void> {
        // Clear existing targets
        await this.db
            .delete(promotionTargetUsers)
            .where(eq(promotionTargetUsers.promotionId, promotionId));
        
        // Add new targets if any
        if (userIds.length > 0) {
            await this.db.insert(promotionTargetUsers).values(
                userIds.map(userId => ({
                    promotionId,
                    userId,
                }))
            );
        }
    }

    async addTargetUsers(promotionId: string, userIds: string[]): Promise<void> {
        if (userIds.length === 0) return;
        
        await this.db.insert(promotionTargetUsers).values(
            userIds.map(userId => ({
                promotionId,
                userId,
            }))
        ).onConflictDoNothing();
    }

    async removeTargetUsers(promotionId: string, userIds: string[]): Promise<void> {
        if (userIds.length === 0) return;
        
        await this.db
            .delete(promotionTargetUsers)
            .where(
                and(
                    eq(promotionTargetUsers.promotionId, promotionId),
                    inArray(promotionTargetUsers.userId, userIds)
                )
            );
    }
}
