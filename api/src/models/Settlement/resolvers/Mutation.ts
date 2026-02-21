import { MutationResolvers } from '@/generated/types.generated';
import { AppContext } from '@/index';
import logger from '@/lib/logger';
import { SettlementRepository } from '@/repositories/SettlementRepository';
import { FinancialService } from '@/services/FinancialService';
import { eq } from 'drizzle-orm';
import { drivers, businesses, orderItems as orderItemsTable } from '@/database/schema';

export const Mutation: MutationResolvers<AppContext> = {
    markSettlementAsPaid: async (_, { settlementId }, { db }) => {
        const repo = new SettlementRepository(db);
        return repo.markAsPaid(settlementId);
    },

    markSettlementsAsPaid: async (_, { ids }, { db }) => {
        const repo = new SettlementRepository(db);
        return repo.markMultipleAsPaid(ids);
    },

    updateCommissionPercentage: async (_, { driverId, businessId, percentage }, { db }) => {
        if (!driverId && !businessId) {
            throw new Error('Must provide either driverId or businessId');
        }

        if (percentage < 0 || percentage > 100) {
            throw new Error('Percentage must be between 0 and 100');
        }

        try {
                if (driverId) {
                await db
                    .update(drivers)
                    .set({ commissionPercentage: percentage.toString() })
                    .where(eq(drivers.userId, driverId))
                    .execute();
            }

            if (businessId) {
                await db
                    .update(businesses)
                    .set({ commissionPercentage: percentage.toString() })
                    .where(eq(businesses.id, businessId))
                    .execute();
            }

            return true;
        } catch (error) {
            throw new Error(`Failed to update commission percentage: ${error}`);
        }
    },
    backfillSettlementsForDeliveredOrders: async (_, __, { db, orderService }) => {
        if (!orderService) {
            logger.error('settlement:backfillSettlements orderService missing from context');
            return 0;
        }

        const orders = await orderService.orderRepository.findByStatus('DELIVERED');
        const financialService = new FinancialService(db);
        let processed = 0;

        for (const order of orders) {
            try {
                const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
                await financialService.createOrderSettlements(order, items, order.driverId);
                processed += 1;
            } catch (error) {
                logger.error({ err: error, orderId: order.id }, 'settlement:backfillSettlements failed for order');
            }
        }

        return processed;
    },

    unsettleSettlement: async (_, { settlementId }, { db }) => {
        const repo = new SettlementRepository(db);
        return repo.unsettleSettlement(settlementId);
    },
};
