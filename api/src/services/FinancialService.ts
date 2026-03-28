import { Database } from '@/database';
import { SettlementRepository } from '@/repositories/SettlementRepository';
import { SettlementCalculationEngine } from '@/services/SettlementCalculationEngine';
import { DbOrder, DbOrderItem } from '@/database/schema';
import logger from '@/lib/logger';
import { drivers } from '@/database/schema/drivers';
import { settlements } from '@/database/schema/settlements';
import { eq, sql } from 'drizzle-orm';

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
            const normalizedDriverId = await this.normalizeDriverId(driverId);
            const normalizedItems = Array.isArray(orderItems) ? orderItems : [];

            await this.db.transaction(async (tx) => {
                // Order-scoped advisory transaction lock prevents concurrent settlement creation
                // from duplicate status updates/backfill overlap on the same order.
                await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${order.id}))`);

                const existing = await tx
                    .select({ id: settlements.id })
                    .from(settlements)
                    .where(eq(settlements.orderId, order.id))
                    .limit(1);

                if (existing.length > 0) {
                    log.info({ orderId: order.id }, 'settlements already exist for order');
                    return;
                }

                const calculated = await this.settlementEngine.calculateOrderSettlements(
                    order,
                    normalizedItems,
                    normalizedDriverId,
                );

                for (const settlement of calculated) {
                    await tx
                        .insert(settlements)
                        .values({
                            type: settlement.type,
                            direction: settlement.direction,
                            driverId: settlement.driverId,
                            businessId: settlement.businessId,
                            orderId: settlement.orderId,
                            amount: settlement.amount,
                            status: 'PENDING',
                            ruleId: settlement.ruleId,
                        })
                        // Defensive idempotency: if another path already inserted the same
                        // pending settlement fingerprint, keep this operation as a no-op.
                        .onConflictDoNothing()
                        .execute();
                }

                log.info(
                    {
                        orderId: order.id,
                        settlementCount: calculated.length,
                    },
                    'all order settlements created',
                );
            });
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

    async cancelDriverSettlementsForOrder(orderId: string): Promise<void> {
        try {
            const deleted = await this.settlementRepo.deletePendingByOrderIdForDriver(orderId);
            if (deleted > 0) {
                log.info({ orderId, count: deleted }, 'settlement:cancel:driver:voided');
            }
        } catch (error) {
            log.error({ err: error, orderId }, 'settlement:cancel:driver:error');
            throw error;
        }
    }

    async cancelBusinessSettlementsForOrder(orderId: string): Promise<void> {
        try {
            const deleted = await this.settlementRepo.deletePendingByOrderIdForBusiness(orderId);
            if (deleted > 0) {
                log.info({ orderId, count: deleted }, 'settlement:cancel:business:voided');
            }
        } catch (error) {
            log.error({ err: error, orderId }, 'settlement:cancel:business:error');
            throw error;
        }
    }

    private async normalizeDriverId(driverId: string | null): Promise<string | null> {
        if (!driverId) return null;

        // If already a driver profile id, keep as-is.
        const byDriverId = await this.db
            .select({ id: drivers.id })
            .from(drivers)
            .where(eq(drivers.id, driverId))
            .limit(1);

        if (byDriverId[0]?.id) {
            return byDriverId[0].id;
        }

        // Backward compatibility: caller may pass users.id from orders.driverId.
        const byUserId = await this.db
            .select({ id: drivers.id })
            .from(drivers)
            .where(eq(drivers.userId, driverId))
            .limit(1);

        return byUserId[0]?.id ?? null;
    }
}
