import { type DbType } from '@/database';
import { DbOrder, DbOrderItem, settlementRules, orderPromotions, products, drivers } from '@/database/schema';
import { eq, and, or, inArray, isNull, sql } from 'drizzle-orm';
import logger from '@/lib/logger';

const log = logger.child({ service: 'SettlementCalculationEngine' });

type Database = DbType;

export interface SettlementCalculation {
    type: 'DRIVER' | 'BUSINESS';
    direction: 'RECEIVABLE' | 'PAYABLE';
    driverId: string | null;
    businessId: string | null;
    orderId: string;
    amount: number;
    ruleId: string | null;
    reason: string;
}

type DbSettlementRule = typeof settlementRules.$inferSelect;

export class SettlementCalculationEngine {
    constructor(private db: Database) {}

    async calculateOrderSettlements(
        order: DbOrder,
        orderItems: DbOrderItem[],
        driverId: string | null,
    ): Promise<SettlementCalculation[]> {
        try {
            // ── Step 1: Collect business IDs from this order's products ──
            const productIds = [...new Set(orderItems.map((i) => i.productId))];
            const productRows =
                productIds.length > 0
                    ? await this.db
                          .select({ id: products.id, businessId: products.businessId })
                          .from(products)
                          .where(inArray(products.id, productIds))
                    : [];
            const orderBusinessIds = [...new Set(productRows.map((p) => p.businessId).filter(Boolean))] as string[];

            // ── Step 2: Collect promotion IDs applied to this order ──
            const promoRows = await this.db
                .select({ promotionId: orderPromotions.promotionId })
                .from(orderPromotions)
                .where(eq(orderPromotions.orderId, order.id));
            const orderPromotionIds = promoRows.map((r) => r.promotionId);

            // ── Step 3: Fetch all active, applicable settlement rules ──
            const allRules = await this.db
                .select()
                .from(settlementRules)
                .where(
                    and(
                        eq(settlementRules.isActive, true),
                        eq(settlementRules.isDeleted, false),
                        or(
                            // Global rules (no business, no promotion scoping)
                            and(isNull(settlementRules.businessId), isNull(settlementRules.promotionId)),
                            // Business-scoped rules
                            orderBusinessIds.length > 0
                                ? and(
                                      inArray(settlementRules.businessId, orderBusinessIds),
                                      isNull(settlementRules.promotionId),
                                  )
                                : sql`false`,
                            // Promotion-scoped rules
                            orderPromotionIds.length > 0
                                ? and(
                                      isNull(settlementRules.businessId),
                                      inArray(settlementRules.promotionId, orderPromotionIds),
                                  )
                                : sql`false`,
                            // Business + Promotion combo rules (most specific)
                            orderBusinessIds.length > 0 && orderPromotionIds.length > 0
                                ? and(
                                      inArray(settlementRules.businessId, orderBusinessIds),
                                      inArray(settlementRules.promotionId, orderPromotionIds),
                                  )
                                : sql`false`,
                        ),
                    ),
                );

            // Categorize rules by specificity bucket
            const globalRules        = allRules.filter((r) => !r.businessId && !r.promotionId);
            const businessRules      = allRules.filter((r) =>  r.businessId && !r.promotionId);
            const promotionRules     = allRules.filter((r) => !r.businessId &&  r.promotionId);
            const businessPromoRules = allRules.filter((r) =>  r.businessId &&  r.promotionId);

            console.log("potential rules:")
            console.log("global rules:", globalRules);
            console.log("business rules:", businessRules);
            console.log("promotion rules:", promotionRules);
            console.log("business + promotion rules:", businessPromoRules);

            const results: SettlementCalculation[] = [];

            // ── Automatic: markup remittance (CASH_TO_DRIVER only) ──
            // Driver collected the marked-up cash from the customer and must remit
            // the platform's markup margin back to the platform.
            this.addMarkupSettlement(order, driverId, results);

            // ── Automatic: priority surcharge remittance (CASH_TO_DRIVER only) ──
            // Driver collected the priority surcharge cash and must remit it.
            this.addPrioritySurchargeSettlement(order, driverId, results);

            // ── Delivery fee rules (most-specific-wins: BP > P > B > G) ──
            // If no rules at any level, fall back to the driver's own commission %.
            let selectedDeliveryRules: typeof allRules = [];
            if (businessPromoRules.some((r) => r.type === 'DELIVERY_PRICE')) {
                selectedDeliveryRules = businessPromoRules.filter((r) => r.type === 'DELIVERY_PRICE');
            } else if (promotionRules.some((r) => r.type === 'DELIVERY_PRICE')) {
                selectedDeliveryRules = promotionRules.filter((r) => r.type === 'DELIVERY_PRICE');
            } else if (businessRules.some((r) => r.type === 'DELIVERY_PRICE')) {
                selectedDeliveryRules = businessRules.filter((r) => r.type === 'DELIVERY_PRICE');
            } else {
                selectedDeliveryRules = globalRules.filter((r) => r.type === 'DELIVERY_PRICE');
            }

            if (selectedDeliveryRules.length > 0) {
                console.log("selected delivery rules:", selectedDeliveryRules);
                for (const rule of selectedDeliveryRules) {
                    this.applyRule(rule, order, orderBusinessIds, driverId, results);
                }
            } else {
                console.log("no delivery price rules found, applying driver commission fallback");
                // Fallback: use the driver's individual commission rate applied to
                // the actual delivery price (excluding priority surcharge).
                await this.addDriverCommissionFallback(order, driverId, results);
            }

            // ── Order price rules (additive: G + B always; then at most one of BP or P) ──
            const selectedOrderRules: typeof allRules = [
                ...globalRules.filter((r)   => r.type === 'ORDER_PRICE'),
                ...businessRules.filter((r) => r.type === 'ORDER_PRICE'),
            ];
            // BP and P are mutually exclusive: BP wins if any BP rules exist
            if (businessPromoRules.some((r) => r.type === 'ORDER_PRICE')) {
                selectedOrderRules.push(...businessPromoRules.filter((r) => r.type === 'ORDER_PRICE'));
            } else {
                selectedOrderRules.push(...promotionRules.filter((r) => r.type === 'ORDER_PRICE'));
            }

            console.log("selected order price rules:", selectedOrderRules);
            for (const rule of selectedOrderRules) {
                
                this.applyRule(rule, order, orderBusinessIds, driverId, results);
            }

            log.info(
                {
                    orderId: order.id,
                    settlementsCount: results.length,
                    rulesMatched: allRules.length,
                    deliveryRulesCount: selectedDeliveryRules.length,
                    orderPriceRulesCount: selectedOrderRules.length,
                },
                'settlement:calculated',
            );

            return results;
        } catch (error) {
            log.error({ err: error, orderId: order.id }, 'settlement:calculate:error');
            throw error;
        }
    }

