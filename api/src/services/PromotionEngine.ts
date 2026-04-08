import { DbType } from '@/database';
import { 
    promotions, 
    userPromotions, 
    promotionUsage, 
    userPromoMetadata,
    promotionBusinessEligibility
} from '@/database/schema/promotions';
import { orders } from '@/database/schema';
import { eq, and, or, sql, gte, lte, isNull, inArray } from 'drizzle-orm';
import logger from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { normalizeMoney } from '@/lib/utils/money';

const log = logger.child({ service: 'PromotionEngine' });

export type CartItem = {
    productId: string;
    businessId: string;
    quantity: number;
    price: number;
};

export type CartContext = {
    items: CartItem[];
    subtotal: number;
    deliveryPrice: number;
    businessIds: string[];
};

export type ApplicablePromotion = {
    id: string;
    code: string | null;
    name: string;
    type: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'FREE_DELIVERY' | 'SPEND_X_PERCENT' | 'SPEND_X_FIXED';
    target: 'ALL_USERS' | 'SPECIFIC_USERS' | 'FIRST_ORDER' | 'CONDITIONAL';
    discountValue?: number | null;
    maxDiscountCap?: number | null;
    freeDelivery: boolean;
    priority: number;
    isStackable: boolean;
    appliedAmount: number; // Calculated discount
};

export type PromotionResult = {
    promotions: ApplicablePromotion[];
    totalDiscount: number;
    freeDeliveryApplied: boolean;
    finalSubtotal: number;
    finalDeliveryPrice: number;
    finalTotal: number;
};

export type PromotionUsageBreakdown = {
    promotionId: string;
    discountAmount: number;
    freeDeliveryApplied: boolean;
};

export class PromotionEngine {
    constructor(private db: DbType) {}

