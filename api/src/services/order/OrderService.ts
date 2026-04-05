import type { DbType } from '@/database';
import { OrderRepository } from '@/repositories/OrderRepository';
import { AuthRepository } from '@/repositories/AuthRepository';
import { ProductRepository } from '@/repositories/ProductRepository';
import type { PubSub } from '@/lib/pubsub';
import type { subscribe } from '@/lib/pubsub';
import type { DbOrder } from '@/database/schema/orders';
import type { Order, OrderStatus, CreateOrderInput, OrderPaymentCollection } from '@/generated/types.generated';
import type { ApiContextInterface, GraphQLContext } from '@/graphql/context';
import type { IOrderService } from './IOrderService';
import type { OrderServiceDeps } from './types';
import { OrderMappingModule } from './OrderMappingModule';
import { OrderQueryModule } from './OrderQueryModule';
import { OrderPublishingModule } from './OrderPublishingModule';
import { OrderUserBehaviorModule } from './OrderUserBehaviorModule';
import { OrderCreationModule } from './OrderCreationModule';
import { OrderLifecycleModule } from './OrderLifecycleModule';

export class OrderService implements IOrderService {
    public orderRepository: OrderRepository;

    private readonly mapping: OrderMappingModule;
    private readonly query: OrderQueryModule;
    private readonly publishing: OrderPublishingModule;
    private readonly userBehavior: OrderUserBehaviorModule;
    private readonly creation: OrderCreationModule;
    private readonly lifecycle: OrderLifecycleModule;

    constructor(
        orderRepository: OrderRepository,
        authRepository: AuthRepository,
        productRepository: ProductRepository,
        pubsub: PubSub,
        db: DbType,
    ) {
        this.orderRepository = orderRepository;

        const deps: OrderServiceDeps = {
            orderRepository,
            authRepository,
            productRepository,
            pubsub,
            db,
        };

        // 1. Create modules that have no cross-module deps first
        this.mapping = new OrderMappingModule(deps);
        this.userBehavior = new OrderUserBehaviorModule(deps);

        // 2. Create modules that depend on mapping
        this.query = new OrderQueryModule(deps, this.mapping);
        this.publishing = new OrderPublishingModule(
            deps,
            this.mapping,
            (userId) => this.query.getUserUncompletedOrders(userId),
        );

        // 3. Create modules that need sibling wiring
        this.creation = new OrderCreationModule(deps);
        this.lifecycle = new OrderLifecycleModule(deps);

        // 4. Wire cross-module references
        this.creation.setSiblings(this.mapping, this.publishing, this.userBehavior);
        this.lifecycle.setSiblings(this.mapping, this.publishing, this.query, this.userBehavior);
    }

    // ── Creation ──
    createOrder(userId: string, input: CreateOrderInput): Promise<Order> {
        return this.creation.createOrder(userId, input);
    }
    createOrderWithSideEffects(userId: string, input: CreateOrderInput, context: GraphQLContext): Promise<Order> {
        return this.creation.createOrderWithSideEffects(userId, input, context);
    }

    // ── Queries ──
    getOrdersPaginated(limit: number, offset: number, statuses?: OrderStatus[] | null) {
        return this.query.getOrdersPaginated(limit, offset, statuses);
    }
    getAllOrders(limit = 500, offset = 0): Promise<Order[]> {
        return this.query.getAllOrders(limit, offset);
    }
    getUncompletedOrders(): Promise<Order[]> {
        return this.query.getUncompletedOrders();
    }
    getOrderById(id: string): Promise<Order | null> {
        return this.query.getOrderById(id);
    }
    getDriverOrderFinancials(orderId: string, driverId: string) {
        return this.query.getDriverOrderFinancials(orderId, driverId);
    }
    getOrdersByStatus(status: OrderStatus, limit = 500, offset = 0): Promise<Order[]> {
        return this.query.getOrdersByStatus(status, limit, offset);
    }
    getOrdersByUserId(userId: string, limit = 100, offset = 0): Promise<Order[]> {
        return this.query.getOrdersByUserId(userId, limit, offset);
    }
    getActiveOrdersByUserId(userId: string): Promise<Order[]> {
        return this.query.getActiveOrdersByUserId(userId);
    }
    getOrdersByUserIdAndStatus(userId: string, status: OrderStatus): Promise<Order[]> {
        return this.query.getOrdersByUserIdAndStatus(userId, status);
    }
    getOrdersForDriver(driverId: string, limit = 200): Promise<Order[]> {
        return this.query.getOrdersForDriver(driverId, limit);
    }
    getOrdersForDriverByStatus(driverId: string, status: OrderStatus): Promise<Order[]> {
        return this.query.getOrdersForDriverByStatus(driverId, status);
    }
    getUserUncompletedOrders(userId: string): Promise<Order[]> {
        return this.query.getUserUncompletedOrders(userId);
    }
    getOrdersByBusinessId(businessId: string): Promise<Order[]> {
        return this.query.getOrdersByBusinessId(businessId);
    }
    getOrdersByBusinessIdAndStatus(businessId: string, status: OrderStatus): Promise<Order[]> {
        return this.query.getOrdersByBusinessIdAndStatus(businessId, status);
    }
    orderContainsBusiness(orderId: string, businessId: string): Promise<boolean> {
        return this.query.orderContainsBusiness(orderId, businessId);
    }

