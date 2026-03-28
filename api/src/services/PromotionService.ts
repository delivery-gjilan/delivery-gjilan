import { DbType } from '@/database';
import { DbPromotion, NewDbPromotion } from '@/database/schema';
import { PromotionRepository, PromotionFilters } from '@/repositories/PromotionRepository';
import logger from '@/lib/logger';
import { AppError } from '@/lib/errors';

const log = logger.child({ service: 'PromotionService' });

export interface CreatePromotionInput {
    name: string;
    description?: string;
    code?: string;
    type: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'FREE_DELIVERY' | 'SPEND_X_GET_FREE' | 'SPEND_X_PERCENT' | 'SPEND_X_FIXED';
    target: 'ALL_USERS' | 'SPECIFIC_USERS' | 'FIRST_ORDER' | 'CONDITIONAL';
    discountValue?: number;
    maxDiscountCap?: number;
    minOrderAmount?: number;
    spendThreshold?: number;
    thresholdReward?: string;
    maxGlobalUsage?: number;
    maxUsagePerUser?: number;
    isStackable?: boolean;
    priority?: number;
    isActive?: boolean;
    startsAt?: Date | string;
    endsAt?: Date | string;
    creatorType?: 'PLATFORM' | 'BUSINESS';
    creatorId?: string;
    targetUserIds?: string[];
    eligibleBusinessIds?: string[];
}

export interface UpdatePromotionInput extends Partial<CreatePromotionInput> {
    id: string;
}

export class PromotionService {
    private repository: PromotionRepository;

    constructor(private db: DbType) {
        this.repository = new PromotionRepository(db);
    }

    async createPromotion(input: CreatePromotionInput): Promise<DbPromotion> {
        // Validate code uniqueness if code is provided
        if (input.code) {
            const exists = await this.repository.checkCodeExists(input.code);
            if (exists) {
                throw AppError.conflict(`Promotion code '${input.code}' already exists`);
            }
        }

        // Validate basic rules
        if (input.type === 'PERCENTAGE' && (!input.discountValue || input.discountValue <= 0 || input.discountValue > 100)) {
            throw AppError.badInput('Percentage discount must be between 0 and 100');
        }

        if (input.type === 'FIXED_AMOUNT' && (!input.discountValue || input.discountValue <= 0)) {
            throw AppError.badInput('Fixed amount discount must be greater than 0');
        }

        // Create promotion
        const promo = await this.repository.create({
            code: input.code ? input.code.toUpperCase() : null,
            name: input.name,
            description: input.description || null,
            type: input.type as any,
            target: input.target as any,
            discountValue: input.discountValue || null,
            maxDiscountCap: input.maxDiscountCap || null,
            minOrderAmount: input.minOrderAmount || null,
            spendThreshold: input.spendThreshold || null,
            thresholdReward: input.thresholdReward ? JSON.parse(input.thresholdReward) : null,
            maxGlobalUsage: input.maxGlobalUsage || null,
            maxUsagePerUser: input.maxUsagePerUser || null,
            isStackable: input.isStackable ?? false,
            priority: input.priority ?? 0,
            isActive: input.isActive ?? true,
            startsAt: input.startsAt ? (typeof input.startsAt === 'string' ? input.startsAt : input.startsAt.toISOString()) : null,
            endsAt: input.endsAt ? (typeof input.endsAt === 'string' ? input.endsAt : input.endsAt.toISOString()) : null,
            createdBy: null, // Will be set by GraphQL resolver
        } as NewDbPromotion);

        // Assign to specific users if provided
        if (input.targetUserIds && input.targetUserIds.length > 0) {
            await this.repository.assignToUsers(promo.id, input.targetUserIds);
        }

        // Set business eligibility if provided
        if (input.eligibleBusinessIds && input.eligibleBusinessIds.length > 0) {
            await this.repository.setBusinessEligibility(promo.id, input.eligibleBusinessIds);
        }

        return promo;
    }

    async getPromotion(id: string): Promise<DbPromotion> {
        const promo = await this.repository.getById(id);
        if (!promo) {
            throw AppError.notFound('Promotion');
        }
        return promo;
    }

    async listPromotions(filters?: PromotionFilters): Promise<DbPromotion[]> {
        return this.repository.list(filters);
    }

    async updatePromotion(input: UpdatePromotionInput): Promise<DbPromotion> {
        const { id, ...updates } = input;

        // If updating code, check uniqueness
        if (updates.code) {
            const exists = await this.repository.checkCodeExists(updates.code, id);
            if (exists) {
                throw AppError.conflict(`Promotion code '${updates.code}' already exists`);
            }
            updates.code = updates.code.toUpperCase();
        }

        // Validate percentage discount
        if (updates.type === 'PERCENTAGE' && updates.discountValue) {
            if (updates.discountValue <= 0 || updates.discountValue > 100) {
                throw AppError.badInput('Percentage discount must be between 0 and 100');
            }
        }

        // Convert dates if necessary
        const updateObj: any = {};
        for (const [key, value] of Object.entries(updates)) {
            if (key === 'startsAt' || key === 'endsAt') {
                updateObj[key] = value ? (typeof value === 'string' ? value : value.toISOString()) : null;
            } else {
                updateObj[key] = value;
            }
        }

        return this.repository.update(id, updateObj);
    }