    /**
     * MAIN METHOD: Find all applicable promotions for a user's cart
     */
    async getApplicablePromotions(
        userId: string,
        cart: CartContext,
        manualPromoCode?: string
    ): Promise<ApplicablePromotion[]> {
        const now = new Date().toISOString();
        const applicable: ApplicablePromotion[] = [];

        // 1. Check First Order Eligibility
        const [metadata] = await this.db
            .select()
            .from(userPromoMetadata)
            .where(eq(userPromoMetadata.userId, userId))
            .limit(1);

        const isFirstOrder = !metadata?.hasUsedFirstOrderPromo;

        // 2. Find all potentially valid promotions
        const allPromos = await this.db
            .select()
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
                        isNull(promotions.minOrderAmount),
                        lte(promotions.minOrderAmount, cart.subtotal)
                    )
                )
            );

        log.debug({ count: allPromos.length, manualPromoCode, cartSubtotal: cart.subtotal }, 'promo:found');

        // 3. Batch-prefetch all per-promo lookup data before the loop
        const allPromoIds = allPromos.map((p) => p.id);
        const promoIdsWithPerUserLimit = allPromos.filter((p) => p.maxUsagePerUser).map((p) => p.id);

        const [usageRows, userAssignmentRows, businessEligibilityRows] = await Promise.all([
            // Per-user usage counts for promos that have a per-user limit
            promoIdsWithPerUserLimit.length > 0
                ? this.db
                      .select({ promotionId: promotionUsage.promotionId, count: sql<number>`count(*)` })
                      .from(promotionUsage)
                      .where(and(inArray(promotionUsage.promotionId, promoIdsWithPerUserLimit), eq(promotionUsage.userId, userId)))
                      .groupBy(promotionUsage.promotionId)
                : Promise.resolve([]),
            // SPECIFIC_USERS assignments for this user
            allPromoIds.length > 0
                ? this.db
                      .select({ promotionId: userPromotions.promotionId })
                      .from(userPromotions)
                      .where(
                          and(
                              inArray(userPromotions.promotionId, allPromoIds),
                              eq(userPromotions.userId, userId),
                              eq(userPromotions.isActive, true),
                              or(isNull(userPromotions.expiresAt), gte(userPromotions.expiresAt, now))
                          )
                      )
                : Promise.resolve([]),
            // Business eligibility rows for all promos
            allPromoIds.length > 0
                ? this.db
                      .select({ promotionId: promotionBusinessEligibility.promotionId, businessId: promotionBusinessEligibility.businessId })
                      .from(promotionBusinessEligibility)
                      .where(inArray(promotionBusinessEligibility.promotionId, allPromoIds))
                : Promise.resolve([]),
        ]);

        // Build lookup maps
        const usageCountByPromoId = new Map<string, number>(usageRows.map((r) => [r.promotionId, Number(r.count)]));
        const assignedPromoIds = new Set<string>(userAssignmentRows.map((r) => r.promotionId));
        const eligibleBusinessIdsByPromoId = new Map<string, Set<string>>();
        for (const row of businessEligibilityRows) {
            if (!eligibleBusinessIdsByPromoId.has(row.promotionId)) {
                eligibleBusinessIdsByPromoId.set(row.promotionId, new Set());
            }
            eligibleBusinessIdsByPromoId.get(row.promotionId)!.add(row.businessId);
        }

        // 4. Filter by target type and eligibility — zero DB calls inside this loop
        for (const promo of allPromos) {
            log.debug({ id: promo.id, name: promo.name, code: promo.code, target: promo.target, spendThreshold: promo.spendThreshold }, 'promo:checking');
            
            // If user entered a manual code, only consider that one
            if (manualPromoCode && promo.code !== manualPromoCode.trim().toUpperCase()) {
                log.debug({ promoCode: promo.code }, 'promo:skip:codeMismatch');
                continue;
            }

            // Per-user usage check (shared by checkCodeEligibility and checkUsageLimits)
            const userUsageCount = usageCountByPromoId.get(promo.id) ?? 0;
            const withinPerUserLimit = !promo.maxUsagePerUser || userUsageCount < promo.maxUsagePerUser;

            // Check target eligibility
            let isEligible = false;

            switch (promo.target) {
                case 'ALL_USERS':
                    isEligible = withinPerUserLimit;
                    log.debug({ isEligible }, 'promo:allUsers:codeEligibility');
                    if (isEligible && promo.spendThreshold) {
                        isEligible = cart.subtotal >= Number(promo.spendThreshold);
                        log.debug({ isEligible, spendThreshold: promo.spendThreshold, cartSubtotal: cart.subtotal }, 'promo:allUsers:thresholdCheck');
                    }
                    break;

                case 'FIRST_ORDER':
                    isEligible = isFirstOrder && withinPerUserLimit;
                    log.debug({ isEligible, isFirstOrder }, 'promo:firstOrder');
                    break;

                case 'SPECIFIC_USERS':
                    isEligible = assignedPromoIds.has(promo.id);
                    log.debug({ isEligible }, 'promo:specificUsers');
                    break;

                case 'CONDITIONAL':
                    isEligible = !promo.spendThreshold || cart.subtotal >= Number(promo.spendThreshold);
                    log.debug({ isEligible, spendThreshold: promo.spendThreshold, cartSubtotal: cart.subtotal }, 'promo:conditional');
                    break;
            }

            if (!isEligible) {
                log.debug({ promoId: promo.id }, 'promo:skip:notEligible');
                continue;
            }

            // Check business eligibility (in-memory using prefetched data)
            const restrictedBusinessIds = eligibleBusinessIdsByPromoId.get(promo.id);
            const businessEligible =
                !restrictedBusinessIds || // no restrictions = eligible everywhere
                cart.businessIds.some((id) => restrictedBusinessIds.has(id));
            log.debug({ businessEligible, cartBusinessIds: cart.businessIds }, 'promo:businessEligibility');
            if (!businessEligible) continue;

            // Check usage limits (global check; per-user already checked above)
            const usageLimitOk =
                (!promo.maxGlobalUsage || promo.currentGlobalUsage < promo.maxGlobalUsage) &&
                withinPerUserLimit;
            log.debug({ usageLimitOk }, 'promo:usageLimits');
            if (!usageLimitOk) continue;

            // Calculate discount amount
            const appliedAmount = normalizeMoney(this.calculateDiscount(promo, cart.subtotal));
            const freeDelivery = this.checkFreeDelivery(promo);

            applicable.push({
                id: promo.id,
                code: promo.code,
                name: promo.name,
                type: promo.type as any,
                target: promo.target as any,
                discountValue: promo.discountValue ? Number(promo.discountValue) : null,
                maxDiscountCap: promo.maxDiscountCap ? Number(promo.maxDiscountCap) : null,
                freeDelivery,
                priority: promo.priority,
                isStackable: promo.isStackable,
                appliedAmount,
            });
        }

        // Sort by priority (highest first)
        return applicable.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Apply best promotion combination based on stacking rules
     */
    async applyPromotions(
        userId: string,
        cart: CartContext,
        manualPromoCode?: string
    ): Promise<PromotionResult> {
        log.info({ userId, cartSubtotal: cart.subtotal, manualPromoCode }, 'promo:applyPromotions');
        const applicable = await this.getApplicablePromotions(userId, cart, manualPromoCode);
        log.info({ count: applicable.length, promotions: applicable.map(p => ({ id: p.id, name: p.name })) }, 'promo:applicable');

        if (applicable.length === 0) {
            const finalSubtotal = normalizeMoney(cart.subtotal);
            const finalDeliveryPrice = normalizeMoney(cart.deliveryPrice);
            return {
                promotions: [],
                totalDiscount: 0,
                freeDeliveryApplied: false,
                finalSubtotal,
                finalDeliveryPrice,
                finalTotal: normalizeMoney(finalSubtotal + finalDeliveryPrice),
            };
        }

        // Apply stacking logic
        const applied: ApplicablePromotion[] = [];
        let totalDiscount = 0;
        let freeDeliveryApplied = false;

        // First promo is always applied (highest priority)
        const firstPromo = applicable[0];
        applied.push(firstPromo);
        totalDiscount += firstPromo.appliedAmount;
        if (firstPromo.freeDelivery) freeDeliveryApplied = true;

        // If first promo is stackable, try adding more
        if (firstPromo.isStackable) {
            for (let i = 1; i < applicable.length; i++) {
                const promo = applicable[i];
                if (promo.isStackable) {
                    applied.push(promo);
                    totalDiscount += promo.appliedAmount;
                    if (promo.freeDelivery) freeDeliveryApplied = true;
                }
            }
        }

        const finalSubtotal = normalizeMoney(Math.max(0, cart.subtotal - totalDiscount));
        const finalDeliveryPrice = freeDeliveryApplied ? 0 : normalizeMoney(cart.deliveryPrice);
        const finalTotal = normalizeMoney(finalSubtotal + finalDeliveryPrice);

        return {
            promotions: applied,
            totalDiscount: normalizeMoney(totalDiscount),
            freeDeliveryApplied,
            finalSubtotal,
            finalDeliveryPrice,
            finalTotal,
        };
    }

    /**
     * Apply a SINGLE promotion by ID (used by createOrder when client sends promotionId).
     * Validates eligibility for the given user + cart, then returns the result.
     * If the promotion is not valid/eligible, throws an AppError.
     */
    async applySinglePromotion(
        userId: string,
        promotionId: string,
        cart: CartContext,
    ): Promise<PromotionResult> {
        const now = new Date().toISOString();

        // 1. Fetch the promotion
        const [promo] = await this.db
            .select()
            .from(promotions)
            .where(and(eq(promotions.id, promotionId), eq(promotions.isDeleted, false)))
            .limit(1);

        if (!promo) {
            throw AppError.notFound('Promotion');
        }

        // 2. Basic validity checks
        if (!promo.isActive) {
            throw AppError.businessRule('Promotion is no longer active');
        }
        if (promo.startsAt && promo.startsAt > now) {
            throw AppError.businessRule('Promotion has not started yet');
        }
        if (promo.endsAt && promo.endsAt < now) {
            throw AppError.businessRule('Promotion has expired');
        }
        if (promo.minOrderAmount && cart.subtotal < Number(promo.minOrderAmount)) {
            throw AppError.businessRule(
                `Minimum order amount of ${promo.minOrderAmount} required`,
            );
        }

        // 3. Check spend threshold for conditional types
        if (promo.spendThreshold && cart.subtotal < Number(promo.spendThreshold)) {
            throw AppError.businessRule(
                `Spend threshold of ${promo.spendThreshold} not met`,
            );
        }

        // 4. Check target eligibility
        const [metadata] = await this.db
            .select()
            .from(userPromoMetadata)
            .where(eq(userPromoMetadata.userId, userId))
            .limit(1);

        switch (promo.target) {
            case 'FIRST_ORDER': {
                if (metadata?.hasUsedFirstOrderPromo) {
                    throw AppError.businessRule('First order promotion already used');
                }
                break;
            }
            case 'SPECIFIC_USERS': {
                const assigned = await this.checkUserAssignment(promo.id, userId);
                if (!assigned) {
                    throw AppError.businessRule('Promotion is not available for you');
                }
                break;
            }
            case 'ALL_USERS':
            case 'CONDITIONAL':
                break;
        }

        // 5. Check business eligibility
        const businessEligible = await this.checkBusinessEligibility(promo.id, cart.businessIds);
        if (!businessEligible) {
            throw AppError.businessRule('Promotion is not valid for this business');
        }

        // 6. Check usage limits
        const usageLimitOk = await this.checkUsageLimits(promo, userId);
        if (!usageLimitOk) {
            throw AppError.businessRule('Promotion usage limit reached');
        }
        const codeEligible = await this.checkCodeEligibility(promo, userId);
        if (!codeEligible) {
            throw AppError.businessRule('You have already used this promotion the maximum number of times');
        }

        // 7. Calculate discount
        const appliedAmount = normalizeMoney(this.calculateDiscount(promo, cart.subtotal));
        const freeDelivery = this.checkFreeDelivery(promo);

        const appliedPromo: ApplicablePromotion = {
            id: promo.id,
            code: promo.code,
            name: promo.name,
            type: promo.type as ApplicablePromotion['type'],
            target: promo.target as ApplicablePromotion['target'],
            discountValue: promo.discountValue ? Number(promo.discountValue) : null,
            maxDiscountCap: promo.maxDiscountCap ? Number(promo.maxDiscountCap) : null,
            freeDelivery,
            priority: promo.priority,
            isStackable: promo.isStackable,
            appliedAmount,
        };

        const finalSubtotal = normalizeMoney(Math.max(0, cart.subtotal - appliedAmount));
        const finalDeliveryPrice = freeDelivery ? 0 : normalizeMoney(cart.deliveryPrice);
        const finalTotal = normalizeMoney(finalSubtotal + finalDeliveryPrice);

        return {
            promotions: [appliedPromo],
            totalDiscount: normalizeMoney(appliedAmount),
            freeDeliveryApplied: freeDelivery,
            finalSubtotal,
            finalDeliveryPrice,
            finalTotal,
        };
    }

    /**
     * Record promotion usage after order is created
     */
    async recordUsage(
        promotionIds: string[],
        userId: string,
        orderId: string,
        discountAmount: number,
        freeDeliveryApplied: boolean,
        orderSubtotal: number,
        businessId: string | null,
        usageBreakdown?: PromotionUsageBreakdown[]
    ): Promise<void> {
        await this.db.transaction(async (tx) => {
            const usageByPromotionId = new Map((usageBreakdown ?? []).map((entry) => [entry.promotionId, entry]));
            let totalSavingsApplied = 0;

            for (const promoId of promotionIds) {
                // Lock the promotion row to prevent concurrent usage beyond limits
                const [promo] = await tx
                    .select()
                    .from(promotions)
                    .where(eq(promotions.id, promoId))
                    .for('update');

                if (!promo) continue;

                // Re-check usage limits inside the transaction
                if (promo.maxGlobalUsage && promo.currentGlobalUsage >= promo.maxGlobalUsage) {
                    throw AppError.businessRule(`Promotion "${promo.name}" has reached its global usage limit`);
                }

                if (promo.maxUsagePerUser) {
                    const [usage] = await tx
                        .select({ count: sql<number>`count(*)` })
                        .from(promotionUsage)
                        .where(
                            and(
                                eq(promotionUsage.promotionId, promoId),
                                eq(promotionUsage.userId, userId)
                            )
                        );
                    if (Number(usage?.count || 0) >= promo.maxUsagePerUser) {
                        throw AppError.businessRule(`You have already used promotion "${promo.name}" the maximum number of times`);
                    }
                }

                const promoUsage = usageByPromotionId.get(promoId);
                const promoDiscount = Number(promoUsage?.discountAmount ?? discountAmount);
                const promoFreeDeliveryApplied = Boolean(promoUsage?.freeDeliveryApplied ?? freeDeliveryApplied);
                totalSavingsApplied += promoDiscount;

                await tx.insert(promotionUsage).values({
                    promotionId: promoId,
                    userId,
                    orderId,
                    discountAmount: String(promoDiscount),
                    freeDeliveryApplied: promoFreeDeliveryApplied,
                    orderSubtotal: String(orderSubtotal),
                    businessId,
                });

                // Increment usage counters
                await tx
                    .update(promotions)
                    .set({
                        currentGlobalUsage: sql`${promotions.currentGlobalUsage} + 1`,
                        totalUsageCount: sql`${promotions.totalUsageCount} + 1`,
                        totalRevenue: sql`${promotions.totalRevenue} + ${orderSubtotal}`,
                    })
                    .where(eq(promotions.id, promoId));

                // Update user-specific assignment if exists
                await tx
                    .update(userPromotions)
                    .set({
                        usageCount: sql`${userPromotions.usageCount} + 1`,
                        lastUsedAt: new Date().toISOString(),
                    })
                    .where(
                        and(
                            eq(userPromotions.userId, userId),
                            eq(userPromotions.promotionId, promoId)
                        )
                    );
            }

            // Update user metadata
            await tx
                .update(userPromoMetadata)
                .set({
                    totalPromotionsUsed: sql`${userPromoMetadata.totalPromotionsUsed} + ${promotionIds.length}`,
                    totalSavings: sql`${userPromoMetadata.totalSavings} + ${totalSavingsApplied}`,
                })
                .where(eq(userPromoMetadata.userId, userId));
        });
    }

    /**
     * Mark first order promo as used
     */
    async markFirstOrderUsed(userId: string): Promise<void> {
        await this.db
            .update(userPromoMetadata)
            .set({
                hasUsedFirstOrderPromo: true,
                firstOrderPromoUsedAt: new Date().toISOString(),
            })
            .where(eq(userPromoMetadata.userId, userId));
    }

    // ==================== HELPER METHODS ====================

    private calculateDiscount(promo: any, subtotal: number): number {
        let discount = 0;

        switch (promo.type) {
            case 'FIXED_AMOUNT':
                discount = Number(promo.discountValue || 0);
                break;

            case 'PERCENTAGE':
                const percent = Number(promo.discountValue || 0);
                discount = (subtotal * percent) / 100;
                if (promo.maxDiscountCap) {
                    discount = Math.min(discount, Number(promo.maxDiscountCap));
                }
                break;

            case 'FREE_DELIVERY':
                discount = 0; // Handled separately
                break;


            case 'SPEND_X_PERCENT': {
                const pct = Number(promo.discountValue || 0);
                discount = (subtotal * pct) / 100;
                if (promo.maxDiscountCap) discount = Math.min(discount, Number(promo.maxDiscountCap));
                break;
            }

            case 'SPEND_X_FIXED':
                discount = Number(promo.discountValue || 0);
                break;
        }

        return normalizeMoney(Math.min(discount, subtotal)); // Can't discount more than subtotal
    }

    private checkFreeDelivery(promo: any): boolean {
        if (promo.type === 'FREE_DELIVERY') return true;
        
        // Check threshold reward
        if (promo.thresholdReward?.type === 'FREE_DELIVERY') return true;
        
        return false;
    }

    private async checkCodeEligibility(promo: any, userId: string): Promise<boolean> {
        // Check if user-specific usage limit exceeded
        if (promo.maxUsagePerUser) {
            const [usage] = await this.db
                .select({ count: sql<number>`count(*)` })
                .from(promotionUsage)
                .where(
                    and(
                        eq(promotionUsage.promotionId, promo.id),
                        eq(promotionUsage.userId, userId)
                    )
                );
            
            if (Number(usage?.count || 0) >= promo.maxUsagePerUser) {
                return false;
            }
        }

        return true;
    }

    private async checkUserAssignment(promoId: string, userId: string): Promise<boolean> {
        const [assignment] = await this.db
            .select()
            .from(userPromotions)
            .where(
                and(
                    eq(userPromotions.promotionId, promoId),
                    eq(userPromotions.userId, userId),
                    eq(userPromotions.isActive, true),
                    or(
                        isNull(userPromotions.expiresAt),
                        gte(userPromotions.expiresAt, new Date().toISOString())
                    )
                )
            )
            .limit(1);

        return !!assignment;
    }

    private async checkConditionalEligibility(promo: any, cart: CartContext): Promise<boolean> {
        if (!promo.spendThreshold) return true;
        return cart.subtotal >= Number(promo.spendThreshold);
    }

    private async checkBusinessEligibility(promoId: string, businessIds: string[]): Promise<boolean> {
        // If no business restrictions, it's eligible everywhere
        const [hasRestrictions] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(promotionBusinessEligibility)
            .where(eq(promotionBusinessEligibility.promotionId, promoId));

        if (Number(hasRestrictions?.count || 0) === 0) return true;

        // Check if any cart business is in the allowed list
        const eligible = await this.db
            .select()
            .from(promotionBusinessEligibility)
            .where(
                and(
                    eq(promotionBusinessEligibility.promotionId, promoId),
                    inArray(promotionBusinessEligibility.businessId, businessIds)
                )
            );

        return eligible.length > 0;
    }

    private async checkUsageLimits(promo: any, userId: string): Promise<boolean> {
        // Global limit
        if (promo.maxGlobalUsage && promo.currentGlobalUsage >= promo.maxGlobalUsage) {
            return false;
        }

        // Per-user limit (applies to all promos, including code-less SPECIFIC_USERS/recovery ones)
        if (promo.maxUsagePerUser) {
            const [usage] = await this.db
                .select({ count: sql<number>`count(*)` })
                .from(promotionUsage)
                .where(
                    and(
                        eq(promotionUsage.promotionId, promo.id),
                        eq(promotionUsage.userId, userId)
                    )
                );
            if (Number(usage?.count || 0) >= promo.maxUsagePerUser) {
                return false;
            }
        }

        return true;
    }

    /**
     * Reverse promotion usage when an order is cancelled.
     * Decrements global/user counters and deletes usage records for the order.
     */
    async reverseUsage(orderId: string, userId: string): Promise<void> {
        // Find all promotion usage records for this order
        const usageRecords = await this.db
            .select()
            .from(promotionUsage)
            .where(eq(promotionUsage.orderId, orderId));

        if (usageRecords.length === 0) return;

        let totalDiscount = 0;
        for (const record of usageRecords) {
            totalDiscount += Number(record.discountAmount || 0);

            // Decrement promotion global counters
            await this.db
                .update(promotions)
                .set({
                    currentGlobalUsage: sql`GREATEST(0, ${promotions.currentGlobalUsage} - 1)`,
                    totalUsageCount: sql`GREATEST(0, ${promotions.totalUsageCount} - 1)`,
                })
                .where(eq(promotions.id, record.promotionId));

            // Decrement user-specific assignment counters
            await this.db
                .update(userPromotions)
                .set({
                    usageCount: sql`GREATEST(0, ${userPromotions.usageCount} - 1)`,
                })
                .where(
                    and(
                        eq(userPromotions.userId, userId),
                        eq(userPromotions.promotionId, record.promotionId)
                    )
                );
        }

        // Delete usage records for this order
        await this.db
            .delete(promotionUsage)
            .where(eq(promotionUsage.orderId, orderId));

        // Reverse user metadata
        if (totalDiscount > 0) {
            await this.db
                .update(userPromoMetadata)
                .set({
                    totalPromotionsUsed: sql`GREATEST(0, ${userPromoMetadata.totalPromotionsUsed} - ${usageRecords.length})`,
                    totalSavings: sql`GREATEST(0, ${userPromoMetadata.totalSavings} - ${totalDiscount})`,
                })
                .where(eq(userPromoMetadata.userId, userId));
        }

        log.info({ orderId, userId, reversedCount: usageRecords.length }, 'promo:usage:reversed');
    }
}
