import { getDB, type DbType } from '@/database';
import {
    DbOrder,
    DbOrderItem,
    DbSettlementRule,
    settlementRules,
    orderPromotions,
    productPricing,
    drivers,
    NewDbSettlement,
} from '@/database/schema';
import { eq, and, inArray } from 'drizzle-orm';
import logger from '@/lib/logger';
import { PricingService } from './PricingService';

const log = logger.child({ service: 'SettlementCalculationEngine' });
const GLOBAL_RULE_ENTITY_ID = '00000000-0000-0000-0000-000000000000';

type Database = DbType;

interface SettlementCalculation {
    type: 'DRIVER' | 'BUSINESS';
    direction: 'RECEIVABLE' | 'PAYABLE';
    entityId: string;
    orderId: string;
    amount: number;
    ruleSnapshot: any;
    calculationDetails: any;
    metadata?: any;
}

/**
 * SettlementCalculationEngine - Core settlement calculation logic
 *
 * Handles:
 * - Multiple stacking rules per entity
 * - Product-based markups
 * - Percentage commissions
 * - Fixed fees
 * - Driver bonuses
 * - Free delivery compensation
 *
 * Always creates complete audit trail with rule snapshots and breakdowns
 */
export class SettlementCalculationEngine {
    private pricingService: PricingService;

    constructor(private db: Database) {
        this.pricingService = new PricingService(db);
    }

    /**
     * Calculate all settlements for an order
     * Returns array of settlement records to be created
     */
    async calculateOrderSettlements(
        order: DbOrder,
        orderItems: DbOrderItem[],
        driverId: string | null,
    ): Promise<SettlementCalculation[]> {
        const settlements: SettlementCalculation[] = [];

        try {
            // Group items by business
            const itemsByBusiness = await this.groupItemsByBusiness(orderItems);
            const orderBusinessIds = Array.from(itemsByBusiness.keys());
            const primaryBusinessId = orderBusinessIds.length === 1 ? orderBusinessIds[0] : null;

            // Calculate settlement for each business
            for (const [businessId, items] of itemsByBusiness.entries()) {
                const businessSettlement = await this.calculateBusinessSettlement(order, businessId, items);

                if (businessSettlement) {
                    settlements.push(businessSettlement);
                }
            }

            // Calculate driver settlement
            if (driverId) {
                const driverSettlement = await this.calculateDriverSettlement(order, driverId, primaryBusinessId);

                if (driverSettlement) {
                    settlements.push(driverSettlement);
                }
            }

            log.info(
                {
                    orderId: order.id,
                    settlementsCount: settlements.length,
                    totalReceivable: settlements
                        .filter((s) => s.direction === 'RECEIVABLE')
                        .reduce((sum, s) => sum + s.amount, 0),
                    totalPayable: settlements
                        .filter((s) => s.direction === 'PAYABLE')
                        .reduce((sum, s) => sum + s.amount, 0),
                },
                'settlement:calculated',
            );

            return settlements;
        } catch (error) {
            log.error({ err: error, orderId: order.id }, 'settlement:calculate:error');
            throw error;
        }
    }

