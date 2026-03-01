import { DbType } from '@/database';
import { 
    promotions, 
    userPromotions, 
    promotionUsage, 
    userPromoMetadata,
    userWallet,
    walletTransactions,
    promotionBusinessEligibility
} from '@/database/schema/promotions';
import { orders } from '@/database/schema';
import { eq, and, or, sql, gte, lte, isNull, inArray } from 'drizzle-orm';
import logger from '@/lib/logger';
import { AppError } from '@/lib/errors';

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
    type: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'FREE_DELIVERY' | 'WALLET_CREDIT';
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
    walletDeduction: number;
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
                        lte(promotions.minOrderAmount, String(cart.subtotal))
                    )
                )
            );

        log.debug({ count: allPromos.length, manualPromoCode, cartSubtotal: cart.subtotal }, 'promo:found');

        // 3. Filter by target type and eligibility
        for (const promo of allPromos) {
            log.debug({ id: promo.id, name: promo.name, code: promo.code, target: promo.target, spendThreshold: promo.spendThreshold }, 'promo:checking');
            
            // If user entered a manual code, only consider that one
            if (manualPromoCode && promo.code !== manualPromoCode.trim().toUpperCase()) {
                log.debug({ promoCode: promo.code }, 'promo:skip:codeMismatch');
                continue;
            }

            // Check target eligibility
            let isEligible = false;

            switch (promo.target) {
                case 'ALL_USERS':
                    // Check basic code eligibility (usage limits)
                    isEligible = await this.checkCodeEligibility(promo, userId);
                    log.debug({ isEligible }, 'promo:allUsers:codeEligibility');
                    // If promo has a spend threshold, also check if it's met
                    if (isEligible && promo.spendThreshold) {
                        isEligible = await this.checkConditionalEligibility(promo, cart);
                        log.debug({ isEligible, spendThreshold: promo.spendThreshold, cartSubtotal: cart.subtotal }, 'promo:allUsers:thresholdCheck');
                    }
                    break;

                case 'FIRST_ORDER':
                    isEligible = isFirstOrder && await this.checkCodeEligibility(promo, userId);
                    log.debug({ isEligible, isFirstOrder }, 'promo:firstOrder');
                    break;

                case 'SPECIFIC_USERS':
                    isEligible = await this.checkUserAssignment(promo.id, userId);
                    log.debug({ isEligible }, 'promo:specificUsers');
                    break;

                case 'CONDITIONAL':
                    isEligible = await this.checkConditionalEligibility(promo, cart);
                    log.debug({ isEligible, spendThreshold: promo.spendThreshold, cartSubtotal: cart.subtotal }, 'promo:conditional');
                    break;
            }

            if (!isEligible) {
                log.debug({ promoId: promo.id }, 'promo:skip:notEligible');
                continue;
            }

            // Check business eligibility
            const businessEligible = await this.checkBusinessEligibility(promo.id, cart.businessIds);
            log.debug({ businessEligible, cartBusinessIds: cart.businessIds }, 'promo:businessEligibility');
            if (!businessEligible) continue;

            // Check usage limits
            const usageLimitOk = await this.checkUsageLimits(promo, userId);
            log.debug({ usageLimitOk }, 'promo:usageLimits');
            if (!usageLimitOk) continue;

            // Calculate discount amount
            const appliedAmount = this.calculateDiscount(promo, cart.subtotal);
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
            return {
                promotions: [],
                totalDiscount: 0,
                freeDeliveryApplied: false,
                finalSubtotal: cart.subtotal,
                finalDeliveryPrice: cart.deliveryPrice,
                finalTotal: cart.subtotal + cart.deliveryPrice,
                walletDeduction: 0,
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

        const finalSubtotal = Math.max(0, cart.subtotal - totalDiscount);
        const finalDeliveryPrice = freeDeliveryApplied ? 0 : cart.deliveryPrice;
        const finalTotal = finalSubtotal + finalDeliveryPrice;

        return {
            promotions: applied,
            totalDiscount,
            freeDeliveryApplied,
            finalSubtotal,
            finalDeliveryPrice,
            finalTotal,
            walletDeduction: 0, // Wallet handled separately
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
        businessId: string | null
    ): Promise<void> {
        await this.db.transaction(async (tx) => {
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

                await tx.insert(promotionUsage).values({
                    promotionId: promoId,
                    userId,
                    orderId,
                    discountAmount: String(discountAmount),
                    freeDeliveryApplied,
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
                    totalPromotionsUsed: sql`${userPromoMetadata.totalPromotionsUsed} + 1`,
                    totalSavings: sql`${userPromoMetadata.totalSavings} + ${discountAmount}`,
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

            case 'WALLET_CREDIT':
                discount = 0; // Wallet credits don't reduce order price directly
                break;
        }

        return Math.min(discount, subtotal); // Can't discount more than subtotal
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

        // Per-user limit already checked in checkCodeEligibility
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
