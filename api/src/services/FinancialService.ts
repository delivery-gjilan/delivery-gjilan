import { Database } from '@/database';
import { SettlementRepository } from '@/repositories/SettlementRepository';
import { BusinessRepository } from '@/repositories/BusinessRepository';
import { DriverRepository } from '@/repositories/DriverRepository';
import { SettlementCalculationEngine } from '@/services/SettlementCalculationEngine';
import { DbOrder, DbOrderItem, products as productsTable } from '@/database/schema';
import { inArray } from 'drizzle-orm';
import logger from '@/lib/logger';
import { AppError } from '@/lib/errors';

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

            // Group items by business for calculation
            const itemsByBusiness = await this.groupItemsByBusiness(orderItems);

            // Calculate settlements for each business using the engine
            for (const [businessId, items] of itemsByBusiness.entries()) {
                const businessSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                
                const result = await this.settlementEngine.calculateOrderSettlements(
                    order.id,
                    businessId,
                    'BUSINESS',
                    businessSubtotal,
                    order
                );

                // Create settlement records for each result
                for (const settlement of result.settlements) {
                    await this.settlementRepo.createSettlement(
                        'BUSINESS_PAYMENT',
                        null,
                        businessId,
                        order.id,
                        settlement.amount,
                        settlement.direction,
                        settlement.ruleSnapshot,
                        settlement.calculationDetails
                    );
                }

                log.info({
                    businessId,
                    totalAmount: result.totalAmount,
                    settlementCount: result.settlements.length
                }, 'business settlements created');
            }

            // Calculate driver settlement if there's a driver
            if (driverId && order.deliveryPrice > 0) {
                const driverRepo = new DriverRepository(this.db);
                const driver =
                    (await driverRepo.getDriverByUserId(driverId)) ||
                    (await driverRepo.createDriver(driverId));

                if (driver?.id) {
                    const result = await this.settlementEngine.calculateOrderSettlements(
                        order.id,
                        driver.id,
                        'DRIVER',
                        order.deliveryPrice,
                        order
                    );

                    // Create settlement records for each result
                    for (const settlement of result.settlements) {
                        await this.settlementRepo.createSettlement(
                            'DRIVER_PAYMENT',
                            driver.id,
                            null,
                            order.id,
                            settlement.amount,
                            settlement.direction,
                            settlement.ruleSnapshot,
                            settlement.calculationDetails
                        );
                    }

                    log.info({
                        driverId: driver.id,
                        totalAmount: result.totalAmount,
                        settlementCount: result.settlements.length
                    }, 'driver settlements created');
                }
            }

            log.info({ orderId: order.id }, 'all order settlements created');
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

    /**
     * Group order items by business ID
     */
    private async groupItemsByBusiness(items: DbOrderItem[]): Promise<Map<string, DbOrderItem[]>> {
        const grouped = new Map<string, DbOrderItem[]>();

        const productIds = Array.from(new Set(items.map((item) => item.productId)));
        if (productIds.length === 0) {
            return grouped;
        }

        const products = await this.db
            .select({ id: productsTable.id, businessId: productsTable.businessId })
            .from(productsTable)
            .where(inArray(productsTable.id, productIds));

        const businessByProductId = new Map(products.map((product) => [product.id, product.businessId]));

        for (const item of items) {
            const businessId = businessByProductId.get(item.productId);
            if (!businessId) {
                continue;
            }
            if (!grouped.has(businessId)) {
                grouped.set(businessId, []);
            }
            grouped.get(businessId)!.push(item);
        }

        return grouped;
    }

    /**
     * Update driver commission percentage
     */
    async updateDriverCommission(driverId: string, percentage: number): Promise<void> {
        if (percentage < 0 || percentage > 100) {
            throw AppError.badInput('Commission percentage must be between 0 and 100');
        }

        // Implementation would update driver's commission percentage
    }

    /**
     * Update business commission percentage
     */
    async updateBusinessCommission(businessId: string, percentage: number): Promise<void> {
        if (percentage < 0 || percentage > 100) {
            throw AppError.badInput('Commission percentage must be between 0 and 100');
        }

        // Implementation would update business's commission percentage
    }
}
