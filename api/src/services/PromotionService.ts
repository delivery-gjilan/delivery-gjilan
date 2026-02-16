import { DbType } from '@/database';
import { orders } from '@/database/schema';
import { PromotionRepository } from '@/repositories/PromotionRepository';
import type { DbPromotion, NewDbPromotion } from '@/database/schema/promotions';
import { and, eq, sql } from 'drizzle-orm';

export type PromotionValidationResult = {
    isValid: boolean;
    reason?: string;
    discountAmount: number;
    freeDeliveryApplied: boolean;
    effectiveDeliveryPrice: number;
    totalPrice: number;
    promotion?: DbPromotion;
};

export class PromotionService {
    constructor(private db: DbType, private promotionRepository: PromotionRepository) {}

    async listPromotions(): Promise<DbPromotion[]> {
        return this.promotionRepository.findAll();
    }

    async getPromotionById(id: string): Promise<DbPromotion | undefined> {
        return this.promotionRepository.findById(id);
    }

    async getPromotionByCode(code: string): Promise<DbPromotion | undefined> {
        const normalized = code.trim().toUpperCase();
        return this.promotionRepository.findByCode(normalized);
    }

    async createPromotion(data: NewDbPromotion, targetUserIds?: string[]): Promise<DbPromotion> {
        const normalized = {
            ...data,
            code: data.code.trim().toUpperCase(),
        };
        const promotion = await this.promotionRepository.create(normalized);
        
        // Set target users if provided
        if (targetUserIds && targetUserIds.length > 0) {
            await this.promotionRepository.setTargetUsers(promotion.id, targetUserIds);
        }
        
        return promotion;
    }

    async updatePromotion(id: string, data: Partial<NewDbPromotion>, targetUserIds?: string[]): Promise<DbPromotion | undefined> {
        const normalized = data.code ? { ...data, code: data.code.trim().toUpperCase() } : data;
        const promotion = await this.promotionRepository.update(id, normalized);
        
        // Update target users if provided (undefined means don't change, empty array means clear all)
        if (promotion && targetUserIds !== undefined) {
            await this.promotionRepository.setTargetUsers(id, targetUserIds);
        }
        
        return promotion;
    }

    async deletePromotion(id: string): Promise<boolean> {
        return this.promotionRepository.delete(id);
    }

    async validatePromotionForUser(
        userId: string,
        code: string,
        itemsTotal: number,
        deliveryPrice: number,
    ): Promise<PromotionValidationResult> {
        const normalizedCode = code.trim().toUpperCase();
        const promotion = await this.promotionRepository.findByCode(normalizedCode);

        if (!promotion) {
            return {
                isValid: false,
                reason: 'Promotion not found',
                discountAmount: 0,
                freeDeliveryApplied: false,
                effectiveDeliveryPrice: deliveryPrice,
                totalPrice: itemsTotal + deliveryPrice,
            };
        }

        if (!promotion.isActive) {
            return this.invalidResult(promotion, itemsTotal, deliveryPrice, 'Promotion is inactive');
        }

        const now = new Date();
        if (promotion.startsAt && new Date(promotion.startsAt) > now) {
            return this.invalidResult(promotion, itemsTotal, deliveryPrice, 'Promotion not started');
        }
        if (promotion.endsAt && new Date(promotion.endsAt) < now) {
            return this.invalidResult(promotion, itemsTotal, deliveryPrice, 'Promotion expired');
        }

        if (promotion.maxRedemptions) {
            const totalRedemptions = await this.promotionRepository.countRedemptions(promotion.id);
            if (totalRedemptions >= promotion.maxRedemptions) {
                return this.invalidResult(promotion, itemsTotal, deliveryPrice, 'Promotion fully redeemed');
            }
        }

        const userRedemptions = await this.promotionRepository.countRedemptionsByUser(promotion.id, userId);
        if (promotion.maxRedemptionsPerUser && userRedemptions >= promotion.maxRedemptionsPerUser) {
            return this.invalidResult(promotion, itemsTotal, deliveryPrice, 'Promotion limit reached');
        }

        if (promotion.freeDeliveryCount && userRedemptions >= promotion.freeDeliveryCount) {
            return this.invalidResult(promotion, itemsTotal, deliveryPrice, 'Free delivery uses exhausted');
        }

        if (promotion.firstOrderOnly) {
            const [row] = await this.db
                .select({ count: sql<number>`count(*)` })
                .from(orders)
                .where(eq(orders.userId, userId));
            if (Number(row?.count || 0) > 0) {
                return this.invalidResult(promotion, itemsTotal, deliveryPrice, 'Promotion only for first order');
            }
        }

        const { discountAmount, freeDeliveryApplied } = this.calculateDiscount(promotion, itemsTotal);
        const effectiveDeliveryPrice = freeDeliveryApplied ? 0 : deliveryPrice;
        const totalPrice = Math.max(0, itemsTotal - discountAmount + effectiveDeliveryPrice);

        return {
            isValid: true,
            discountAmount,
            freeDeliveryApplied,
            effectiveDeliveryPrice,
            totalPrice,
            promotion,
        };
    }