    /**
     * Calculate settlement for a business
     */
    private async calculateBusinessSettlement(
        order: DbOrder,
        businessId: string,
        items: DbOrderItem[],
    ): Promise<SettlementCalculation | null> {
        // Get active rules for this business
        const rules = await this.getActiveRules('BUSINESS', businessId, { businessId });

        if (rules.length === 0) {
            log.debug({ businessId, orderId: order.id }, 'settlement:business:no-rules');
            return null;
        }

        // Get pricing info for all items
        const itemPricing = await this.getItemPricing(items);

        // Load dynamic pricing overrides (per-business, per-product FIXED_AMOUNT overrides)
        const productIds = items.map((i) => i.productId);
        const dynamicOverrides = await this.getActiveDynamicPricingOverrides(businessId, productIds, order.createdAt);

        // Build items breakdown
        const itemsBreakdown = items.map((item) => {
            const pricing = itemPricing.get(item.productId);
            if (!pricing) {
                throw new Error(`No pricing found for product ${item.productId}`);
            }

            const businessPrice = Number(pricing.businessPrice);
            let platformMarkup = Number(pricing.platformMarkup);

            // If there's a dynamic fixed override for this product scoped to this business, treat it as
            // additional platform markup for settlement purposes (platform keeps the override increment).
            const overrideAmount = dynamicOverrides.get(item.productId) || 0;
            if (overrideAmount !== 0) {
                platformMarkup += overrideAmount;
            }

            const customerPrice = businessPrice + platformMarkup; // Settlement based on base + platform markup

            return {
                orderItemId: `${item.orderId}-${item.productId}`, // Composite key
                productId: item.productId,
                productName: '', // Would fetch from product table
                quantity: item.quantity,
                businessPrice,
                platformMarkup,
                customerPrice,
                dynamicAdjustments: [], // Not used in settlement calculation
                totalBusinessRevenue: businessPrice * item.quantity,
                totalPlatformMarkup: platformMarkup * item.quantity,
                totalCustomerPaid: customerPrice * item.quantity,
            };
        });

        // Calculate business subtotal (what business receives)
        const businessSubtotal = itemsBreakdown.reduce((sum, item) => sum + item.totalBusinessRevenue, 0);

        // Calculate total platform markup from products
        const productMarkupTotal = itemsBreakdown.reduce((sum, item) => sum + item.totalPlatformMarkup, 0);

        // Apply all rules
        const rulesApplied: any[] = [];
        let totalAmount = 0;

        // Product markup is implicit (always applied)
        if (productMarkupTotal > 0) {
            rulesApplied.push({
                ruleType: 'PRODUCT_MARKUP',
                description: 'Per-product platform markup',
                baseAmount: businessSubtotal,
                amount: productMarkupTotal,
                direction: 'RECEIVABLE',
            });
            totalAmount += productMarkupTotal;
        }

        // If any dynamic overrides applied, record them as platform-receivable adjustments
        const dynamicOverrideTotal = Array.from(dynamicOverrides.values()).reduce((s, v) => s + v, 0);
        if (dynamicOverrideTotal > 0) {
            rulesApplied.push({
                ruleType: 'DYNAMIC_PRICING_OVERRIDES',
                description: 'Per-product fixed pricing overrides (business-scoped) applied as platform markup',
                baseAmount: dynamicOverrideTotal,
                amount: dynamicOverrideTotal,
                direction: 'RECEIVABLE',
            });
            totalAmount += dynamicOverrideTotal;
        }

        // Apply other rules
        for (const rule of rules) {
            if (rule.ruleType === 'PRODUCT_MARKUP') continue; // Already handled

            const ruleResult = await this.applyRule(rule, {
                orderSubtotal: businessSubtotal,
                deliveryFee: order.deliveryPrice,
                itemCount: items.length,
            });

            if (ruleResult.amount !== 0) {
                rulesApplied.push(ruleResult);
                totalAmount += ruleResult.amount;
            }
        }

        // Build rule snapshot
        const ruleSnapshot = {
            appliedRules: rules.map((rule) => ({
                ruleId: rule.id,
                ruleType: rule.ruleType,
                config: rule.config,
                activeSince: rule.activatedAt,
                capturedAt: new Date().toISOString(),
            })),
        };

        // Build calculation details
        const calculationDetails = {
            orderSubtotal: businessSubtotal,
            itemsBreakdown,
            rulesApplied,
            totalReceivable: totalAmount,
            totalPayable: 0,
            netAmount: totalAmount,
            currency: 'EUR',
        };

        return {
            type: 'BUSINESS',
            direction: 'RECEIVABLE',
            entityId: businessId,
            orderId: order.id,
            amount: Number(totalAmount.toFixed(2)),
            ruleSnapshot,
            calculationDetails,
        };
    }