    /**
     * Automatic markup remittance: driver owes the platform the markup amount
     * they collected in cash from the customer.
     * Only applies to CASH_TO_DRIVER orders — for PREPAID_TO_PLATFORM the
     * platform already collected the full amount directly from the customer.
     */
    private addMarkupSettlement(order: DbOrder, driverId: string | null, results: SettlementCalculation[]): void {
        if (!driverId) return;
        if (order.paymentCollection !== 'CASH_TO_DRIVER') return;

        const markupPrice = Number(order.markupPrice ?? 0);
        if (markupPrice <= 0) return;

        results.push({
            type: 'DRIVER',
            direction: 'RECEIVABLE',
            driverId,
            businessId: null,
            orderId: order.id,
            amount: Number(markupPrice.toFixed(2)),
            ruleId: null,
            reason: `Markup remittance (€${markupPrice.toFixed(2)} cash collected)`,
        });
    }

    /**
     * Automatic priority surcharge remittance: driver owes the platform the
     * priority fee they collected in cash.
     * Only applies to CASH_TO_DRIVER orders.
     */
    private addPrioritySurchargeSettlement(order: DbOrder, driverId: string | null, results: SettlementCalculation[]): void {
        if (!driverId) return;
        if (order.paymentCollection !== 'CASH_TO_DRIVER') return;

        const prioritySurcharge = Number(order.prioritySurcharge ?? 0);
        if (prioritySurcharge <= 0) return;

        results.push({
            type: 'DRIVER',
            direction: 'RECEIVABLE',
            driverId,
            businessId: null,
            orderId: order.id,
            amount: Number(prioritySurcharge.toFixed(2)),
            ruleId: null,
            reason: `Priority surcharge remittance (€${prioritySurcharge.toFixed(2)} cash collected)`,
        });
    }