    async createRedemption(params: {
        promotion: DbPromotion;
        userId: string;
        orderId: string;
        discountAmount: number;
        freeDeliveryApplied: boolean;
    }) {
        await this.promotionRepository.createRedemption({
            promotionId: params.promotion.id,
            userId: params.userId,
            orderId: params.orderId,
            discountAmount: params.discountAmount,
            freeDeliveryApplied: params.freeDeliveryApplied,
            referrerUserId: params.promotion.referrerUserId || null,
        });
    }

    private calculateDiscount(promotion: DbPromotion, itemsTotal: number) {
        let discountAmount = 0;
        let freeDeliveryApplied = false;

        switch (promotion.type) {
            case 'PERCENT_DISCOUNT': {
                const percent = Math.max(0, Math.min(Number(promotion.value || 0), 100));
                discountAmount = (itemsTotal * percent) / 100;
                break;
            }
            case 'FIXED_DISCOUNT':
            case 'REFERRAL': {
                discountAmount = Number(promotion.value || 0);
                break;
            }
            case 'FREE_DELIVERY': {
                freeDeliveryApplied = true;
                break;
            }
            default:
                break;
        }

        discountAmount = Math.max(0, Math.min(discountAmount, itemsTotal));

        return { discountAmount, freeDeliveryApplied };
    }

    private invalidResult(
        promotion: DbPromotion,
        itemsTotal: number,
        deliveryPrice: number,
        reason: string,
    ): PromotionValidationResult {
        return {
            isValid: false,
            reason,
            discountAmount: 0,
            freeDeliveryApplied: false,
            effectiveDeliveryPrice: deliveryPrice,
            totalPrice: itemsTotal + deliveryPrice,
            promotion,
        };
    }

    async getAutoApplyPromotions(userId: string, itemsTotal: number, deliveryPrice: number): Promise<PromotionValidationResult[]> {
        const autoPromos = await this.promotionRepository.findAutoApplyPromotions(userId);
        
        const results: PromotionValidationResult[] = [];
        for (const promo of autoPromos) {
            const result = await this.validatePromotionForUser(userId, promo.code, itemsTotal, deliveryPrice);
            if (result.isValid) {
                results.push(result);
            }
        }
        
        // Sort by discount amount descending (best discount first)
        return results.sort((a, b) => {
            const totalA = a.discountAmount + (a.freeDeliveryApplied ? deliveryPrice : 0);
            const totalB = b.discountAmount + (b.freeDeliveryApplied ? deliveryPrice : 0);
            return totalB - totalA;
        });
    }

    async getTargetUserIds(promotionId: string): Promise<string[]> {
        return this.promotionRepository.getTargetUserIds(promotionId);
    }

    async setTargetUsers(promotionId: string, userIds: string[]): Promise<void> {
        return this.promotionRepository.setTargetUsers(promotionId, userIds);
    }
}
