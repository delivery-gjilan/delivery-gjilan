import { DbType } from '@/database';
import { DbPromotion, NewDbPromotion, DbPromotionUsage, DbUserPromotion } from '@/database/schema';
import { PromotionRepository, PromotionFilters, PromotionAudienceGroupFilters } from '@/repositories/PromotionRepository';
import { SettlementRuleRepository } from '@/repositories/SettlementRuleRepository';
import logger from '@/lib/logger';
import { AppError } from '@/lib/errors';
import type { Promotion, PromotionTarget, PromotionType } from '@/generated/types.generated';

const log = logger.child({ service: 'PromotionService' });

export interface CreatePromotionInput {
    name: string;
    description?: string;
    code?: string;
    type: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'FREE_DELIVERY' | 'SPEND_X_PERCENT' | 'SPEND_X_FIXED' | 'SPEND_X_GET_FREE';
    target: 'ALL_USERS' | 'SPECIFIC_USERS' | 'FIRST_ORDER' | 'NEW_USERS' | 'CONDITIONAL';
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
    scheduleType?: 'ALWAYS' | 'DATE_RANGE' | 'RECURRING';
    scheduleTimezone?: string;
    dailyStartTime?: string;
    dailyEndTime?: string;
    activeWeekdays?: number[];
    newUserWindowDays?: number;

    creatorType: 'PLATFORM' | 'BUSINESS';
    creatorId?: string;

    targetUserIds?: string[];
    targetAudienceGroupIds?: string[];
    eligibleBusinessIds?: string[];

    /** Required for delivery-fee promotions (FREE_DELIVERY / SPEND_X_GET_FREE). Fixed euros per order. */
    driverPayoutAmount?: number;

    /** Recovery/compensation promotion — hidden from main promotions list */
    isRecovery?: boolean;
}

export interface UpdatePromotionInput {
    id: string;
    name?: string;
    description?: string | null;
    code?: string;
}

export class PromotionService {
    private repository: PromotionRepository;
    private settlementRuleRepository: SettlementRuleRepository;

    constructor(private db: DbType) {
        this.repository = new PromotionRepository(db);
        this.settlementRuleRepository = new SettlementRuleRepository(db);
    }

    /**
     * Helper to format DB promotion to GraphQL Promotion type.
     * Centralizing this here makes resolvers "dumb" as requested.
     */
    private mapDbPromotionToGraphQL(promo: DbPromotion): Promotion {
        const toISOString = (date: Date | string | null | undefined): string | null => {
            if (!date) return null;
            if (typeof date === 'string') return date;
            return new Date(date).toISOString();
        };

        return {
            id: promo.id,
            name: promo.name,
            description: promo.description,
            code: promo.code,
            type: promo.type as PromotionType,
            target: promo.target as PromotionTarget,
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
            activeWeekdays: Array.isArray(promo.activeWeekdays) ? (promo.activeWeekdays as number[]) : [],
            newUserWindowDays: promo.newUserWindowDays,
            createdAt: toISOString(promo.createdAt)!,
            totalUsageCount: promo.totalUsageCount,
            totalRevenue: promo.totalRevenue || 0,
            creatorType: promo.creatorType,
            creatorId: promo.creatorId,
            isRecovery: promo.isRecovery,
        };
    }

    async createPromotion(
        input: CreatePromotionInput,
        userData: { role?: string; userId?: string },
    ): Promise<Promotion> {
        // Permission check inside service
        if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
            throw AppError.forbidden();
        }
        // Validate code uniqueness if code is provided
        if (input.code) {
            const exists = await this.repository.checkCodeExists(input.code);
            if (exists) {
                throw AppError.conflict(`Promotion code '${input.code}' already exists`);
            }
        }

        // Validate basic rules
        if (
            input.type === 'PERCENTAGE' && 
            (!input.discountValue || input.discountValue <= 0 || input.discountValue > 100)
        ) {
            throw AppError.badInput('Percentage discount must be between 0 and 100');
        }

        if (input.target === 'NEW_USERS') {
            if (!input.newUserWindowDays || input.newUserWindowDays <= 0) {
                throw AppError.badInput('newUserWindowDays must be greater than 0 for NEW_USERS promotions');
            }
        }

