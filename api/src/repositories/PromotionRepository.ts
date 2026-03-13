import { DbType } from '@/database';
import {
    promotions,
    userPromotions,
    promotionUsage,
    promotionBusinessEligibility,
    userPromoMetadata,
    DbPromotion,
    NewDbPromotion,
} from '@/database/schema';
import { eq, and, or, isNull, lte, gte, ne } from 'drizzle-orm';

export interface PromotionFilters {
    isActive?: boolean;
    type?: string;
    target?: string;
    code?: string;
    hasExpired?: boolean;
    limit?: number;
    offset?: number;
}

export class PromotionRepository {
    constructor(private db: DbType) {}

    async create(input: NewDbPromotion): Promise<DbPromotion> {
        const [promo] = await this.db
            .insert(promotions)
            .values(input)
            .returning();
        
        if (!promo) {
            throw new Error('Failed to create promotion');
        }
        
        return promo;
    }

    async getById(id: string): Promise<DbPromotion | null> {
        const [promo] = await this.db
            .select()
            .from(promotions)
            .where(eq(promotions.id, id))
            .limit(1);
        
        return promo || null;
    }

    async getByCode(code: string): Promise<DbPromotion | null> {
        const [promo] = await this.db
            .select()
            .from(promotions)
            .where(eq(promotions.code, code.toUpperCase()))
            .limit(1);
        
        return promo || null;
    }

    async list(filters: PromotionFilters = {}): Promise<DbPromotion[]> {
        let query: any = this.db.select().from(promotions);

        const conditions = [];

        if (filters.isActive !== undefined) {
            conditions.push(eq(promotions.isActive, filters.isActive));
        }

        if (filters.type) {
            conditions.push(eq(promotions.type, filters.type as any));
        }

        if (filters.target) {
            conditions.push(eq(promotions.target, filters.target as any));
        }

        if (filters.code) {
            conditions.push(eq(promotions.code, filters.code.toUpperCase()));
        }

        if (filters.hasExpired !== undefined) {
            const now = new Date().toISOString();
            if (filters.hasExpired) {
                conditions.push(lte(promotions.endsAt, now));
            } else {
                conditions.push(
                    or(
                        isNull(promotions.endsAt),
                        gte(promotions.endsAt, now)
                    )
                );
            }
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions)) as any;
        }

        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        if (filters.offset) {
            query = query.offset(filters.offset);
        }

        return await query;
    }

    async update(id: string, updates: Partial<DbPromotion>): Promise<DbPromotion> {
        const [promo] = await this.db
            .update(promotions)
            .set(updates)
            .where(eq(promotions.id, id))
            .returning();
        
        if (!promo) {
            throw new Error('Promotion not found');
        }
        
        return promo;
    }

    async delete(id: string): Promise<boolean> {
        // Delete related records first
        await this.db
            .delete(userPromotions)
            .where(eq(userPromotions.promotionId, id));
        
        await this.db
            .delete(promotionBusinessEligibility)
            .where(eq(promotionBusinessEligibility.promotionId, id));
        
        // Delete the promotion
        const result = await this.db
            .delete(promotions)
            .where(eq(promotions.id, id));
        
        return !!result;
    }

    async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
        let query: any = this.db
            .select()
            .from(promotions)
            .where(eq(promotions.code, code.toUpperCase()));
        
        if (excludeId) {
            query = query.where(ne(promotions.id, excludeId)) as any;
        }
        
        const [result] = await query.limit(1);
        return !!result;
    }

    async recordUsage(
        promotionId: string,
        userId: string,
        orderId: string,
        discountAmount: number,
        freeDeliveryApplied: boolean,
        orderSubtotal: number,
        businessId?: string
    ): Promise<void> {
        await this.db
            .insert(promotionUsage)
            .values({
                promotionId,
                userId,
                orderId,
                discountAmount,
                freeDeliveryApplied,
                orderSubtotal,
                businessId: businessId || null,
            });
    }

    async getUserAssignments(userId: string, onlyActive = true): Promise<any[]> {
        let query: any = this.db
            .select()
            .from(userPromotions)
            .where(eq(userPromotions.userId, userId));
        
        if (onlyActive) {
            query = query.where(eq(userPromotions.isActive, true)) as any;
        }
        
        return await query;
    }

    async assignToUsers(promotionId: string, userIds: string[]): Promise<void> {
        if (userIds.length === 0) return;
        
        await this.db
            .insert(userPromotions)
            .values(
                userIds.map(userId => ({
                    userId,
                    promotionId,
                }))
            );
    }

    async setBusinessEligibility(promotionId: string, businessIds: string[]): Promise<void> {
        // Delete existing eligibility
        await this.db
            .delete(promotionBusinessEligibility)
            .where(eq(promotionBusinessEligibility.promotionId, promotionId));
        
        // Insert new eligibility
        if (businessIds.length > 0) {
            await this.db
                .insert(promotionBusinessEligibility)
                .values(
                    businessIds.map(businessId => ({
                        promotionId,
                        businessId,
                    }))
                );
        }
    }

    async getBusinessEligibility(promotionId: string): Promise<string[]> {
        const results = await this.db
            .select({ businessId: promotionBusinessEligibility.businessId })
            .from(promotionBusinessEligibility)
            .where(eq(promotionBusinessEligibility.promotionId, promotionId));
        
        return results.map(r => r.businessId);
    }

    async getMetadata(userId: string): Promise<any> {
        const [metadata] = await this.db
            .select()
            .from(userPromoMetadata)
            .where(eq(userPromoMetadata.userId, userId))
            .limit(1);
        
        return metadata || null;
    }

    async upsertMetadata(userId: string, updates: Partial<any>): Promise<void> {
        const existing = await this.getMetadata(userId);
        
        if (existing) {
            await this.db
                .update(userPromoMetadata)
                .set(updates)
                .where(eq(userPromoMetadata.userId, userId));
        } else {
            await this.db
                .insert(userPromoMetadata)
                .values({
                    userId,
                    ...updates,
                });
        }
    }
}

