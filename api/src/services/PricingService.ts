import { getDB, type DbType } from '@/database';
import { 
    productPricing, 
    dynamicPricingRules, 
    DbProductPricing,
    DbDynamicPricingRule,
    TimeOfDayCondition,
    AdjustmentConfig 
} from '@/database/schema';
import { eq, and } from 'drizzle-orm';
import logger from '@/lib/logger';

const log = logger.child({ service: 'PricingService' });

type Database = DbType;

interface PriceCalculationResult {
    productId: string;
    businessPrice: number;
    platformMarkup: number;
    baseCustomerPrice: number;
    dynamicAdjustments: Array<{
        ruleId: string;
        ruleName: string;
        adjustmentType: string;
        adjustmentValue: number;
    }>;
    finalCustomerPrice: number;
}

/**
 * PricingService - Calculates final customer prices with dynamic adjustments
 * 
 * Price Flow:
 * 1. Business Price (fixed) - what business receives
 * 2. + Platform Markup (fixed) - base platform fee
 * 3. + Dynamic Adjustments (conditional) - time/weather/demand based
 * 4. = Final Customer Price
 * 
 * Settlements always based on Business Price + Platform Markup (never includes dynamic adjustments)
 */
export class PricingService {
    constructor(private db: Database) {}

    /**
     * Calculate final price for a product with all applicable dynamic adjustments
     */
    async calculateProductPrice(
        productId: string,
        context: {
            timestamp?: Date;
            weatherCondition?: string;
            demandLevel?: number;
        } = {}
    ): Promise<PriceCalculationResult> {
        const timestamp = context.timestamp || new Date();

        // Get base pricing
        const pricing = await this.db.query.productPricing.findFirst({
            where: eq(productPricing.productId, productId),
            with: {
                product: {
                    columns: { id: true, name: true, businessId: true }
                }
            }
        });

        if (!pricing) {
            throw new Error(`No pricing found for product ${productId}`);
        }

        const businessPrice = Number(pricing.businessPrice);
        const platformMarkup = Number(pricing.platformMarkup);
        const baseCustomerPrice = Number(pricing.baseCustomerPrice);

        // Get applicable dynamic pricing rules
        const applicableRules = await this.getApplicableDynamicRules(
            pricing.product?.businessId || '',
            productId,
            timestamp,
            context
        );

        // Apply adjustments
        let finalPrice = baseCustomerPrice;
        const adjustments: PriceCalculationResult['dynamicAdjustments'] = [];

        for (const rule of applicableRules) {
            const adjustment = this.applyAdjustment(
                finalPrice,
                rule.adjustmentConfig as AdjustmentConfig
            );

            if (adjustment !== 0) {
                adjustments.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    adjustmentType: (rule.adjustmentConfig as any).type,
                    adjustmentValue: adjustment
                });

                finalPrice += adjustment;
            }
        }

        log.debug({
            productId,
            businessPrice,
            platformMarkup,
            basePrice: baseCustomerPrice,
            adjustments,
            finalPrice
        }, 'pricing:calculated');

        return {
            productId,
            businessPrice,
            platformMarkup,
            baseCustomerPrice,
            dynamicAdjustments: adjustments,
            finalCustomerPrice: Number(finalPrice.toFixed(2))
        };
    }

    /**
     * Batch calculate prices for multiple products
     */
    async calculateProductPrices(
        productIds: string[],
        context: {
            timestamp?: Date;
            weatherCondition?: string;
            demandLevel?: number;
        } = {}
    ): Promise<Map<string, PriceCalculationResult>> {
        const results = new Map<string, PriceCalculationResult>();

        for (const productId of productIds) {
            try {
                const result = await this.calculateProductPrice(productId, context);
                results.set(productId, result);
            } catch (error) {
                log.error({ err: error, productId }, 'pricing:calculate:error');
                // Continue with other products
            }
        }

        return results;
    }

    /**
     * Get dynamic pricing rules that apply to a product at given time/conditions
     */
    private async getApplicableDynamicRules(
        businessId: string,
        productId: string,
        timestamp: Date,
        context: any
    ): Promise<DbDynamicPricingRule[]> {
        // Get all active rules for this business or global rules
        const allRules = await this.db
            .select()
            .from(dynamicPricingRules)
            .where(
                and(
                    eq(dynamicPricingRules.isActive, true),
                    // Business-specific or global
                    // Note: In real implementation, add OR condition for null businessId
                )
            );

        // Filter rules that apply to this product
        const applicableRules = allRules.filter((rule: DbDynamicPricingRule) => {
            const appliesTo = rule.appliesTo as any;
            
            // Check if rule applies to this product
            if (appliesTo.allProducts) return true;
            if (appliesTo.productIds && appliesTo.productIds.includes(productId)) return true;
            // Additional checks for categories/subcategories would go here

            return false;
        });

        // Filter by validity period
        const validRules = applicableRules.filter((rule: DbDynamicPricingRule) => {
            if (rule.validFrom && new Date(rule.validFrom) > timestamp) return false;
            if (rule.validUntil && new Date(rule.validUntil) < timestamp) return false;
            return true;
        });

        // Filter by condition evaluation
        const matchingRules = validRules.filter((rule: DbDynamicPricingRule) => {
            return this.evaluateCondition(rule, timestamp, context);
        });

        // Sort by priority (lower number = higher priority)
        return matchingRules.sort((a: DbDynamicPricingRule, b: DbDynamicPricingRule) => a.priority - b.priority);
    }

    /**
     * Evaluate if a dynamic pricing rule's condition is met
     */
    private evaluateCondition(
        rule: DbDynamicPricingRule,
        timestamp: Date,
        context: any
    ): boolean {
        const config = rule.conditionConfig as any;

        switch (rule.conditionType) {
            case 'TIME_OF_DAY': {
                const condition = config as TimeOfDayCondition;
                const hour = timestamp.getHours();
                const day = timestamp.getDay();

                // Check hour range
                let hourMatch = false;
                if (condition.startHour <= condition.endHour) {
                    // Normal range (e.g., 9-17)
                    hourMatch = hour >= condition.startHour && hour < condition.endHour;
                } else {
                    // Overnight range (e.g., 22-6)
                    hourMatch = hour >= condition.startHour || hour < condition.endHour;
                }

                // Check day of week if specified
                if (condition.daysOfWeek && condition.daysOfWeek.length > 0) {
                    return hourMatch && condition.daysOfWeek.includes(day);
                }

                return hourMatch;
            }

            case 'DAY_OF_WEEK': {
                const day = timestamp.getDay();
                return config.days && config.days.includes(day);
            }

            case 'WEATHER': {
                if (!context.weatherCondition) return false;
                return config.conditions && config.conditions.includes(context.weatherCondition);
            }

            case 'DEMAND': {
                if (context.demandLevel === undefined) return false;
                // Simple demand-based logic
                return context.demandLevel > (config.threshold || 0.7);
            }

            case 'SPECIAL_EVENT':
                // For special events, just check if we're in the active window
                return true;

            case 'CUSTOM':
                // Custom condition evaluation would go here
                // Could use a safe expression evaluator
                log.warn({ ruleId: rule.id }, 'pricing:custom-condition:not-implemented');
                return false;

            default:
                log.warn({ ruleId: rule.id, type: rule.conditionType }, 'pricing:unknown-condition-type');
                return false;
        }
    }

    /**
     * Apply a pricing adjustment to a base price
     */
    private applyAdjustment(basePrice: number, adjustment: AdjustmentConfig): number {
        switch (adjustment.type) {
            case 'PERCENTAGE':
                return basePrice * (adjustment.value / 100);

            case 'FIXED_AMOUNT':
                return adjustment.value;

            case 'MULTIPLIER':
                return basePrice * adjustment.value - basePrice;

            default:
                log.warn({ adjustment }, 'pricing:unknown-adjustment-type');
                return 0;
        }
    }

    /**
     * Update product pricing (business price and platform markup)
     */
    async updateProductPricing(
        productId: string,
        businessPrice: number,
        platformMarkup: number,
        changedBy: string | null,
        reason?: string
    ): Promise<DbProductPricing> {
        const existing = await this.db.query.productPricing.findFirst({
            where: eq(productPricing.productId, productId)
        });

        if (!existing) {
            throw new Error(`No pricing record found for product ${productId}`);
        }

        const baseCustomerPrice = businessPrice + platformMarkup;
        const now = new Date().toISOString();

        // Add to history
        const history = (existing.priceHistory as any[]) || [];
        history.push({
            businessPrice,
            platformMarkup,
            baseCustomerPrice,
            changedAt: now,
            changedBy,
            reason
        });

        const updated = await this.db
            .update(productPricing)
            .set({
                businessPrice: businessPrice.toString(),
                platformMarkup: platformMarkup.toString(),
                baseCustomerPrice: baseCustomerPrice.toString(),
                priceHistory: history as any,
                updatedAt: now
            })
            .where(eq(productPricing.productId, productId))
            .returning();

        if (!updated || updated.length === 0 || !updated[0]) {
            throw new Error(`Failed to update pricing for product ${productId}`);
        }

        log.info({
            productId,
            oldBusinessPrice: existing.businessPrice,
            newBusinessPrice: businessPrice,
            oldMarkup: existing.platformMarkup,
            newMarkup: platformMarkup
        }, 'pricing:updated');

        return updated[0];
    }

    /**
     * Create initial product pricing record
     * Call this when a new product is added to the system
     */
    async createProductPricing(
        productId: string,
        businessId: string,
        businessPrice: number,
        platformMarkup: number = 0,
        createdBy?: string | null
    ): Promise<DbProductPricing> {
        // Check if pricing already exists
        const existing = await this.db.query.productPricing.findFirst({
            where: eq(productPricing.productId, productId)
        });

        if (existing) {
            log.warn({ productId }, 'pricing:already-exists');
            return existing;
        }

        const baseCustomerPrice = businessPrice + platformMarkup;
        const now = new Date().toISOString();

        const created = await this.db
            .insert(productPricing)
            .values({
                productId,
                businessId,
                businessPrice: businessPrice.toString(),
                platformMarkup: platformMarkup.toString(),
                baseCustomerPrice: baseCustomerPrice.toString(),
                priceHistory: [],
                createdAt: now,
                updatedAt: now
            })
            .returning();

        if (!created || created.length === 0 || !created[0]) {
            throw new Error(`Failed to create pricing for product ${productId}`);
        }

        log.info({
            productId,
            businessId,
            businessPrice,
            platformMarkup,
            baseCustomerPrice
        }, 'pricing:created');

        return created[0];
    }

    /**
     * Ensure product pricing exists, create with defaults if not
     * Useful for migrating existing products
     */
    async ensureProductPricing(
        productId: string,
        businessId: string,
        businessPrice: number,
        defaultMarkup: number = 0
    ): Promise<DbProductPricing> {
        const existing = await this.db.query.productPricing.findFirst({
            where: eq(productPricing.productId, productId)
        });

        if (existing) {
            return existing;
        }

        return this.createProductPricing(productId, businessId, businessPrice, defaultMarkup);
    }
}
