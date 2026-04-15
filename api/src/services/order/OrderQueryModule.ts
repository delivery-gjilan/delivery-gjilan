import {
    orderItems as orderItemsTable,
    orders as ordersTable,
    products as productsTable,
    settlements as settlementsTable,
} from '@/database/schema';
import { and, eq, inArray, ne, exists, sql } from 'drizzle-orm';
import type { Order, OrderStatus, OrderPaymentCollection } from '@/generated/types.generated';
import logger from '@/lib/logger';
import type { OrderServiceDeps } from './types';
import type { OrderMappingModule } from './OrderMappingModule';

const log = logger.child({ module: 'OrderQueryModule' });

export class OrderQueryModule {
    constructor(
        private deps: OrderServiceDeps,
        private mapping: OrderMappingModule,
    ) {}

    /** Default active statuses — everything except DELIVERED and CANCELLED. */
    static readonly ACTIVE_STATUSES: OrderStatus[] = [
        'PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'AWAITING_APPROVAL',
    ];

    async getOrdersPaginated(
        limit: number,
        offset: number,
        statuses?: OrderStatus[] | null,
        startDate?: string,
        endDate?: string,
    ): Promise<{ orders: Order[]; totalCount: number; hasMore: boolean }> {
        const effectiveStatuses = statuses ?? OrderQueryModule.ACTIVE_STATUSES;
        const [dbOrders, totalCount] = await Promise.all([
            this.deps.orderRepository.findByStatuses(effectiveStatuses, limit, offset, startDate, endDate),
            this.deps.orderRepository.countByStatuses(effectiveStatuses, startDate, endDate),
        ]);
        const orders = await this.mapping.mapOrders(dbOrders);
        return { orders, totalCount, hasMore: offset + orders.length < totalCount };
    }

    async getAllOrders(limit = 500, offset = 0): Promise<Order[]> {
        const dbOrders = await this.deps.orderRepository.findAll(limit, offset);
        return this.mapping.mapOrders(dbOrders);
    }

    async getUncompletedOrders(): Promise<Order[]> {
        const dbOrders = await this.deps.orderRepository.findUncompleted();
        return this.mapping.mapOrders(dbOrders);
    }

    async getOrderById(id: string): Promise<Order | null> {
        const dbOrder = await this.deps.orderRepository.findById(id);
        if (!dbOrder) return null;
        return this.mapping.mapToOrder(dbOrder);
    }

    async getDriverOrderFinancials(
        orderId: string,
        driverId: string,
    ): Promise<{
        orderId: string;
        paymentCollection: OrderPaymentCollection;
        amountToCollectFromCustomer: number;
        amountToRemitToPlatform: number;
        driverNetEarnings: number;
        driverTip: number;
    } | null> {
        const dbOrder = await this.deps.orderRepository.findById(orderId);
        if (!dbOrder) return null;
        if (dbOrder.driverId !== driverId) return null;

        const paymentCollection = dbOrder.paymentCollection;
        const driverTip = Number(dbOrder.driverTip ?? 0);
        const totalPrice =
            Number(dbOrder.actualPrice) +
            Number(dbOrder.deliveryPrice ?? 0) +
            Number(dbOrder.prioritySurcharge ?? 0) +
            driverTip;

        const amountToCollectFromCustomer =
            paymentCollection === 'CASH_TO_DRIVER' ? totalPrice : 0;

        let amountToRemitToPlatform: number;

        if (dbOrder.status === 'DELIVERED') {
            const driverSettlements = await this.deps.db
                .select({ amount: settlementsTable.amount, direction: settlementsTable.direction })
                .from(settlementsTable)
                .where(
                    and(
                        eq(settlementsTable.orderId, orderId),
                        eq(settlementsTable.type, 'DRIVER'),
                    ),
                );

            const receivable = driverSettlements
                .filter((s) => s.direction === 'RECEIVABLE')
                .reduce((sum, s) => sum + Number(s.amount), 0);
            const payable = driverSettlements
                .filter((s) => s.direction === 'PAYABLE')
                .reduce((sum, s) => sum + Number(s.amount), 0);

            if (paymentCollection === 'CASH_TO_DRIVER') {
                amountToRemitToPlatform = receivable - payable;
            } else {
                amountToRemitToPlatform = -(payable - receivable);
            }
        } else {
            if (paymentCollection === 'CASH_TO_DRIVER') {
                amountToRemitToPlatform =
                    Number(dbOrder.markupPrice ?? 0) +
                    Number(dbOrder.prioritySurcharge ?? 0);
            } else {
                amountToRemitToPlatform = 0;
            }
        }

        const driverNetEarnings = Number((amountToCollectFromCustomer - amountToRemitToPlatform).toFixed(2));

        return {
            orderId,
            paymentCollection,
            amountToCollectFromCustomer: Number(amountToCollectFromCustomer.toFixed(2)),
            amountToRemitToPlatform: Number(amountToRemitToPlatform.toFixed(2)),
            driverNetEarnings,
            driverTip: Number(driverTip.toFixed(2)),
        };
    }

