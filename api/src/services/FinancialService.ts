import { Database } from '@/database';
import { SettlementRepository } from '@/repositories/SettlementRepository';
import { SettlementCalculationEngine } from '@/services/SettlementCalculationEngine';
import { DbOrder, DbOrderItem } from '@/database/schema';
import logger from '@/lib/logger';

const log = logger.child({ service: 'FinancialService' });

/**
 * FinancialService handles all commission and settlement calculations
 * 
 * Flow:
 * 1. Order created with total price
 * 2. Use SettlementCalculationEngine to calculate settlements based on rules
 * 3. Store settlements with full audit trail
 */
export class FinancialService {
    private settlementRepo: SettlementRepository;
    private settlementEngine: SettlementCalculationEngine;

    constructor(private db: Database) {
        this.settlementRepo = new SettlementRepository(db);
        this.settlementEngine = new SettlementCalculationEngine(db);
    }

    /**
     * Create settlements after an order is completed
     * Uses the SettlementCalculationEngine to apply all active rules
     */
    async createOrderSettlements(
        order: DbOrder,
        orderItems: DbOrderItem[],
        driverId: string | null,
    ): Promise<void> {
        try {
            // Check if settlements already exist for this order
            const existing = await this.settlementRepo.getSettlements({ orderId: order.id });
            if (existing.length > 0) {
                log.info({ orderId: order.id }, 'settlements already exist for order');
                return;
            }

            const normalizedItems = Array.isArray(orderItems) ? orderItems : [];
            const calculated = await this.settlementEngine.calculateOrderSettlements(
                order,
                normalizedItems,
                driverId,
            );

            for (const settlement of calculated) {
                await this.settlementRepo.createSettlement(
                    settlement.type,
                    settlement.driverId,
                    settlement.businessId,
                    settlement.orderId,
                    settlement.amount,
                    settlement.direction,
                    settlement.ruleId,
                );
            }

            log.info({
                orderId: order.id,
                settlementCount: calculated.length,
            }, 'all order settlements created');
        } catch (error) {
            log.error({ err: error, orderId: order.id }, 'settlement:create:error');
            throw error;
        }
    }

    /**
     * Cancel settlements when order is cancelled.
     * Deletes all PENDING settlements for the order (PAID settlements are left intact
     * since money has already been disbursed and must be handled manually).
     */
    async cancelOrderSettlements(orderId: string): Promise<void> {
        try {
            const deleted = await this.settlementRepo.deletePendingByOrderId(orderId);
            if (deleted > 0) {
                log.info({ orderId, count: deleted }, 'settlement:cancel:voided');
            }
        } catch (error) {
            log.error({ err: error, orderId }, 'settlement:cancel:error');
            throw error;
        }
    }
}