    /**
     * Calculate settlement for a driver
     */
    private async calculateDriverSettlement(
        order: DbOrder,
        driverUserId: string,
        businessId: string | null,
    ): Promise<SettlementCalculation | null> {
        // Get driver record
        const driver = await this.db.query.drivers.findFirst({
            where: eq(drivers.userId, driverUserId),
        });

        if (!driver) {
            log.warn({ driverUserId, orderId: order.id }, 'settlement:driver:not-found');
            return null;
        }

        // Check for free delivery coupon
        const orderMetadata = (order as any).metadata || {};
        const originalDeliveryPrice = Number(order.originalDeliveryPrice || 0);
        const effectiveDeliveryPrice = Number(order.deliveryPrice || 0);
        const hasFreeDelivery =
            Boolean(orderMetadata.freeDeliveryCoupon) || (originalDeliveryPrice > 0 && effectiveDeliveryPrice === 0);

        if (hasFreeDelivery) {
            // Platform pays driver their commission portion
            return this.calculateFreeDeliverySettlement(order, driver.id, businessId);
        }

        // Normal settlement - get active rules
        const rules = await this.getActiveRules('DRIVER', driver.id, { businessId });

        if (rules.length === 0) {
            log.debug({ driverId: driver.id, orderId: order.id }, 'settlement:driver:no-rules');
            return null;
        }

        // Apply rules
        const rulesApplied: any[] = [];
        let totalReceivable = 0;
        let totalPayable = 0;

        for (const rule of rules) {
            const ruleResult = await this.applyRule(rule, {
                deliveryFee: order.deliveryPrice,
                orderSubtotal: order.price,
                hasOwnVehicle: driver.hasOwnVehicle || false,
            });

            if (ruleResult.amount !== 0) {
                rulesApplied.push(ruleResult);
                if (ruleResult.direction === 'PAYABLE') {
                    totalPayable += ruleResult.amount;
                } else {
                    totalReceivable += ruleResult.amount;
                }
            }
        }

        const netAmount = totalReceivable - totalPayable;

        if (totalReceivable === 0 && totalPayable === 0) {
            return null;
        }

        const ruleSnapshot = {
            appliedRules: rules.map((rule) => ({
                ruleId: rule.id,
                ruleType: rule.ruleType,
                config: rule.config,
                activeSince: rule.activatedAt,
                capturedAt: new Date().toISOString(),
            })),
        };

        const calculationDetails = {
            deliveryFee: order.deliveryPrice,
            rulesApplied,
            totalReceivable,
            totalPayable,
            netAmount,
            currency: 'EUR',
        };

        return {
            type: 'DRIVER',
            direction: netAmount >= 0 ? 'RECEIVABLE' : 'PAYABLE',
            entityId: driver.id,
            orderId: order.id,
            amount: Number(Math.abs(netAmount).toFixed(2)),
            ruleSnapshot,
            calculationDetails,
        };
    }

    /**
     * Calculate driver settlement for free delivery orders
     * Platform pays driver their commission portion
     */
    private async calculateFreeDeliverySettlement(
        order: DbOrder,
        driverId: string,
        businessId: string | null,
    ): Promise<SettlementCalculation | null> {
        // Resolve compensation rule for free-delivery settlements.
        const rules = await this.getActiveRules('DRIVER', driverId, { businessId });
        const appliedPromotionIds = await this.getAppliedDeliveryPromotionIds(order.id);
        const freeDeliveryRule = this.resolveFreeDeliveryCompensationRule(rules, appliedPromotionIds);

        if (!freeDeliveryRule) {
            log.warn({ driverId, orderId: order.id }, 'settlement:free-delivery:no-rule — skipping driver settlement');
            return null;
        }

        const originalDeliveryFee = order.originalDeliveryPrice || order.deliveryPrice;
        const compensation = this.computeFreeDeliveryCompensation(freeDeliveryRule, originalDeliveryFee);
        const platformPaysDriver = compensation.amount;

        const orderMetadata = (order as any).metadata || {};
        const metadata = {
            couponApplied: {
                code: orderMetadata?.couponCode || 'UNKNOWN',
                type: 'FREE_DELIVERY',
                originalDeliveryFee,
                compensationMode: compensation.mode,
                driverCommissionRate: compensation.percentage,
                platformPaysDriver,
            },
            compensationRule: {
                ruleId: freeDeliveryRule.id,
                ruleType: freeDeliveryRule.ruleType,
                config: freeDeliveryRule.config,
                businessId: businessId || null,
                promotionId: ((freeDeliveryRule.config || {}) as any).promotionId || null,
                appliedPromotionIds,
            },
        };

        const calculationDetails = {
            deliveryFee: originalDeliveryFee,
            rulesApplied: [
                {
                    ruleType: 'FREE_DELIVERY_COMPENSATION',
                    description: 'Platform pays driver commission for free delivery',
                    baseAmount: originalDeliveryFee,
                    percentage: compensation.percentage,
                    amount: platformPaysDriver,
                    direction: 'PAYABLE',
                },
            ],
            totalReceivable: 0,
            totalPayable: platformPaysDriver,
            netAmount: -platformPaysDriver, // Negative because we owe
            currency: 'EUR',
        };

        const ruleSnapshot = {
            appliedRules: [
                {
                    ruleId: freeDeliveryRule.id,
                    ruleType: freeDeliveryRule.ruleType,
                    config: freeDeliveryRule.config,
                    activeSince: freeDeliveryRule.activatedAt,
                    capturedAt: new Date().toISOString(),
                },
            ],
        };

        return {
            type: 'DRIVER',
            direction: 'PAYABLE', // We owe the driver
            entityId: driverId,
            orderId: order.id,
            amount: Number(platformPaysDriver.toFixed(2)),
            ruleSnapshot,
            calculationDetails,
            metadata,
        };
    }

