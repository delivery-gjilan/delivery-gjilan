import { type DbType } from '@/database';
import { DbOrder, DbOrderItem, settlementRules, orderPromotions, products } from '@/database/schema';
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
            // 1. Collect business IDs from this order's products
            const productIds = [...new Set(orderItems.map((i) => i.productId))];
            const productRows =
                productIds.length > 0
                    ? await this.db
                          .select({ id: products.id, businessId: products.businessId })
                          .from(products)
                          .where(inArray(products.id, productIds))
                    : [];
            const orderBusinessIds = [...new Set(productRows.map((p) => p.businessId).filter(Boolean))] as string[];

            // 2. Collect promotion IDs applied to this order
            const promoRows = await this.db
                .select({ promotionId: orderPromotions.promotionId })
                .from(orderPromotions)
                .where(eq(orderPromotions.orderId, order.id));
            const orderPromotionIds = promoRows.map((r) => r.promotionId);

            // 3. Fetch all applicable active rules
            const allRules = await this.db
                .select()
                .from(settlementRules)
                .where(
                    and(
                        eq(settlementRules.isActive, true),
                        or(
                            // Global rules
                            and(isNull(settlementRules.businessId), isNull(settlementRules.promotionId)),
                            // Business rules
                            orderBusinessIds.length > 0
                                ? and(
                                      inArray(settlementRules.businessId, orderBusinessIds),
                                      isNull(settlementRules.promotionId),
                                  )
                                : sql`false`,
                            // Promotion rules
                            orderPromotionIds.length > 0
                                ? and(
                                      isNull(settlementRules.businessId),
                                      inArray(settlementRules.promotionId, orderPromotionIds),
                                  )
                                : sql`false`,
                            // Business + Promotion rules
                            orderBusinessIds.length > 0 && orderPromotionIds.length > 0
                                ? and(
                                      inArray(settlementRules.businessId, orderBusinessIds),
                                      inArray(settlementRules.promotionId, orderPromotionIds),
                                  )
                                : sql`false`,
                        ),
                    ),
                );

            // Categorize into buckets for easier priority handling
            const globalRules = allRules.filter((r) => !r.businessId && !r.promotionId);
            const businessRules = allRules.filter((r) => r.businessId && !r.promotionId);
            const promotionRules = allRules.filter((r) => !r.businessId && r.promotionId);
            const businessPromoRules = allRules.filter((r) => r.businessId && r.promotionId);

            console.log('rules', allRules);
            console.log('businessPromoRules', businessPromoRules);
            console.log('promotionRules', promotionRules);
            console.log('businessRules', businessRules);
            console.log('globalRules', globalRules);
            const results: SettlementCalculation[] = [];

            // ── DELIVERY_PRICE selection logic (BP > P > B > G) ──
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

            // ── ORDER_PRICE selection logic (G + B + BP or G + B + P) ──
            const selectedOrderRules: typeof allRules = [
                ...globalRules.filter((r) => r.type === 'ORDER_PRICE'),
                ...businessRules.filter((r) => r.type === 'ORDER_PRICE'),
            ];

            if (businessPromoRules.some((r) => r.type === 'ORDER_PRICE')) {
                selectedOrderRules.push(...businessPromoRules.filter((r) => r.type === 'ORDER_PRICE'));
                // Mutually exclusive: BP rules win over P rules if both exist
            } else {
                selectedOrderRules.push(...promotionRules.filter((r) => r.type === 'ORDER_PRICE'));
            }

            const finalRules = [...selectedDeliveryRules, ...selectedOrderRules];

            for (const rule of finalRules) {
                this.applyRule(rule, order, orderBusinessIds, driverId, results);
            }

            // ── Automatic markup remittance ──
            this.addMarkupSettlement(order, driverId, results);

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

    private addMarkupSettlement(order: DbOrder, driverId: string | null, results: SettlementCalculation[]): void {
        if (!driverId) return;

        const markupPrice = Number(order.markupPrice);
        if (markupPrice <= 0) return;

        results.push({
            type: 'DRIVER',
            direction: 'RECEIVABLE',
            driverId,
            businessId: null,
            orderId: order.id,
            amount: Number(markupPrice.toFixed(2)),
            ruleId: null,
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

        const base = rule.type === 'DELIVERY_PRICE' ? Number(order.originalDeliveryPrice) : Number(order.actualPrice);

        const amount = rule.amountType === 'FIXED' ? Number(rule.amount) : (base * Number(rule.amount)) / 100;

        if (amount <= 0) return;

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
            });
        }
    }
}
