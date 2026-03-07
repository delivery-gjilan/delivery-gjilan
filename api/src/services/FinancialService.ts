// @ts-nocheck
import { Database } from '@/database';
import { SettlementRepository } from '@/repositories/SettlementRepository';
import { BusinessRepository } from '@/repositories/BusinessRepository';
import { DriverRepository } from '@/repositories/DriverRepository';
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
 * 2. For each business: calculate their commission
 * 3. For driver: market earns commission from delivery fee
 * 4. Market earns commission from business order subtotal
 */
export class FinancialService {
    private settlementRepo: SettlementRepository;

    constructor(private db: Database) {
        this.settlementRepo = new SettlementRepository(db);
    }

    /**
     * Create settlements after an order is completed
     * 
    * Business Settlements: Market earns commission from business order subtotal
    * Driver Settlement: Market earns commission from driver delivery fee
     */
    async createOrderSettlements(
        order: DbOrder,
        orderItems: DbOrderItem[],
        driverId: string | null,
    ): Promise<void> {
        try {
            const existing = await this.settlementRepo.getSettlements({ orderId: order.id });
            if (existing.length > 0) {
                return;
            }

            // Group items by business to calculate per-business settlements
            const itemsByBusiness = await this.groupItemsByBusiness(orderItems);

            // Create business settlements
            for (const [businessId, items] of itemsByBusiness.entries()) {
                const businessSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                
                // Get business commission percentage
                const business = await new BusinessRepository(this.db).findById(businessId);
                const commissionPercentage = business?.commissionPercentage ? parseFloat(business.commissionPercentage.toString()) : 0;

                // Calculate market commission from business subtotal
                const businessAmount = businessSubtotal * (commissionPercentage / 100);

                // Create settlement record for business
                if (businessAmount > 0) {
                    await this.settlementRepo.createSettlement(
                        'BUSINESS_PAYMENT',
                        null,
                        businessId,
                        order.id,
                        businessAmount,
                    );
                }
            }

            // Create driver settlement - commission from delivery fee
            if (driverId) {
                const driverRepo = new DriverRepository(this.db);
                const driver =
                    (await driverRepo.getDriverByUserId(driverId)) ||
                    (await driverRepo.createDriver(driverId));
                const driverCommissionPercentage = driver?.commissionPercentage
                    ? parseFloat(driver.commissionPercentage.toString())
                    : 0;
                const driverAmount = order.deliveryPrice * (driverCommissionPercentage / 100);

                if (driverAmount > 0 && driver?.id) {
                    await this.settlementRepo.createSettlement(
                        'DRIVER_PAYMENT',
                        driver.id,
                        null,
                        order.id,
                        driverAmount,
                    );
                }
            }
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
