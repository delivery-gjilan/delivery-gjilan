
        import type { MutationResolvers } from './../../../../generated/types.generated';
        import { FinancialService } from '@/services/FinancialService';
        import logger from '@/lib/logger';
        import { orderItems as orderItemsTable } from '@/database/schema';
        import { eq } from 'drizzle-orm';

        export const backfillSettlementsForDeliveredOrders: NonNullable<
                MutationResolvers['backfillSettlementsForDeliveredOrders']
        > = async (_parent, _arg, { db, orderService }) => {
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
        };