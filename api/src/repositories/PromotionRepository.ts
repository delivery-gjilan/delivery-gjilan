import { DbType } from '@/database';
import {
    promotions,
    userPromotions,
    promotionUsage,
    promotionBusinessEligibility,
    promotionAudienceGroups,
    promotionAudienceGroupMembers,
    userPromoMetadata,
    users,
    DbPromotion,
    NewDbPromotion,
} from '@/database/schema';
import { eq, and, or, isNull, lte, gte, ne, desc, inArray, ilike, sql } from 'drizzle-orm';

/** NOTE: The promotions table has an isDeleted column. All queries MUST filter by isDeleted=false.
 *  Deletions MUST set isDeleted=true instead of removing the row. See SOFT_DELETE_CONVENTION.md. */

export interface PromotionFilters {
    isActive?: boolean;
    type?: string;
    target?: string;
    code?: string;
    hasExpired?: boolean;
    limit?: number;
    offset?: number;
}

export interface PromotionAudienceGroupFilters {
    isActive?: boolean;
    search?: string;
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
            .where(and(eq(promotions.id, id), eq(promotions.isDeleted, false)))
            .limit(1);
        
        return promo || null;
    }

    async getByCode(code: string): Promise<DbPromotion | null> {
        const [promo] = await this.db
            .select()
            .from(promotions)
            .where(and(eq(promotions.code, code.toUpperCase()), eq(promotions.isDeleted, false)))
            .limit(1);
        
        return promo || null;
    }

    async list(filters: PromotionFilters = {}): Promise<DbPromotion[]> {
        let query: any = this.db.select().from(promotions);

        const conditions = [];

        // Always exclude soft-deleted
        conditions.push(eq(promotions.isDeleted, false));

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
        // Soft-delete: mark as deleted instead of removing
        const [result] = await this.db
            .update(promotions)
            .set({ isDeleted: true, isActive: false })
            .where(eq(promotions.id, id))
            .returning();
        
        return !!result;
    }

    async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
        const conditions: any[] = [
            eq(promotions.code, code.toUpperCase()),
            eq(promotions.isDeleted, false),
        ];
        if (excludeId) {
            conditions.push(ne(promotions.id, excludeId));
        }
        const [result] = await this.db
            .select()
            .from(promotions)
            .where(and(...conditions))
            .limit(1);
        return !!result;
    }

    async getUsageByPromotion(promotionId: string, limit = 500, offset = 0): Promise<any[]> {
        return await this.db
            .select()
            .from(promotionUsage)
            .where(eq(promotionUsage.promotionId, promotionId))
            .orderBy(desc(promotionUsage.createdAt))
            .limit(limit)
            .offset(offset);
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

    async getUserAssignmentsForPromotion(promotionId: string): Promise<any[]> {
        return this.db
            .select()
            .from(userPromotions)
            .where(eq(userPromotions.promotionId, promotionId));
    }

    async assignToUsers(promotionId: string, userIds: string[], expiresAt?: string | null): Promise<void> {
        if (userIds.length === 0) return;
        
        await this.db
            .insert(userPromotions)
            .values(
                userIds.map(userId => ({
                    userId,
                    promotionId,
                    ...(expiresAt ? { expiresAt } : {}),
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

    async createAudienceGroup(input: {
        name: string;
        description?: string | null;
        userIds: string[];
        createdBy?: string | null;
        isActive?: boolean;
    }): Promise<{ id: string; name: string; description: string | null; isActive: boolean; createdAt: string; updatedAt: string }> {
        const [group] = await this.db
            .insert(promotionAudienceGroups)
            .values({
                name: input.name,
                description: input.description ?? null,
                createdBy: input.createdBy ?? null,
                isActive: input.isActive ?? true,
            })
            .returning();

        if (!group) {
            throw new Error('Failed to create promotion audience group');
        }

        if (input.userIds.length > 0) {
            await this.db
                .insert(promotionAudienceGroupMembers)
                .values(
                    input.userIds.map((userId) => ({
                        groupId: group.id,
                        userId,
                    })),
                )
                .onConflictDoNothing();
        }

        return {
            id: group.id,
            name: group.name,
            description: group.description,
            isActive: group.isActive,
            createdAt: String(group.createdAt),
            updatedAt: String(group.updatedAt),
        };
    }

    async updateAudienceGroup(input: {
        id: string;
        name?: string;
        description?: string | null;
        userIds?: string[];
        isActive?: boolean;
    }): Promise<{ id: string; name: string; description: string | null; isActive: boolean; createdAt: string; updatedAt: string }> {
        const updates: Record<string, unknown> = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;
        if (input.isActive !== undefined) updates.isActive = input.isActive;

        let group;
        if (Object.keys(updates).length > 0) {
            const [updated] = await this.db
                .update(promotionAudienceGroups)
                .set(updates)
                .where(eq(promotionAudienceGroups.id, input.id))
                .returning();
            group = updated;
        } else {
            const [existing] = await this.db
                .select()
                .from(promotionAudienceGroups)
                .where(eq(promotionAudienceGroups.id, input.id))
                .limit(1);
            group = existing;
        }

        if (!group) {
            throw new Error('Promotion audience group not found');
        }

        if (input.userIds) {
            await this.db
                .delete(promotionAudienceGroupMembers)
                .where(eq(promotionAudienceGroupMembers.groupId, input.id));

            if (input.userIds.length > 0) {
                await this.db
                    .insert(promotionAudienceGroupMembers)
                    .values(
                        input.userIds.map((userId) => ({
                            groupId: input.id,
                            userId,
                        })),
                    )
                    .onConflictDoNothing();
            }
        }

        return {
            id: group.id,
            name: group.name,
            description: group.description,
            isActive: group.isActive,
            createdAt: String(group.createdAt),
            updatedAt: String(group.updatedAt),
        };
    }

    async deleteAudienceGroup(id: string): Promise<boolean> {
        const [deleted] = await this.db
            .delete(promotionAudienceGroups)
            .where(eq(promotionAudienceGroups.id, id))
            .returning();

        return !!deleted;
    }

    async listAudienceGroups(filters: PromotionAudienceGroupFilters = {}): Promise<Array<{
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
        memberCount: number;
        members: any[];
    }>> {
        const conditions = [];

        if (filters.isActive !== undefined) {
            conditions.push(eq(promotionAudienceGroups.isActive, filters.isActive));
        }

        if (filters.search?.trim()) {
            const term = `%${filters.search.trim()}%`;
            conditions.push(
                or(
                    ilike(promotionAudienceGroups.name, term),
                    ilike(promotionAudienceGroups.description, term),
                )!,
            );
        }

        const groups = await this.db
            .select()
            .from(promotionAudienceGroups)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(promotionAudienceGroups.name);

        const groupIds = groups.map((g) => g.id);
        if (groupIds.length === 0) return [];

        const memberRows = await this.db
            .select({
                groupId: promotionAudienceGroupMembers.groupId,
                user: users,
            })
            .from(promotionAudienceGroupMembers)
            .innerJoin(users, eq(users.id, promotionAudienceGroupMembers.userId))
            .where(inArray(promotionAudienceGroupMembers.groupId, groupIds));

        const membersByGroup = new Map<string, any[]>();
        for (const row of memberRows) {
            const existing = membersByGroup.get(row.groupId) ?? [];
            existing.push(row.user);
            membersByGroup.set(row.groupId, existing);
        }

        return groups.map((group) => {
            const members = membersByGroup.get(group.id) ?? [];
            return {
                id: group.id,
                name: group.name,
                description: group.description,
                isActive: group.isActive,
                createdAt: String(group.createdAt),
                updatedAt: String(group.updatedAt),
                memberCount: members.length,
                members,
            };
        });
    }

    async getAudienceGroupUserIds(groupIds: string[], onlyActiveGroups = true): Promise<string[]> {
        if (groupIds.length === 0) return [];

        const rows = await this.db
            .select({ userId: promotionAudienceGroupMembers.userId })
            .from(promotionAudienceGroupMembers)
            .innerJoin(
                promotionAudienceGroups,
                eq(promotionAudienceGroups.id, promotionAudienceGroupMembers.groupId),
            )
            .where(
                and(
                    inArray(promotionAudienceGroupMembers.groupId, groupIds),
                    onlyActiveGroups ? eq(promotionAudienceGroups.isActive, true) : sql`true`,
                ),
            );

        return Array.from(new Set(rows.map((r) => r.userId)));
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