    // ── Mapping ──
    mapToOrderPublic(dbOrder: DbOrder): Promise<Order> {
        return this.mapping.mapToOrderPublic(dbOrder);
    }

    // ── Lifecycle ──
    updateOrderStatus(id: string, status: OrderStatus, skipValidation = false): Promise<Order> {
        return this.lifecycle.updateOrderStatus(id, status, skipValidation);
    }
    startPreparing(id: string, preparationMinutes: number): Promise<Order> {
        return this.lifecycle.startPreparing(id, preparationMinutes);
    }
    updatePreparationTime(id: string, preparationMinutes: number): Promise<Order> {
        return this.lifecycle.updatePreparationTime(id, preparationMinutes);
    }
    updateOrderStatusWithDriver(id: string, status: OrderStatus, driverId: string): Promise<Order> {
        return this.lifecycle.updateOrderStatusWithDriver(id, status, driverId);
    }
    updateStatusWithSideEffects(id: string, status: OrderStatus, context: GraphQLContext): Promise<Order> {
        return this.lifecycle.updateStatusWithSideEffects(id, status, context);
    }
    approveOrderWithSideEffects(id: string, context: ApiContextInterface): Promise<Order> {
        return this.lifecycle.approveOrderWithSideEffects(id, context);
    }
    startPreparingWithSideEffects(id: string, preparationMinutes: number, context: ApiContextInterface): Promise<Order> {
        return this.lifecycle.startPreparingWithSideEffects(id, preparationMinutes, context);
    }
    assignDriverToOrder(id: string, driverId: string | null, onlyIfUnassigned = false): Promise<Order | null> {
        return this.lifecycle.assignDriverToOrder(id, driverId, onlyIfUnassigned);
    }
    cancelOrder(id: string): Promise<Order> {
        return this.lifecycle.cancelOrder(id);
    }
    adminCancelOrder(id: string, reason: string, settleDriver = false, settleBusiness = false): Promise<Order> {
        return this.lifecycle.adminCancelOrder(id, reason, settleDriver, settleBusiness);
    }

    // ── User behavior ──
    updateUserBehaviorOnStatusChange(userId: string, fromStatus: OrderStatus, toStatus: OrderStatus, orderTotal: number, orderDate: string | null): Promise<void> {
        return this.userBehavior.updateUserBehaviorOnStatusChange(userId, fromStatus, toStatus, orderTotal, orderDate);
    }

    // ── Publishing / Subscriptions ──
    subscribeToOrderUpdates(userId: string): ReturnType<typeof subscribe> {
        return this.publishing.subscribeToOrderUpdates(userId);
    }
    subscribeToAllOrders(): ReturnType<typeof subscribe> {
        return this.publishing.subscribeToAllOrders();
    }
    publishUserOrders(userId: string): Promise<void> {
        return this.publishing.publishUserOrders(userId);
    }
    publishSingleUserOrder(userId: string, orderId: string): Promise<void> {
        return this.publishing.publishSingleUserOrder(userId, orderId);
    }
    publishAllOrders(): Promise<void> {
        return this.publishing.publishAllOrders();
    }
}