    async getBusinessOrderFinancials(
        orderId: string,
        businessId: string,
    ): Promise<{
        orderId: string;
        paymentCollection: OrderPaymentCollection;
        businessPrice: number;
        markupAmount: number;
        customerPaid: number;
        amountOwedToBusiness: number;
        amountOwedByBusiness: number;
        businessNetEarnings: number;
    } | null> {
        const dbOrder = await this.deps.orderRepository.findById(orderId);
        if (!dbOrder) return null;

        const paymentCollection = dbOrder.paymentCollection;
        const businessPrice = Number(dbOrder.businessPrice ?? dbOrder.basePrice ?? dbOrder.actualPrice ?? 0);
        const actualPrice = Number(dbOrder.actualPrice ?? 0);
        const markupAmount = Number(dbOrder.markupPrice ?? 0);
        // customerPaid = actualPrice (what the customer paid for items excluding delivery/surcharge/tip)
        const customerPaid = actualPrice;

        // Fetch business-type settlements for this order + business
        const businessSettlements = await this.deps.db
            .select({ amount: settlementsTable.amount, direction: settlementsTable.direction })
            .from(settlementsTable)
            .where(
                and(
                    eq(settlementsTable.orderId, orderId),
                    eq(settlementsTable.type, 'BUSINESS'),
                    eq(settlementsTable.businessId, businessId),
                ),
            );

        const amountOwedToBusiness = businessSettlements
            .filter((s) => s.direction === 'PAYABLE')
            .reduce((sum, s) => sum + Number(s.amount), 0);
        const amountOwedByBusiness = businessSettlements
            .filter((s) => s.direction === 'RECEIVABLE')
            .reduce((sum, s) => sum + Number(s.amount), 0);

        const businessNetEarnings = Number((amountOwedToBusiness - amountOwedByBusiness).toFixed(2));

        return {
            orderId,
            paymentCollection,
            businessPrice: Number(businessPrice.toFixed(2)),
            markupAmount: Number(markupAmount.toFixed(2)),
            customerPaid: Number(customerPaid.toFixed(2)),
            amountOwedToBusiness: Number(amountOwedToBusiness.toFixed(2)),
            amountOwedByBusiness: Number(amountOwedByBusiness.toFixed(2)),
            businessNetEarnings,
        };
    }

    async getOrdersByStatus(status: OrderStatus, limit = 500, offset = 0): Promise<Order[]> {
        const dbOrders = await this.deps.orderRepository.findByStatus(status, limit, offset);
        return this.mapping.mapOrders(dbOrders);
    }

    async getOrdersByUserId(userId: string, limit = 100, offset = 0): Promise<Order[]> {
        const dbOrders = await this.deps.orderRepository.findByUserId(userId, limit, offset);
        return this.mapping.mapOrders(dbOrders);
    }

