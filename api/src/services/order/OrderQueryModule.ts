import {
    orderItems as orderItemsTable,
    orders as ordersTable,
    products as productsTable,
    settlements as settlementsTable,
} from '@/database/schema';
import { and, eq, inArray, ne } from 'drizzle-orm';
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
    } | null> {
        const dbOrder = await this.deps.orderRepository.findById(orderId);
        if (!dbOrder) return null;
        if (dbOrder.driverId !== driverId) return null;

        const paymentCollection = dbOrder.paymentCollection;
        const totalPrice =
            Number(dbOrder.actualPrice) +
            Number(dbOrder.deliveryPrice ?? 0) +
            Number((dbOrder as any).prioritySurcharge ?? 0);

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
                    Number((dbOrder as any).markupPrice ?? 0) +
                    Number((dbOrder as any).prioritySurcharge ?? 0);
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
        const orders: Order[] = [];
        for (const dbOrder of userOrders) {
            const order = await this.mapping.mapToOrder(dbOrder);
            orders.push(order);
        }
        return orders;
    }

    async getOrdersByBusinessId(businessId: string): Promise<Order[]> {
        try {
            const db = this.deps.db;
            const orderIds = await db
                .selectDistinct({ orderId: orderItemsTable.orderId })
                .from(orderItemsTable)
                .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
                .where(eq(productsTable.businessId, businessId))
                .then((rows) => rows.map((r) => r.orderId));

            if (orderIds.length === 0) return [];

            const dbOrders = await db.query.orders.findMany({
                where: and(inArray(ordersTable.id, orderIds), ne(ordersTable.status, 'AWAITING_APPROVAL')),
                orderBy: (tbl, { desc }) => [desc(tbl.createdAt)],
            });

            return Promise.all(dbOrders.map((o) => this.mapping.mapToOrder(o)));
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
            const orderIds = await db
                .selectDistinct({ orderId: orderItemsTable.orderId })
                .from(orderItemsTable)
                .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
                .where(eq(productsTable.businessId, businessId))
                .then((rows) => rows.map((r) => r.orderId));

            if (orderIds.length === 0) return [];

            const dbOrders = await db.query.orders.findMany({
                where: (tbl, { and: andOp, eq: eqOp }) => andOp(inArray(tbl.id, orderIds), eqOp(tbl.status, status)),
                orderBy: (tbl, { desc }) => [desc(tbl.createdAt)],
            });

            return Promise.all(dbOrders.map((o) => this.mapping.mapToOrder(o)));
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
            return match.length > 0;
        } catch (error) {
            log.error({ err: error, orderId, businessId }, 'order:containsBusiness:error');
            return false;
        }
    }
}