        if (input.scheduleType === 'RECURRING') {
            if (!input.dailyStartTime || !input.dailyEndTime) {
                throw AppError.badInput('dailyStartTime and dailyEndTime are required for RECURRING promotions');
            }
        }

        if (input.type === 'FIXED_AMOUNT' && (!input.discountValue || input.discountValue <= 0)) {
            throw AppError.badInput('Fixed amount discount must be greater than 0');
        }

        // Validate business creator constraint
        if (input.creatorType === 'BUSINESS') {
            if (!input.creatorId) {
                throw AppError.badInput('creatorId is required when creatorType is BUSINESS.');
            }
            if (input.eligibleBusinessIds && input.eligibleBusinessIds.length > 0) {
                if (input.eligibleBusinessIds.length !== 1 || input.eligibleBusinessIds[0] !== input.creatorId) {
                    throw AppError.badInput(
                        'For business-created promotions, eligibleBusinessIds (if provided) must contain only the creatorId.',
                    );
                }
            }
        }

        const promo = await this.repository.create({
            code: input.code ? input.code.toUpperCase() : null,
            name: input.name,
            description: input.description || null,
            type: input.type,
            target: input.target,
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
            startsAt: input.startsAt
                ? typeof input.startsAt === 'string'
                    ? input.startsAt
                    : (input.startsAt as Date).toISOString()
                : null,
            endsAt: input.endsAt
                ? typeof input.endsAt === 'string'
                    ? input.endsAt
                    : (input.endsAt as Date).toISOString()
                : null,
            scheduleType: input.scheduleType ?? 'DATE_RANGE',
            scheduleTimezone: input.scheduleTimezone ?? null,
            dailyStartTime: input.dailyStartTime ?? null,
            dailyEndTime: input.dailyEndTime ?? null,
            activeWeekdays: input.activeWeekdays && input.activeWeekdays.length > 0 ? input.activeWeekdays : null,
            newUserWindowDays: input.newUserWindowDays ?? null,
            creatorType: input.creatorType,
            creatorId: input.creatorId ?? null,
            createdBy: null, // Will be set by GraphQL resolver
            isRecovery: input.isRecovery ?? false,
        } as NewDbPromotion);

        // Assign to specific users if provided
        const targetUserIds = new Set<string>(input.targetUserIds ?? []);
        if (input.targetAudienceGroupIds && input.targetAudienceGroupIds.length > 0) {
            const groupUsers = await this.repository.getAudienceGroupUserIds(input.targetAudienceGroupIds, true);
            groupUsers.forEach((id) => targetUserIds.add(id));
        }

        if (targetUserIds.size > 0) {
            await this.repository.assignToUsers(promo.id, Array.from(targetUserIds));
        }

        // Set business eligibility
        const eligibleBusinessIdsToSet =
            input.creatorType === 'BUSINESS'
                ? [input.creatorId!]
                : (input.eligibleBusinessIds ?? []);

        if (eligibleBusinessIdsToSet.length > 0) {
            await this.repository.setBusinessEligibility(promo.id, eligibleBusinessIdsToSet);
        }

        // Settlement rules are derived from creatorType + promotion kind (not user-configurable)
        await this.createSettlementRulesForPromotion(promo, input);