    async getActiveOrdersByUserId(userId: string): Promise<Order[]> {
        const dbOrders = await this.deps.orderRepository.findActiveByUserId(userId);
        return this.mapping.mapOrders(dbOrders);
    }

    async getOrdersByUserIdAndStatus(userId: string, status: OrderStatus): Promise<Order[]> {
        const dbOrders = await this.deps.orderRepository.findByUserIdAndStatus(userId, status);
        return this.mapping.mapOrders(dbOrders);
    }

    async getOrdersForDriver(driverId: string, limit = 200): Promise<Order[]> {
        const dbOrders = await this.deps.orderRepository.findForDriver(driverId, limit);
        return this.mapping.mapOrders(dbOrders);
    }

    async getOrdersForDriverByStatus(driverId: string, status: OrderStatus): Promise<Order[]> {
        const dbOrders = await this.deps.orderRepository.findForDriverByStatus(driverId, status);
        return this.mapping.mapOrders(dbOrders);
    }

    async getUserUncompletedOrders(userId: string): Promise<Order[]> {
        const userOrders = await this.deps.orderRepository.findUncompletedOrdersByUserId(userId);
        return this.mapping.mapOrders(userOrders);
    }

    async getOrdersByBusinessId(businessId: string): Promise<Order[]> {
        try {
            const db = this.deps.db;
            // Single query: EXISTS subquery replaces the 2-step orderIds fetch + order fetch.
            const dbOrders = await db
                .select()
                .from(ordersTable)
                .where(
                    and(
                        ne(ordersTable.status, 'AWAITING_APPROVAL'),
                        exists(
                            db
                                .select({ _: sql`1` })
                                .from(orderItemsTable)
                                .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
                                .where(
                                    and(
                                        eq(orderItemsTable.orderId, ordersTable.id),
                                        eq(productsTable.businessId, businessId),
                                    ),
                                ),
                        ),
                    ),
                )
                .orderBy(ordersTable.createdAt);

            return this.mapping.mapOrders(dbOrders);
        } catch (error) {
            log.error({ err: error, businessId }, 'order:filterByBusiness:error');
            throw error;
        }
    }

    async getOrdersByBusinessIdAndStatus(businessId: string, status: OrderStatus): Promise<Order[]> {
        try {
            if (status === 'AWAITING_APPROVAL') {
                return [];
            }

            const db = this.deps.db;
            const dbOrders = await db
                .select()
                .from(ordersTable)
                .where(
                    and(
                        eq(ordersTable.status, status),
                        exists(
                            db
                                .select({ _: sql`1` })
                                .from(orderItemsTable)
                                .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
                                .where(
                                    and(
                                        eq(orderItemsTable.orderId, ordersTable.id),
                                        eq(productsTable.businessId, businessId),
                                    ),
                                ),
                        ),
                    ),
                )
                .orderBy(ordersTable.createdAt);

            return this.mapping.mapOrders(dbOrders);
        } catch (error) {
            log.error({ err: error, businessId, status }, 'order:filterByBusinessAndStatus:error');
            throw error;
        }
    }

    async orderContainsBusiness(orderId: string, businessId: string): Promise<boolean> {
        try {
            const db = this.deps.db;
            const match = await db
                .select({ orderId: orderItemsTable.orderId })
                .from(orderItemsTable)
                .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
                .where(and(eq(orderItemsTable.orderId, orderId), eq(productsTable.businessId, businessId)))
                .limit(1);
            if (match.length > 0) {
                return true;
            }

            const directDispatchMatch = await db
                .select({ id: ordersTable.id })
                .from(ordersTable)
                .where(and(eq(ordersTable.id, orderId), eq(ordersTable.businessId, businessId)))
                .limit(1);

            return directDispatchMatch.length > 0;
        } catch (error) {
            log.error({ err: error, orderId, businessId }, 'order:containsBusiness:error');
            return false;
        }
    }
}