    private resolveFreeDeliveryCompensationRule(
        rules: DbSettlementRule[],
        appliedPromotionIds: string[],
    ): DbSettlementRule | null {
        const freeDeliveryRules = rules.filter((rule) => {
            const config = (rule.config || {}) as any;
            const appliesTo = config.appliesTo;
            const explicitFreeDelivery = appliesTo === 'FREE_DELIVERY';
            const implicitLegacyRule = rule.ruleType === 'PERCENTAGE' && appliesTo === 'DELIVERY_FEE';
            return explicitFreeDelivery || implicitLegacyRule;
        });

        if (freeDeliveryRules.length === 0) {
            return null;
        }

        // If a rule is bound to a specific promotionId, only consider it when that promo was applied.
        const promotionFiltered = freeDeliveryRules.filter((rule) => {
            const config = (rule.config || {}) as any;
            const promotionId = typeof config.promotionId === 'string' ? config.promotionId : null;
            if (!promotionId) {
                return true;
            }
            return appliedPromotionIds.includes(promotionId);
        });

        const candidates = promotionFiltered.length > 0 ? promotionFiltered : freeDeliveryRules;

        // Prefer explicit FREE_DELIVERY rules over legacy DELIVERY_FEE percentage rules.
        const sorted = [...candidates].sort((a, b) => {
            const aConfig = (a.config || {}) as any;
            const bConfig = (b.config || {}) as any;
            const aExplicit = aConfig.appliesTo === 'FREE_DELIVERY' ? 1 : 0;
            const bExplicit = bConfig.appliesTo === 'FREE_DELIVERY' ? 1 : 0;
            if (aExplicit !== bExplicit) {
                return bExplicit - aExplicit;
            }

            // Prefer promo-scoped match when applicable.
            const aPromoScoped = aConfig.promotionId && appliedPromotionIds.includes(aConfig.promotionId) ? 1 : 0;
            const bPromoScoped = bConfig.promotionId && appliedPromotionIds.includes(bConfig.promotionId) ? 1 : 0;
            if (aPromoScoped !== bPromoScoped) {
                return bPromoScoped - aPromoScoped;
            }

            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        });

        return sorted[0] || null;
    }

    private computeFreeDeliveryCompensation(
        rule: DbSettlementRule,
        baseDeliveryFee: number,
    ): { amount: number; mode: 'FIXED' | 'PERCENTAGE'; percentage?: number } {
        const config = (rule.config || {}) as any;

        if (rule.ruleType === 'FIXED_PER_ORDER') {
            const fixedAmount = Number(config.amount || 0);
            return {
                amount: fixedAmount,
                mode: 'FIXED',
            };
        }

        const percentage = Number(config.percentage || 0);
        return {
            amount: baseDeliveryFee * (percentage / 100),
            mode: 'PERCENTAGE',
            percentage,
        };
    }

    private async getAppliedDeliveryPromotionIds(orderId: string): Promise<string[]> {
        const rows = await this.db
            .select({ promotionId: orderPromotions.promotionId })
            .from(orderPromotions)
            .where(and(eq(orderPromotions.orderId, orderId), eq(orderPromotions.appliesTo, 'DELIVERY')));

        return rows.map((row) => row.promotionId);
    }

