import { getDB, type DbType } from '@/database';
import {
    DbOrder,
    DbOrderItem,
    DbSettlementRule,
    settlementRules,
    productPricing,
    drivers,
    NewDbSettlement
} from '@/database/schema';
import { eq, and, inArray } from 'drizzle-orm';
import logger from '@/lib/logger';
import { PricingService } from './PricingService';

const log = logger.child({ service: 'SettlementCalculationEngine' });

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
        driverId: string | null
    ): Promise<SettlementCalculation[]> {
        const settlements: SettlementCalculation[] = [];

        try {
            // Group items by business
            const itemsByBusiness = await this.groupItemsByBusiness(orderItems);

            // Calculate settlement for each business
            for (const [businessId, items] of itemsByBusiness.entries()) {
                const businessSettlement = await this.calculateBusinessSettlement(
                    order,
                    businessId,
                    items
                );
                
                if (businessSettlement) {
                    settlements.push(businessSettlement);
                }
            }

            // Calculate driver settlement
            if (driverId) {
                const driverSettlement = await this.calculateDriverSettlement(
                    order,
                    driverId
                );
                
                if (driverSettlement) {
                    settlements.push(driverSettlement);
                }
            }

            log.info({
                orderId: order.id,
                settlementsCount: settlements.length,
                totalReceivable: settlements
                    .filter(s => s.direction === 'RECEIVABLE')
                    .reduce((sum, s) => sum + s.amount, 0),
                totalPayable: settlements
                    .filter(s => s.direction === 'PAYABLE')
                    .reduce((sum, s) => sum + s.amount, 0)
            }, 'settlement:calculated');

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
        items: DbOrderItem[]
    ): Promise<SettlementCalculation | null> {
        // Get active rules for this business
        const rules = await this.getActiveRules('BUSINESS', businessId);

        if (rules.length === 0) {
            log.debug({ businessId, orderId: order.id }, 'settlement:business:no-rules');
            return null;
        }

        // Get pricing info for all items
        const itemPricing = await this.getItemPricing(items);

        // Build items breakdown
        const itemsBreakdown = items.map(item => {
            const pricing = itemPricing.get(item.productId);
            if (!pricing) {
                throw new Error(`No pricing found for product ${item.productId}`);
            }

            const businessPrice = Number(pricing.businessPrice);
            const platformMarkup = Number(pricing.platformMarkup);
            const customerPrice = businessPrice + platformMarkup; // Settlement based on base, not dynamic

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
                totalCustomerPaid: customerPrice * item.quantity
            };
        });

        // Calculate business subtotal (what business receives)
        const businessSubtotal = itemsBreakdown.reduce(
            (sum, item) => sum + item.totalBusinessRevenue,
            0
        );

        // Calculate total platform markup from products
        const productMarkupTotal = itemsBreakdown.reduce(
            (sum, item) => sum + item.totalPlatformMarkup,
            0
        );

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
                direction: 'RECEIVABLE'
            });
            totalAmount += productMarkupTotal;
        }

        // Apply other rules
        for (const rule of rules) {
            if (rule.ruleType === 'PRODUCT_MARKUP') continue; // Already handled

            const ruleResult = await this.applyRule(rule, {
                orderSubtotal: businessSubtotal,
                deliveryFee: order.deliveryPrice,
                itemCount: items.length
            });

            if (ruleResult.amount !== 0) {
                rulesApplied.push(ruleResult);
                totalAmount += ruleResult.amount;
            }
        }

        // Build rule snapshot
        const ruleSnapshot = {
            appliedRules: rules.map(rule => ({
                ruleId: rule.id,
                ruleType: rule.ruleType,
                config: rule.config,
                activeSince: rule.activatedAt,
                capturedAt: new Date().toISOString()
            }))
        };

        // Build calculation details
        const calculationDetails = {
            orderSubtotal: businessSubtotal,
            itemsBreakdown,
            rulesApplied,
            totalReceivable: totalAmount,
            totalPayable: 0,
            netAmount: totalAmount,
            currency: 'EUR'
        };

        return {
            type: 'BUSINESS',
            direction: 'RECEIVABLE',
            entityId: businessId,
            orderId: order.id,
            amount: Number(totalAmount.toFixed(2)),
            ruleSnapshot,
            calculationDetails
        };
    }

    /**
     * Calculate settlement for a driver
     */
    private async calculateDriverSettlement(
        order: DbOrder,
        driverUserId: string
    ): Promise<SettlementCalculation | null> {
        // Get driver record
        const driver = await this.db.query.drivers.findFirst({
            where: eq(drivers.userId, driverUserId)
        });

        if (!driver) {
            log.warn({ driverUserId, orderId: order.id }, 'settlement:driver:not-found');
            return null;
        }

        // Check for free delivery coupon
        const orderMetadata = (order as any).metadata || {};
        const hasFreeDelivery = orderMetadata.freeDeliveryCoupon;

        if (hasFreeDelivery) {
            // Platform pays driver their commission portion
            return this.calculateFreeDeliverySettlement(order, driver.id, driverUserId);
        }

        // Normal settlement - get active rules
        const rules = await this.getActiveRules('DRIVER', driver.id);

        if (rules.length === 0) {
            log.debug({ driverId: driver.id, orderId: order.id }, 'settlement:driver:no-rules');
            return null;
        }

        // Apply rules
        const rulesApplied: any[] = [];
        let totalAmount = 0;

        for (const rule of rules) {
            const ruleResult = await this.applyRule(rule, {
                deliveryFee: order.deliveryPrice,
                orderSubtotal: order.price,
                hasOwnVehicle: orderMetadata?.driverHasOwnVehicle || false
            });

            if (ruleResult.amount !== 0) {
                rulesApplied.push(ruleResult);
                totalAmount += ruleResult.amount;
            }
        }

        if (totalAmount === 0) {
            return null;
        }

        const ruleSnapshot = {
            appliedRules: rules.map(rule => ({
                ruleId: rule.id,
                ruleType: rule.ruleType,
                config: rule.config,
                activeSince: rule.activatedAt,
                capturedAt: new Date().toISOString()
            }))
        };

        const calculationDetails = {
            deliveryFee: order.deliveryPrice,
            rulesApplied,
            totalReceivable: totalAmount,
            totalPayable: 0,
            netAmount: totalAmount,
            currency: 'EUR'
        };

        return {
            type: 'DRIVER',
            direction: 'RECEIVABLE',
            entityId: driver.id,
            orderId: order.id,
            amount: Number(totalAmount.toFixed(2)),
            ruleSnapshot,
            calculationDetails
        };
    }

    /**
     * Calculate driver settlement for free delivery orders
     * Platform pays driver their commission portion
     */
    private async calculateFreeDeliverySettlement(
        order: DbOrder,
        driverId: string,
        driverUserId: string
    ): Promise<SettlementCalculation> {
        // Get driver's commission rate
        const rules = await this.getActiveRules('DRIVER', driverId);
        const percentageRule = rules.find(r => r.ruleType === 'PERCENTAGE');

        if (!percentageRule) {
            throw new Error(`Driver ${driverId} has no percentage rule for free delivery`);
        }

        const commissionRate = (percentageRule.config as any).percentage / 100;
        const originalDeliveryFee = order.deliveryPrice; // This would be calculated based on distance
        const platformPaysDriver = originalDeliveryFee * commissionRate;

        const orderMetadata = (order as any).metadata || {};
        const metadata = {
            couponApplied: {
                code: orderMetadata?.couponCode || 'UNKNOWN',
                type: 'FREE_DELIVERY',
                originalDeliveryFee,
                driverCommissionRate: commissionRate,
                platformPaysDriver
            }
        };

        const calculationDetails = {
            deliveryFee: originalDeliveryFee,
            rulesApplied: [{
                ruleType: 'FREE_DELIVERY_COMPENSATION',
                description: 'Platform pays driver commission for free delivery',
                baseAmount: originalDeliveryFee,
                percentage: (percentageRule.config as any).percentage,
                amount: platformPaysDriver,
                direction: 'PAYABLE'
            }],
            totalReceivable: 0,
            totalPayable: platformPaysDriver,
            netAmount: -platformPaysDriver, // Negative because we owe
            currency: 'EUR'
        };

        const ruleSnapshot = {
            appliedRules: [{
                ruleId: percentageRule.id,
                ruleType: percentageRule.ruleType,
                config: percentageRule.config,
                activeSince: percentageRule.activatedAt,
                capturedAt: new Date().toISOString()
            }]
        };

        return {
            type: 'DRIVER',
            direction: 'PAYABLE', // We owe the driver
            entityId: driverId,
            orderId: order.id,
            amount: Number(platformPaysDriver.toFixed(2)),
            ruleSnapshot,
            calculationDetails,
            metadata
        };
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
        }
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
                    direction: 'RECEIVABLE'
                };
            }

            case 'FIXED_PER_ORDER': {
                return {
                    ruleType: 'FIXED_PER_ORDER',
                    description: config.description || 'Fixed fee per order',
                    amount: config.amount,
                    direction: 'RECEIVABLE'
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
                    direction: 'PAYABLE' // We pay driver a bonus
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
        entityId: string
    ): Promise<DbSettlementRule[]> {
        const rules = await this.db
            .select()
            .from(settlementRules)
            .where(
                and(
                    eq(settlementRules.entityType, entityType as any),
                    eq(settlementRules.entityId, entityId),
                    eq(settlementRules.isActive, true)
                )
            )
            .orderBy(settlementRules.priority);

        return rules;
    }

    /**
     * Get pricing info for order items
     */
    private async getItemPricing(items: DbOrderItem[]): Promise<Map<string, any>> {
        const productIds = Array.from(new Set(items.map(item => item.productId)));
        const pricing = new Map();

        for (const productId of productIds) {
            const price = await this.db.query.productPricing.findFirst({
                where: eq(productPricing.productId, productId)
            });

            if (price) {
                pricing.set(productId, price);
            }
        }

        return pricing;
    }

    /**
     * Group order items by business ID
     */
    private async groupItemsByBusiness(items: DbOrderItem[]): Promise<Map<string, DbOrderItem[]>> {
        const grouped = new Map<string, DbOrderItem[]>();
        const productIds = Array.from(new Set(items.map(item => item.productId)));

        // Get business IDs for all products
        const { products: productsTable } = await import('@/database/schema');
        const products = await this.db
            .select({ id: productsTable.id, businessId: productsTable.businessId })
            .from(productsTable)
            .where(inArray(productsTable.id, productIds));

        const businessByProduct = new Map<string, string>(
            products.map((p: any) => [p.id, p.businessId])
        );

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
