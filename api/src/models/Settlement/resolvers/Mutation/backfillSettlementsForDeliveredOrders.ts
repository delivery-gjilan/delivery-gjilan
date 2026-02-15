
        import type { MutationResolvers } from './../../../../generated/types.generated';
        import { FinancialService } from '@/services/FinancialService';
        import { orderItems as orderItemsTable } from '@/database/schema';
        import { eq } from 'drizzle-orm';

        export const backfillSettlementsForDeliveredOrders: NonNullable<
                MutationResolvers['backfillSettlementsForDeliveredOrders']
        > = async (_parent, _arg, { db, orderService }) => {
                if (!orderService) {
                        console.error('[backfillSettlementsForDeliveredOrders] orderService missing from context');
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
                                console.error('[backfillSettlementsForDeliveredOrders] Failed for order:', order.id, error);
                        }
                }

                return processed;
        };