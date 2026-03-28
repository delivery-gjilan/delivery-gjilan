import { type DbType } from '@/database';
import {
    DbOrder,
    DbOrderItem,
    settlementRules,
    orderPromotions,
    products,
} from '@/database/schema';
import { eq, and, or, inArray, isNull } from 'drizzle-orm';
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

function calculateMarkupEarnings(orderItems: DbOrderItem[]): number {
    const total = orderItems.reduce((sum, item) => {
        const basePrice = Number(item.basePrice ?? 0);
        const finalAppliedPrice = Number(item.finalAppliedPrice ?? 0);
        const perUnitMarkup = Math.max(0, finalAppliedPrice - basePrice);
        return sum + perUnitMarkup * item.quantity;
    }, 0);

    return Number(total.toFixed(2));
}

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
            const productRows = productIds.length > 0
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
            const rules = await this.db
                .select()
                .from(settlementRules)
                .where(
                    and(
                        eq(settlementRules.isActive, true),
                        orderBusinessIds.length > 0
                            ? or(isNull(settlementRules.businessId), inArray(settlementRules.businessId, orderBusinessIds))
                            : isNull(settlementRules.businessId),
                        orderPromotionIds.length > 0
                            ? or(isNull(settlementRules.promotionId), inArray(settlementRules.promotionId, orderPromotionIds))
                            : isNull(settlementRules.promotionId),
                    ),
                );

            // 4. One settlement per rule
            const results: SettlementCalculation[] = [];

            for (const rule of rules) {
                if (rule.entityType === 'DRIVER' && !driverId) continue;

                const base =
                    rule.appliesTo === 'DELIVERY_FEE'
                        ? Number(order.deliveryPrice)
                        : Number(order.price);

                const amount =
                    rule.amountType === 'FIXED'
                        ? Number(rule.amount)
                        : (base * Number(rule.amount)) / 100;

                if (amount <= 0) continue;

                if (rule.entityType === 'BUSINESS') {
                    const targetBusinessIds = rule.businessId ? [rule.businessId] : orderBusinessIds;
                    for (const bizId of targetBusinessIds) {
                        results.push({
                            type: 'BUSINESS',
                            direction: rule.direction,
                            driverId: null,
                            businessId: bizId,
                            orderId: order.id,
                            amount,
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
                        amount,
                        ruleId: rule.id,
                    });
                }
            }

            // Automatic markup remittance only applies when the driver
            // physically collects cash from the customer.
            if (driverId && order.paymentCollection === 'CASH_TO_DRIVER') {
                const markupEarnings = calculateMarkupEarnings(orderItems);
                if (markupEarnings > 0) {
                    results.push({
                        type: 'DRIVER',
                        direction: 'RECEIVABLE',
                        driverId,
                        businessId: null,
                        orderId: order.id,
                        amount: markupEarnings,
                        ruleId: null,
                    });
                }
            }

            log.info(
                {
                    orderId: order.id,
                    settlementsCount: results.length,
                    rulesMatched: rules.length,
                    hasAutoMarkupSettlement: results.some((s) => s.ruleId === null && s.type === 'DRIVER'),
                },
                'settlement:calculated',
            );

            return results;
        } catch (error) {
            log.error({ err: error, orderId: order.id }, 'settlement:calculate:error');
            throw error;
        }
    }
}