    /**
     * Fallback driver delivery commission: used when no DELIVERY_PRICE settlement
     * rules are configured.  Reads the driver's individual commission rate from
     * the drivers table and creates a DRIVER RECEIVABLE for their share of the
     * final delivery fee.
     */
    private async addDriverCommissionFallback(
        order: DbOrder,
        driverId: string | null,
        results: SettlementCalculation[],
    ): Promise<void> {
        if (!driverId) return;

        const deliveryPrice = Number(order.deliveryPrice ?? 0);
        if (deliveryPrice <= 0) return;

        const [driverRow] = await this.db
            .select({ commissionPercentage: drivers.commissionPercentage })
            .from(drivers)
            .where(eq(drivers.id, driverId))
            .limit(1);

        const commission = Number(driverRow?.commissionPercentage ?? 0);
        if (commission <= 0) return;

        const amount = Number(((deliveryPrice * commission) / 100).toFixed(2));
        if (amount <= 0) return;

        results.push({
            type: 'DRIVER',
            direction: 'RECEIVABLE',
            driverId,
            businessId: null,
            orderId: order.id,
            amount,
            ruleId: null,
            reason: `Driver delivery commission (${commission}% of €${deliveryPrice.toFixed(2)})`,
        });
    }

    private applyRule(
        rule: DbSettlementRule,
        order: DbOrder,
        orderBusinessIds: string[],
        driverId: string | null,
        results: SettlementCalculation[],
    ): void {
        if (rule.entityType === 'DRIVER' && !driverId) return;

        // Base selection:
        //   DELIVERY_PRICE rules → the post-promotion delivery fee (excl. priority surcharge)
        //   ORDER_PRICE / BUSINESS → businessPrice (what the business actually earns after
        //                            business-funded discounts; falls back to basePrice)
        //   ORDER_PRICE / DRIVER   → actualPrice (what the customer paid for items)
        let base: number;
        if (rule.type === 'DELIVERY_PRICE') {
            base = Number(order.deliveryPrice ?? order.originalDeliveryPrice ?? 0);
        } else if (rule.entityType === 'BUSINESS') {
            // businessPrice: what the business actually earns (may be < basePrice when
            // the business has funded a promotion discount on their products)
            base = Number(order.businessPrice ?? order.basePrice ?? order.actualPrice ?? 0);
        } else {
            base = Number(order.actualPrice ?? 0);
        }

        let amount = rule.amountType === 'FIXED'
            ? Number(rule.amount)
            : (base * Number(rule.amount)) / 100;

        // For PERCENT rules: cap at maxAmount if configured
        if (rule.amountType === 'PERCENT' && rule.maxAmount != null) {
            const cap = Number(rule.maxAmount);
            if (cap > 0 && amount > cap) {
                amount = cap;
            }
        }

        if (amount <= 0) return;

        const ruleLabel = rule.amountType === 'FIXED'
            ? `€${Number(rule.amount).toFixed(2)} fixed`
            : `${Number(rule.amount)}% of €${base.toFixed(2)}`;
        const typeLabel = rule.type === 'DELIVERY_PRICE' ? 'delivery fee' : 'order price';
        const dirLabel = rule.direction === 'RECEIVABLE' ? 'receivable' : 'payable';

        if (rule.entityType === 'BUSINESS') {
            const targetBusinessIds = rule.businessId ? [rule.businessId] : orderBusinessIds;
            for (const bizId of targetBusinessIds) {
                results.push({
                    type: 'BUSINESS',
                    direction: rule.direction,
                    driverId: null,
                    businessId: bizId,
                    orderId: order.id,
                    amount: Number(amount.toFixed(2)),
                    ruleId: rule.id,
                    reason: `Business ${dirLabel} on ${typeLabel} (${ruleLabel})`,
                });
            }
        } else {
            results.push({
                type: 'DRIVER',
                direction: rule.direction,
                driverId,
                businessId: null,
                orderId: order.id,
                amount: Number(amount.toFixed(2)),
                ruleId: rule.id,
                reason: `Driver ${dirLabel} on ${typeLabel} (${ruleLabel})`,
            });
        }
    }
}
