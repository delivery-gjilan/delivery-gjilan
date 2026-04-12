import type { OrderRepository } from '@/repositories/OrderRepository';
import type { DbOrder } from '@/database/schema/orders';
import type { Order, OrderStatus, CreateOrderInput, OrderPaymentCollection } from '@/generated/types.generated';
import type { ApiContextInterface, GraphQLContext } from '@/graphql/context';
import type { subscribe } from '@/lib/pubsub';

/**
 * Public contract for the OrderService.
 *
 * Every public method available on the service is declared here so that:
 * - Consumers (resolvers, other services) can program to the interface
 * - Tests can mock it trivially
 * - AI assistants can read this single file to understand the full API surface
 */
export interface IOrderService {
    /** Exposed for resolver direct access (e.g. raw DB queries in field resolvers). */
    readonly orderRepository: OrderRepository;

    // ── Creation ──
    createOrder(userId: string, input: CreateOrderInput): Promise<Order>;
    createOrderWithSideEffects(userId: string, input: CreateOrderInput, context: GraphQLContext): Promise<Order>;

    // ── Queries ──
    getOrdersPaginated(limit: number, offset: number, statuses?: OrderStatus[] | null, startDate?: string, endDate?: string): Promise<{ orders: Order[]; totalCount: number; hasMore: boolean }>;
    getAllOrders(limit?: number, offset?: number): Promise<Order[]>;
    getUncompletedOrders(): Promise<Order[]>;
    getOrderById(id: string): Promise<Order | null>;
    getDriverOrderFinancials(orderId: string, driverId: string): Promise<{
        orderId: string;
        paymentCollection: OrderPaymentCollection;
        amountToCollectFromCustomer: number;
        amountToRemitToPlatform: number;
        driverNetEarnings: number;
        driverTip: number;
    } | null>;
    getOrdersByStatus(status: OrderStatus, limit?: number, offset?: number): Promise<Order[]>;
    getOrdersByUserId(userId: string, limit?: number, offset?: number): Promise<Order[]>;
    getActiveOrdersByUserId(userId: string): Promise<Order[]>;
    getOrdersByUserIdAndStatus(userId: string, status: OrderStatus): Promise<Order[]>;
    getOrdersForDriver(driverId: string, limit?: number): Promise<Order[]>;
    getOrdersForDriverByStatus(driverId: string, status: OrderStatus): Promise<Order[]>;
    getUserUncompletedOrders(userId: string): Promise<Order[]>;
    getOrdersByBusinessId(businessId: string): Promise<Order[]>;
    getOrdersByBusinessIdAndStatus(businessId: string, status: OrderStatus): Promise<Order[]>;
    orderContainsBusiness(orderId: string, businessId: string): Promise<boolean>;

    // ── Mapping ──
    mapToOrderPublic(dbOrder: DbOrder): Promise<Order>;

    // ── Lifecycle (status transitions) ──
    updateOrderStatus(id: string, status: OrderStatus, skipValidation?: boolean): Promise<Order>;
    startPreparing(id: string, preparationMinutes: number): Promise<Order>;
    updatePreparationTime(id: string, preparationMinutes: number): Promise<Order>;
    updateOrderStatusWithDriver(id: string, status: OrderStatus, driverId: string): Promise<Order>;
    updateStatusWithSideEffects(id: string, status: OrderStatus, context: GraphQLContext): Promise<Order>;
    approveOrderWithSideEffects(id: string, context: ApiContextInterface): Promise<Order>;
    startPreparingWithSideEffects(id: string, preparationMinutes: number, context: ApiContextInterface): Promise<Order>;
    assignDriverToOrder(id: string, driverId: string | null, onlyIfUnassigned?: boolean): Promise<Order | null>;
    cancelOrder(id: string): Promise<Order>;
    adminCancelOrder(id: string, reason: string, settleDriver?: boolean, settleBusiness?: boolean): Promise<Order>;

    // ── User behavior tracking ──
    updateUserBehaviorOnStatusChange(userId: string, fromStatus: OrderStatus, toStatus: OrderStatus, orderTotal: number, orderDate: string | null): Promise<void>;

    // ── Publishing / Subscriptions ──
    subscribeToOrderUpdates(userId: string): ReturnType<typeof subscribe>;
    subscribeToAllOrders(): ReturnType<typeof subscribe>;
    publishUserOrders(userId: string): Promise<void>;
    publishSingleUserOrder(userId: string, orderId: string): Promise<void>;
    publishAllOrders(): Promise<void>;
}