        return this.mapDbPromotionToGraphQL(promo);
    }

    private async createSettlementRulesForPromotion(promo: DbPromotion, input: CreatePromotionInput): Promise<void> {
        const isDeliveryFeePromotion = promo.type === 'FREE_DELIVERY' || promo.type === 'SPEND_X_GET_FREE';

        log.info(
            {
                promotionId: promo.id,
                type: promo.type,
                creatorType: input.creatorType,
                isDeliveryFeePromotion,
            },
            'promo:autoCreateRules:start',
        );

        if (isDeliveryFeePromotion) {
            if (input.driverPayoutAmount === undefined || input.driverPayoutAmount === null || input.driverPayoutAmount <= 0) {
                throw AppError.badInput('driverPayoutAmount is required and must be > 0 for delivery-fee promotions.');
            }

            const payout = input.driverPayoutAmount;

            if (input.creatorType === 'BUSINESS') {
                if (!input.creatorId) {
                    throw AppError.badInput('creatorId is required when creatorType is BUSINESS.');
                }

                // 1) Business owes Platform (to reimburse the driver payout)
                await this.settlementRuleRepository.createRule({
                    name: `${promo.name} - Business Reimbursement`,
                    type: 'DELIVERY_PRICE',
                    entityType: 'BUSINESS',
                    direction: 'RECEIVABLE',
                    amountType: 'FIXED',
                    amount: payout.toString(),
                    businessId: input.creatorId,
                    promotionId: promo.id,
                    isActive: true,
                    notes: `Auto-created for business-funded delivery promotion ${promo.id}`,
                });

                // 2) Platform owes Driver
                await this.settlementRuleRepository.createRule({
                    name: `${promo.name} - Driver Payout`,
                    type: 'DELIVERY_PRICE',
                    entityType: 'DRIVER',
                    direction: 'PAYABLE',
                    amountType: 'FIXED',
                    amount: payout.toString(),
                    businessId: input.creatorId,
                    promotionId: promo.id,
                    isActive: true,
                    notes: `Auto-created payout for business-funded delivery promotion ${promo.id}`,
                });

                return;
            }

            // PLATFORM-created delivery-fee promotion: Platform owes Driver
            await this.settlementRuleRepository.createRule({
                name: `${promo.name} - Driver Payout`,
                type: 'DELIVERY_PRICE',
                entityType: 'DRIVER',
                direction: 'PAYABLE',
                amountType: 'FIXED',
                amount: payout.toString(),
                promotionId: promo.id,
                isActive: true,
                notes: `Auto-created payout for platform-funded delivery promotion ${promo.id}`,
            });

            return;
        }

        // Order-price promotions
        if (input.driverPayoutAmount !== undefined && input.driverPayoutAmount !== null) {
            throw AppError.badInput('driverPayoutAmount is only allowed for delivery-fee promotions.');
        }

        // Business-funded order discount promotions do NOT create settlement rules.
        if (input.creatorType === 'BUSINESS') {
            return;
        }

        // Platform-funded order discount promotions: Platform owes Driver the promo amount.
        const amountType = promo.type === 'PERCENTAGE' || promo.type === 'SPEND_X_PERCENT' ? 'PERCENT' : 'FIXED';
        const amountValue = promo.discountValue || 0;

        if (amountValue > 0) {
            await this.settlementRuleRepository.createRule({
                name: `${promo.name} - Driver Subsidy`,
                type: 'ORDER_PRICE',
                entityType: 'DRIVER',
                direction: 'PAYABLE',
                amountType,
                amount: amountValue.toString(),
                maxAmount: amountType === 'PERCENT' && promo.maxDiscountCap
                    ? promo.maxDiscountCap.toString()
                    : null,
                promotionId: promo.id,
                isActive: true,
                notes: `Auto-created platform subsidy for promotion ${promo.id}`,
            });
        }
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
        // Editing supports name, description, and code
        const updates: Partial<DbPromotion> = {};

        if (input.name !== undefined) updates.name = input.name;

        if (input.description !== undefined) {
            const description = String(input.description ?? '').trim();
            updates.description = description.length > 0 ? description : null;
        }

        if (input.code !== undefined) {
            const normalized = input.code.trim() ? input.code.trim().toUpperCase() : null;
            if (normalized) {
                const exists = await this.repository.checkCodeExists(normalized, input.id);
                if (exists) {
                    throw AppError.conflict(`Promotion code '${normalized}' already exists`);
                }
            }
            updates.code = normalized;
        }

        return this.repository.update(input.id, updates);
    }

    async deletePromotion(id: string): Promise<boolean> {
        return this.repository.delete(id);
    }

    async assignPromotionToUsers(
        promotionId: string,
        userIds: string[],
        expiresAt?: string,
        audienceGroupIds?: string[],
    ): Promise<void> {
        const promo = await this.getPromotion(promotionId);
        if (promo.target !== 'SPECIFIC_USERS') {
            log.warn({ promotionId }, 'promo:assignUsers:wrongTarget');
        }

        const resolvedUserIds = new Set<string>(userIds);
        if (audienceGroupIds && audienceGroupIds.length > 0) {
            const groupUserIds = await this.repository.getAudienceGroupUserIds(audienceGroupIds, true);
            groupUserIds.forEach((id) => resolvedUserIds.add(id));
        }

        await this.repository.assignToUsers(promotionId, Array.from(resolvedUserIds), expiresAt ?? null);
    }

    async listPromotionAudienceGroups(filters?: PromotionAudienceGroupFilters) {
        return this.repository.listAudienceGroups(filters);
    }

    async createPromotionAudienceGroup(
        input: { name: string; description?: string | null; userIds: string[]; isActive?: boolean },
        userData: { role?: string; userId?: string },
    ): Promise<any> {
        if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
            throw AppError.forbidden();
        }

        return this.repository.createAudienceGroup({
            name: input.name.trim(),
            description: input.description?.trim() || null,
            userIds: input.userIds,
            createdBy: userData.userId,
            isActive: input.isActive ?? true,
        });
    }

    async updatePromotionAudienceGroup(
        input: { id: string; name?: string; description?: string | null; userIds?: string[]; isActive?: boolean },
        userData: { role?: string; userId?: string },
    ): Promise<any> {
        if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
            throw AppError.forbidden();
        }

        return this.repository.updateAudienceGroup({
            id: input.id,
            name: input.name?.trim(),
            description: input.description !== undefined ? input.description?.trim() || null : undefined,
            userIds: input.userIds,
            isActive: input.isActive,
        });
    }

    async deletePromotionAudienceGroup(id: string, userData: { role?: string; userId?: string }): Promise<boolean> {
        if (!userData.userId || userData.role !== 'SUPER_ADMIN') {
            throw AppError.forbidden();
        }

        return this.repository.deleteAudienceGroup(id);
    }

    /**
     * One-shot helper: create a recovery/compensation promotion and immediately assign it
     * to the specified users. The promotion is marked `isRecovery: true` so it will not
     * appear on the main promotions listing.
     */
    async issueRecoveryPromotion(
        input: {
            type: CreatePromotionInput['type'];
            discountValue?: number;
            userIds: string[];
            orderId?: string;
            reason: string;
            expiresAt?: string;
        },
        userData: { role?: string; userId?: string },
    ): Promise<DbUserPromotion[]> {
        const expiresAt = input.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const promo = await this.createPromotion(
            {
                name: `[Recovery] ${input.reason}`,
                description: input.reason,
                type: input.type,
                target: 'SPECIFIC_USERS',
                discountValue: input.discountValue,
                maxUsagePerUser: 1,
                maxGlobalUsage: input.userIds.length,
                isStackable: false,
                priority: 10,
                isActive: true,
                isRecovery: true,
                creatorType: 'PLATFORM',
                // driverPayoutAmount required for free delivery — default to a sensible value
                ...(input.type === 'FREE_DELIVERY' ? { driverPayoutAmount: input.discountValue ?? 2 } : {}),
            },
            userData,
        );

        // Store the orderId reference on this recovery promotion
        if (input.orderId) {
            await this.repository.update(String(promo.id), { orderId: input.orderId });
        }

        await this.repository.assignToUsers(String(promo.id), input.userIds, expiresAt);

        const assignments = await this.repository.getUserAssignmentsForPromotion(String(promo.id));
        return assignments;
    }

    async setBusinessRestriction(promotionId: string, businessIds: string[]): Promise<void> {
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
        if (promo.minOrderAmount && orderSubtotal < Number(promo.minOrderAmount)) {
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
            const promoUsage = assignments.find((a) => a.promotionId === promo.id);
            if (promoUsage && promoUsage.usageCount >= promo.maxUsagePerUser) {
                return { valid: false, reason: 'You have already used this promotion' };
            }
        }

        // Check target eligibility
        if (promo.target === 'SPECIFIC_USERS') {
            const assignments = await this.repository.getUserAssignments(userId);
            const hasAssignment = assignments.some((a) => a.promotionId === promo.id && a.isActive);
            if (!hasAssignment) {
                return { valid: false, reason: 'Promotion is not available for you' };
            }
        }

        return { valid: true, promotion: promo };
    }

    async getPromotionUsage(promotionId: string, limit = 500, offset = 0): Promise<DbPromotionUsage[]> {
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
            });
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