    /**
     * Apply a single rule and return the result
     */
    private async applyRule(
        rule: DbSettlementRule,
        context: {
            orderSubtotal?: number;
            deliveryFee?: number;
            itemCount?: number;
            hasOwnVehicle?: boolean;
        },
    ): Promise<any> {
        const config = rule.config as any;

        switch (rule.ruleType) {
            case 'PERCENTAGE': {
                const appliesTo = config.appliesTo;
                const percentage = config.percentage;
                let baseAmount = 0;

                if (appliesTo === 'ORDER_SUBTOTAL') {
                    baseAmount = context.orderSubtotal || 0;
                } else if (appliesTo === 'DELIVERY_FEE') {
                    baseAmount = context.deliveryFee || 0;
                }

                const amount = baseAmount * (percentage / 100);

                return {
                    ruleType: 'PERCENTAGE',
                    description: `${percentage}% commission on ${appliesTo.toLowerCase().replace('_', ' ')}`,
                    baseAmount,
                    percentage,
                    amount,
                    direction: 'RECEIVABLE',
                };
            }

            case 'FIXED_PER_ORDER': {
                return {
                    ruleType: 'FIXED_PER_ORDER',
                    description: config.description || 'Fixed fee per order',
                    amount: config.amount,
                    direction: rule.entityType === 'DRIVER' ? 'PAYABLE' : 'RECEIVABLE',
                };
            }

            case 'DRIVER_VEHICLE_BONUS': {
                if (!context.hasOwnVehicle) {
                    return { amount: 0 };
                }

                return {
                    ruleType: 'DRIVER_VEHICLE_BONUS',
                    description: config.description || 'Vehicle bonus',
                    amount: config.amount,
                    direction: 'PAYABLE', // We pay driver a bonus
                };
            }

            default:
                log.warn({ ruleType: rule.ruleType }, 'settlement:unknown-rule-type');
                return { amount: 0 };
        }
    }

    /**
     * Get active rules for an entity
     */
    private async getActiveRules(
        entityType: 'DRIVER' | 'BUSINESS',
        entityId: string,
        context?: {
            businessId?: string | null;
        },
    ): Promise<DbSettlementRule[]> {
        const rules = await this.db
            .select()
            .from(settlementRules)
            .where(
                and(
                    eq(settlementRules.entityType, entityType as any),
                    inArray(settlementRules.entityId, [entityId, GLOBAL_RULE_ENTITY_ID]),
                    eq(settlementRules.isActive, true),
                ),
            )
            .orderBy(settlementRules.priority, settlementRules.updatedAt);

        return this.resolveRulePrecedence(rules, entityId, context);
    }

    private resolveRulePrecedence(
        rules: DbSettlementRule[],
        entityId: string,
        context?: {
            businessId?: string | null;
        },
    ): DbSettlementRule[] {
        const contextBusinessId = context?.businessId || null;

        const precedence = [...rules].sort((a, b) => {
            const aScore = this.getRuleSpecificityScore(a, entityId, contextBusinessId);
            const bScore = this.getRuleSpecificityScore(b, entityId, contextBusinessId);

            if (aScore !== bScore) {
                return bScore - aScore;
            }

            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }

            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        });

        const winners = new Map<string, DbSettlementRule>();

        for (const rule of precedence) {
            const key = this.getRuleUniquenessKey(rule, contextBusinessId);
            const existing = winners.get(key);
            if (!existing) {
                winners.set(key, rule);
                continue;
            }

            // Keep stacking when explicitly allowed by both rules.
            const existingCanStack = ((existing.canStackWith || []) as string[]).includes(rule.ruleType);
            const nextCanStack = ((rule.canStackWith || []) as string[]).includes(existing.ruleType);
            if (existingCanStack && nextCanStack) {
                winners.set(`${key}:${rule.id}`, rule);
            }
        }

