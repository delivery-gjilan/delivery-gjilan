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

        // 3. Filter by target type and eligibility
        for (const promo of allPromos) {
            // If user entered a manual code, only consider that one
            if (manualPromoCode && promo.code !== manualPromoCode.trim().toUpperCase()) {
                continue;
            }

            // Check target eligibility
            let isEligible = false;

            switch (promo.target) {
                case 'ALL_USERS':
                    isEligible = await this.checkCodeEligibility(promo, userId);
                    break;

                case 'FIRST_ORDER':
                    isEligible = isFirstOrder && await this.checkCodeEligibility(promo, userId);
                    break;

                case 'SPECIFIC_USERS':
                    isEligible = await this.checkUserAssignment(promo.id, userId);
                    break;

                case 'CONDITIONAL':
                    isEligible = await this.checkConditionalEligibility(promo, cart);
                    break;
            }

            if (!isEligible) continue;

            // Check business eligibility
            const businessEligible = await this.checkBusinessEligibility(promo.id, cart.businessIds);
            if (!businessEligible) continue;

            // Check usage limits
            const usageLimitOk = await this.checkUsageLimits(promo, userId);
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
        const applicable = await this.getApplicablePromotions(userId, cart, manualPromoCode);

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
        for (const promoId of promotionIds) {
            await this.db.insert(promotionUsage).values({
                promotionId: promoId,
                userId,
                orderId,
                discountAmount: String(discountAmount),
                freeDeliveryApplied,
                orderSubtotal: String(orderSubtotal),
                businessId,
            });

            // Increment usage counters
            await this.db
                .update(promotions)
                .set({
                    currentGlobalUsage: sql`${promotions.currentGlobalUsage} + 1`,
                    totalUsageCount: sql`${promotions.totalUsageCount} + 1`,
                    totalRevenue: sql`${promotions.totalRevenue} + ${orderSubtotal}`,
                })
                .where(eq(promotions.id, promoId));

            // Update user-specific assignment if exists
            await this.db
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
        await this.db
            .update(userPromoMetadata)
            .set({
                totalPromotionsUsed: sql`${userPromoMetadata.totalPromotionsUsed} + 1`,
                totalSavings: sql`${userPromoMetadata.totalSavings} + ${discountAmount}`,
            })
            .where(eq(userPromoMetadata.userId, userId));
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
}