    async deletePromotion(id: string): Promise<boolean> {
        return this.repository.delete(id);
    }

    async assignPromotionToUsers(promotionId: string, userIds: string[]): Promise<void> {
        const promo = await this.getPromotion(promotionId);
        if (promo.target !== 'SPECIFIC_USERS') {
            log.warn({ promotionId }, 'promo:assignUsers:wrongTarget');
        }
        await this.repository.assignToUsers(promotionId, userIds);
    }

    async setBusinessRestriction(promotionId: string, businessIds: string[]): Promise<void> {
        const promo = await this.getPromotion(promotionId);
        await this.repository.setBusinessEligibility(promotionId, businessIds);
    }

    async getPromotionByCode(code: string): Promise<DbPromotion | null> {
        return this.repository.getByCode(code);
    }

    async validatePromotion(
        promotionCode: string,
        userId: string,
        orderSubtotal: number
    ): Promise<{ valid: boolean; reason?: string; promotion?: DbPromotion }> {
        // Find promotion by code
        const promo = await this.repository.getByCode(promotionCode);
        if (!promo) {
            return { valid: false, reason: 'Promotion code not found' };
        }

        // Check active status
        if (!promo.isActive) {
            return { valid: false, reason: 'Promotion is no longer active' };
        }

        // Check expiration
        const now = new Date();
        if (promo.startsAt && new Date(promo.startsAt) > now) {
            return { valid: false, reason: 'Promotion has not started yet' };
        }
        if (promo.endsAt && new Date(promo.endsAt) < now) {
            return { valid: false, reason: 'Promotion has expired' };
        }

        // Check minimum order amount
        if (promo.minOrderAmount && orderSubtotal < parseFloat(promo.minOrderAmount as any)) {
            return { 
                valid: false, 
                reason: `Minimum order amount of ${promo.minOrderAmount} required` 
            };
        }

        // Check global usage limit
        if (promo.maxGlobalUsage && promo.currentGlobalUsage >= promo.maxGlobalUsage) {
            return { valid: false, reason: 'Promotion has reached its usage limit' };
        }

        // Check per-user usage limit
        if (promo.maxUsagePerUser) {
            const assignments = await this.repository.getUserAssignments(userId, false);
            const promoUsage = assignments.find(a => a.promotionId === promo.id);
            if (promoUsage && promoUsage.usageCount >= promo.maxUsagePerUser) {
                return { valid: false, reason: 'You have already used this promotion' };
            }
        }

        // Check target eligibility
        if (promo.target === 'SPECIFIC_USERS') {
            const assignments = await this.repository.getUserAssignments(userId);
            const hasAssignment = assignments.some(a => a.promotionId === promo.id && a.isActive);
            if (!hasAssignment) {
                return { valid: false, reason: 'Promotion is not available for you' };
            }
        }

        return { valid: true, promotion: promo };
    }

    async getPromotionUsage(promotionId: string, limit = 500, offset = 0): Promise<any[]> {
        return this.repository.getUsageByPromotion(promotionId, limit, offset);
    }

    async recordPromotionUsage(
        promotionId: string,
        userId: string,
        orderId: string,
        discountAmount: number,
        freeDeliveryApplied: boolean,
        orderSubtotal: number,
        businessId?: string
    ): Promise<void> {
        // Record usage
        await this.repository.recordUsage(
            promotionId,
            userId,
            orderId,
            discountAmount,
            freeDeliveryApplied,
            orderSubtotal,
            businessId
        );

        // Update promotion counters
        const promo = await this.repository.getById(promotionId);
        if (promo) {
            await this.repository.update(promotionId, {
                currentGlobalUsage: promo.currentGlobalUsage + 1,
                totalUsageCount: promo.totalUsageCount + 1,
                totalRevenue: (promo.totalRevenue || 0) + discountAmount,
            } as any);
        }

        // Update user metadata
        const metadata = await this.repository.getMetadata(userId);
        const newTotalSavings = (metadata?.totalSavings || 0) + discountAmount;
        const newTotalUsed = (metadata?.totalPromotionsUsed || 0) + 1;

        await this.repository.upsertMetadata(userId, {
            totalSavings: newTotalSavings,
            totalPromotionsUsed: newTotalUsed,
        });
    }

    async markFirstOrderUsed(userId: string): Promise<void> {
        await this.repository.upsertMetadata(userId, {
            hasUsedFirstOrderPromo: true,
            firstOrderPromoUsedAt: new Date().toISOString(),
        });
    }

    async getUserPromoMetadata(userId: string): Promise<any> {
        return this.repository.getMetadata(userId);
    }
}