        return Array.from(winners.values()).sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        });
    }

    private getRuleSpecificityScore(
        rule: DbSettlementRule,
        entityId: string,
        contextBusinessId: string | null,
    ): number {
        const config = (rule.config || {}) as any;
        const ruleBusinessId = config.businessId || config.appliesToBusinessId || null;
        const isGlobal = rule.entityId === GLOBAL_RULE_ENTITY_ID;
        const isEntityMatch = rule.entityId === entityId;
        const businessScoped = contextBusinessId && ruleBusinessId === contextBusinessId;

        if (businessScoped && isEntityMatch) {
            return 300;
        }

        if (businessScoped && isGlobal) {
            return 200;
        }

        if (isEntityMatch) {
            return 100;
        }

        if (isGlobal) {
            return 10;
        }

        return 0;
    }

    private getRuleUniquenessKey(rule: DbSettlementRule, contextBusinessId: string | null): string {
        const config = (rule.config || {}) as any;
        const ruleBusinessId = config.businessId || config.appliesToBusinessId || null;
        const businessSegment =
            contextBusinessId && ruleBusinessId === contextBusinessId ? `business:${contextBusinessId}` : 'business:*';

        const appliesTo = config.appliesTo || 'NA';
        return `${rule.ruleType}:${appliesTo}:${businessSegment}`;
    }

    /**
     * Get pricing info for order items
     */
    private async getItemPricing(items: DbOrderItem[]): Promise<Map<string, any>> {
        const productIds = Array.from(new Set(items.map((item) => item.productId)));
        const pricing = new Map();

        for (const productId of productIds) {
            const price = await this.db.query.productPricing.findFirst({
                where: eq(productPricing.productId, productId),
            });

            if (price) {
                pricing.set(productId, price);
            }
        }

        return pricing;
    }

    /**
     * Get active dynamic pricing FIXED_AMOUNT overrides for given business and products
     * Returns a map productId -> overrideAmount (per unit)
     */
    private async getActiveDynamicPricingOverrides(
        businessId: string,
        productIds: string[],
        orderCreatedAt?: string | null,
    ): Promise<Map<string, number>> {
        const rows = await this.db
            .select()
            .from(await import('@/database/schema').then((s) => s.dynamicPricingRules));

        const now = orderCreatedAt ? new Date(orderCreatedAt) : new Date();

        const overrides = new Map<string, number>();

        for (const r of rows) {
            try {
                // Only active rules
                if (!r.isActive) continue;

                // Business scoping: rule.businessId must be null (global) or equal to businessId
                if (r.businessId && r.businessId !== businessId) continue;

                // Validity window
                if (r.validFrom && new Date(r.validFrom) > now) continue;
                if (r.validUntil && new Date(r.validUntil) < now) continue;

                // Only consider FIXED_AMOUNT adjustments that include per-product overrides
                const adj = (r.adjustmentConfig || {}) as any;
                if (adj?.type !== 'FIXED_AMOUNT') continue;
                const ruleOverrides = adj.overrides as Array<{ productId: string; amount: number }> | undefined;
                if (!Array.isArray(ruleOverrides) || ruleOverrides.length === 0) continue;

                // Check appliesTo scope
                const applies = (r.appliesTo || {}) as any;
                const appliesAll = Boolean(applies.allProducts);

                for (const ov of ruleOverrides) {
                    if (!productIds.includes(ov.productId) && !appliesAll) continue;

                    const current = overrides.get(ov.productId) || 0;
                    // Sum overrides when multiple matching rules exist (priority/resolution handled elsewhere)
                    overrides.set(ov.productId, current + Number(ov.amount || 0));
                }
            } catch (err) {
                log.warn({ err, ruleId: r.id }, 'dynamic-pricing:override:parse:error');
                continue;
            }
        }

        return overrides;
    }

    /**
     * Group order items by business ID
     */
    private async groupItemsByBusiness(items: DbOrderItem[]): Promise<Map<string, DbOrderItem[]>> {
        const grouped = new Map<string, DbOrderItem[]>();
        const productIds = Array.from(new Set(items.map((item) => item.productId)));

        // Get business IDs for all products
        const { products: productsTable } = await import('@/database/schema');
        const products = await this.db
            .select({ id: productsTable.id, businessId: productsTable.businessId })
            .from(productsTable)
            .where(inArray(productsTable.id, productIds));

        const businessByProduct = new Map<string, string>(products.map((p: any) => [p.id, p.businessId]));

        // Group items
        for (const item of items) {
            const businessId = businessByProduct.get(item.productId);
            if (!businessId) continue;

            if (!grouped.has(businessId)) {
                grouped.set(businessId, []);
            }
            grouped.get(businessId)!.push(item);
        }

        return grouped;
    }
}
