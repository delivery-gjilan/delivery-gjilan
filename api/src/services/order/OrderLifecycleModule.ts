import {
    orderItems as orderItemsTable,
    users as usersTable,
    businesses as businessesTable,
    products as productsTable,
    orderPromotions as orderPromotionsTable,
    promotions as promotionsTable,
} from '@/database/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { Order, OrderStatus } from '@/generated/types.generated';
import type { DbOrder } from '@/database/schema/orders';
import { AppError } from '@/lib/errors';
import { PromotionEngine } from '@/services/PromotionEngine';
import { FinancialService } from '@/services/FinancialService';
import { parseDbTimestamp } from '@/lib/dateTime';
import logger from '@/lib/logger';
import type { ApiContextInterface, GraphQLContext } from '@/graphql/context';
import {
    notifyCustomerOrderStatus,
    notifyBusinessNewOrder,
    updateLiveActivity,
    endLiveActivity,
} from '@/services/orderNotifications';
import { getDispatchService } from '@/services/driverServices.init';
import { getLiveDriverEta } from '@/lib/driverEtaCache';
import { cache } from '@/lib/cache';
import { emitOrderEvent } from '@/repositories/OrderEventRepository';
import { createAuditLogger } from '@/services/AuditLogger';
import type { OrderServiceDeps } from './types';
import type { OrderMappingModule } from './OrderMappingModule';
import type { OrderPublishingModule } from './OrderPublishingModule';
import type { OrderQueryModule } from './OrderQueryModule';
import type { OrderUserBehaviorModule } from './OrderUserBehaviorModule';

const log = logger.child({ module: 'OrderLifecycleModule' });

// Valid order status transitions (state machine)
const VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
    AWAITING_APPROVAL: ['PENDING', 'CANCELLED'],
    PENDING: ['PREPARING', 'READY', 'CANCELLED'],
    PREPARING: ['READY', 'CANCELLED'],
    READY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [],
    CANCELLED: [],
};

export class OrderLifecycleModule {
    private mapping!: OrderMappingModule;
    private publishing!: OrderPublishingModule;
    private query!: OrderQueryModule;
    private userBehavior!: OrderUserBehaviorModule;

    constructor(private deps: OrderServiceDeps) {}

    /** Called by the facade after all modules are constructed */
    setSiblings(mapping: OrderMappingModule, publishing: OrderPublishingModule, query: OrderQueryModule, userBehavior: OrderUserBehaviorModule) {
        this.mapping = mapping;
        this.publishing = publishing;
        this.query = query;
        this.userBehavior = userBehavior;
    }

    private async validateStatusTransition(orderId: string, newStatus: OrderStatus): Promise<void> {
        const order = await this.deps.orderRepository.findById(orderId);
        if (!order) {
            throw AppError.notFound('Order');
        }
        const currentStatus = order.status as OrderStatus;
        const allowed = VALID_TRANSITIONS[currentStatus];
        if (!allowed || !allowed.includes(newStatus)) {
            throw AppError.businessRule(`Invalid status transition: ${currentStatus} → ${newStatus}`);
        }
    }

    async updateOrderStatus(id: string, status: OrderStatus, skipValidation = false): Promise<Order> {
        if (!skipValidation) {
            await this.validateStatusTransition(id, status);
        }
        const timestampMap: Record<string, 'readyAt' | 'outForDeliveryAt' | 'deliveredAt'> = {
            READY: 'readyAt',
            OUT_FOR_DELIVERY: 'outForDeliveryAt',
            DELIVERED: 'deliveredAt',
        };
        const tsField = timestampMap[status];
        let updated;
        if (tsField) {
            updated = await this.deps.orderRepository.updateStatusWithTimestamp(id, status, tsField);
        } else {
            updated = await this.deps.orderRepository.updateStatus(id, status);
        }
        if (!updated) {
            throw AppError.notFound('Order');
        }
        return this.mapping.mapToOrder(updated);
    }

    async startPreparing(id: string, preparationMinutes: number): Promise<Order> {
        const updated = await this.deps.orderRepository.startPreparing(id, preparationMinutes);
        if (!updated) {
            throw AppError.notFound('Order not found or not in PENDING status');
        }
        return this.mapping.mapToOrder(updated);
    }

    async updatePreparationTime(id: string, preparationMinutes: number): Promise<Order> {
        const updated = await this.deps.orderRepository.updatePreparationTime(id, preparationMinutes);
        if (!updated) {
            throw AppError.notFound('Order not found or not in PREPARING status');
        }
        return this.mapping.mapToOrder(updated);
    }

    async updateOrderStatusWithDriver(id: string, status: OrderStatus, driverId: string): Promise<Order> {
        let updated = await this.deps.orderRepository.updateStatusAndDriver(id, status, driverId, 'READY');
        if (!updated) {
            updated = await this.deps.orderRepository.updateStatusAndDriver(id, status, driverId, 'PREPARING');
        }
        if (!updated) {
            throw AppError.conflict('Order already assigned or not ready');
        }
        return this.mapping.mapToOrder(updated);
    }

    async updateStatusWithSideEffects(id: string, status: OrderStatus, context: GraphQLContext): Promise<Order> {
        const { userData, db, notificationService, financialService } = context;
        log.info({ orderId: id, status }, 'order:updateStatusWithSideEffects');

        const role = userData?.role;
        if (!role) {
            throw AppError.unauthorized();
        }

        // Fetch the raw DB record once — use it for all permission checks and side-effects.
        // The mapped Order is returned by updateOrderStatus / updateOrderStatusWithDriver below.
        const dbOrder = await this.deps.orderRepository.findById(id);
        if (!dbOrder) {
            throw AppError.notFound('Order');
        }

        const currentStatus = dbOrder.status as OrderStatus;
        const isSuperAdmin = role === 'SUPER_ADMIN';
        const isDriver = role === 'DRIVER';
        const isBusinessAdmin = role === 'BUSINESS_OWNER' || role === 'BUSINESS_EMPLOYEE';
        const isCustomer = role === 'CUSTOMER';

        let order: Order;

        if (isCustomer) {
            if (dbOrder.userId !== userData.userId) {
                throw AppError.forbidden('Not authorized to update this order');
            }
            if (status !== 'DELIVERED') {
                throw AppError.businessRule('Customers can only mark orders as DELIVERED');
            }
            order = await this.updateOrderStatus(id, status, true);
        } else if (isBusinessAdmin) {
            if (!userData.businessId) {
                throw AppError.forbidden('Business admin has no business assigned');
            }
            const canAccess = await this.query.orderContainsBusiness(id, userData.businessId);
            if (!canAccess) {
                throw AppError.forbidden('Not authorized to update this order');
            }
            const allowed: Record<string, string[]> = {
                PENDING: ['READY', 'CANCELLED'],
                PREPARING: ['READY', 'CANCELLED'],
            };
            if (!allowed[currentStatus]?.includes(status)) {
                throw AppError.businessRule('Invalid status transition for business admin');
            }
            order = await this.updateOrderStatus(id, status);
        } else if (isDriver) {
            const allowed: Record<string, string[]> = {
                PREPARING: ['OUT_FOR_DELIVERY'],
                READY: ['OUT_FOR_DELIVERY'],
                OUT_FOR_DELIVERY: ['DELIVERED'],
            };
            if (!allowed[currentStatus]?.includes(status)) {
                throw AppError.businessRule('Invalid status transition for driver');
            }
            if (!userData.userId) {
                throw AppError.unauthorized('Driver not authenticated');
            }
            if (dbOrder.driverId && dbOrder.driverId !== userData.userId) {
                throw AppError.conflict('Order already assigned to another driver');
            }
            if (status === 'OUT_FOR_DELIVERY') {
                order = await this.updateOrderStatusWithDriver(id, status, userData.userId);
            } else {
                order = await this.updateOrderStatus(id, status);
            }
        } else if (!isSuperAdmin) {
            throw AppError.forbidden('Not authorized to update order status');
        } else {
            order = await this.updateOrderStatus(id, status, true);
        }

        // Side Effects
        if (status === 'DELIVERED' && currentStatus !== 'DELIVERED') {
            const items = await this.deps.db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
            await financialService.createOrderSettlements(dbOrder, items, dbOrder.driverId);

            // Fire-and-forget: send order receipt email
            this.sendReceiptEmail(id, dbOrder, items, context).catch((err) =>
                log.error({ err, orderId: id }, 'email:receipt:trigger_failed'),
            );
        }

        await this.userBehavior.updateUserBehaviorOnStatusChange(
            dbOrder.userId,
            currentStatus,
            status,
            Number(dbOrder.actualPrice) + Number(dbOrder.deliveryPrice) + Number((dbOrder as any).prioritySurcharge ?? 0),
            dbOrder.orderDate || null,
        );

        await this.publishing.publishSingleUserOrder(dbOrder.userId, id);
        await this.publishing.publishAllOrders();
        notifyCustomerOrderStatus(notificationService, dbOrder.userId, id, status);

        // If the order is being reverted away from READY (e.g. admin pushes it back to
        // PENDING or PREPARING), clear the dispatch cache key so that when it becomes
        // READY again a fresh dispatch fires and drivers are re-notified.
        if (currentStatus === 'READY' && (status === 'PENDING' || status === 'PREPARING')) {
            await cache.del(`dispatch:early:${id}`).catch(() => null);
            log.info({ orderId: id }, 'updateStatus — order reverted from READY, dispatch cache cleared');
        }

        if (status === 'READY' && currentStatus !== 'READY') {
            try {
                const dispatchService = getDispatchService();
                const earlyState = await cache.get<string>(`dispatch:early:${id}`);
                if (earlyState === 'fired') {
                    log.info({ orderId: id }, 'updateStatus:READY — early dispatch already fired, skipping');
                } else {
                    if (earlyState === 'pending') {
                        // Remove the pending BullMQ job so it doesn't fire after READY dispatch.
                        dispatchService.cancelDispatch(id);
                        log.info({ orderId: id }, 'updateStatus:READY — order ready before early timer, dispatching now');
                    }
                    await cache.set(`dispatch:early:${id}`, 'fired', 3600);
                    dispatchService.dispatchOrder(id, notificationService).catch((err) =>
                        log.error({ err, orderId: id }, 'updateStatus:dispatch:error'),
                    );
                }
            } catch (err) {
                log.warn({ err }, 'updateStatus:dispatch:serviceNotReady');
            }
        }

        // Live Activity update logic
        this.handleLiveActivityUpdate(id, status, currentStatus, dbOrder, order, context);

        // Analytics
        this.emitAnalyticsEvent(id, status, currentStatus, dbOrder, userData, isDriver, isBusinessAdmin, isSuperAdmin);

        // Audit Log
        const auditLog = createAuditLogger(db, context as any);
        await auditLog.log({
            action: 'ORDER_STATUS_CHANGED',
            entityType: 'ORDER',
            entityId: id,
            metadata: {
                orderId: id,
                oldValue: { status: currentStatus },
                newValue: { status },
                changedFields: ['status'],
            },
        });

        return order;
    }

    async approveOrderWithSideEffects(id: string, context: ApiContextInterface): Promise<Order> {
        const { userData } = context;

        const role = userData?.role;
        if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
            throw AppError.forbidden('Only admins can approve orders');
        }

        const currentOrder = await this.query.getOrderById(id);
        if (!currentOrder) {
            throw AppError.notFound('Order');
        }

        if (currentOrder.status !== 'AWAITING_APPROVAL') {
            throw AppError.businessRule('Order is not awaiting approval');
        }

        const order = await this.updateOrderStatus(id, 'PENDING', true);

        try {
            await this.publishing.publishSingleUserOrder(String(order.userId), String(order.id));
            await this.publishing.publishAllOrders();
        } catch (error) {
            log.error({ err: error, orderId: id }, 'approveOrder:publish:failed');
        }

        try {
            const orderBusinessIds = Array.from(
                new Set(
                    (order.businesses ?? [])
                        .map((entry) => entry?.business?.id)
                        .filter((businessId): businessId is string => Boolean(businessId)),
                ),
            );

            if (orderBusinessIds.length > 0) {
                const businessUserRows = await this.deps.db
                    .select({ id: usersTable.id })
                    .from(usersTable)
                    .where(
                        and(
                            inArray(usersTable.businessId, orderBusinessIds),
                            inArray(usersTable.role, ['BUSINESS_OWNER', 'BUSINESS_EMPLOYEE']),
                            isNull(usersTable.deletedAt),
                        ),
                    );

                notifyBusinessNewOrder(
                    context.notificationService,
                    businessUserRows.map((row) => row.id),
                    String(order.id),
                );
            }
        } catch (error) {
            log.error({ err: error, orderId: id }, 'approveOrder:notifyBusinessNewOrder:failed');
        }

        const auditLogger = createAuditLogger(this.deps.db, context as any);
        await auditLogger.log({
            action: 'ORDER_STATUS_CHANGED',
            entityType: 'ORDER',
            entityId: String(id),
            metadata: { orderId: String(id), adminId: userData.userId, from: 'AWAITING_APPROVAL', to: 'PENDING' },
        });

        return order;
    }

    async startPreparingWithSideEffects(
        id: string,
        preparationMinutes: number,
        context: ApiContextInterface,
    ): Promise<Order> {
        const { userData } = context;

        const role = userData?.role;
        if (!role) {
            throw AppError.unauthorized();
        }

        const isBusinessAdmin = role === 'BUSINESS_OWNER' || role === 'BUSINESS_EMPLOYEE';
        const isSuperAdmin = role === 'SUPER_ADMIN';

        if (!isBusinessAdmin && !isSuperAdmin) {
            throw AppError.forbidden('Not authorized to start preparing');
        }

        if (isBusinessAdmin) {
            if (!userData.businessId) {
                throw AppError.forbidden('Business admin has no business assigned');
            }
            const canAccess = await this.query.orderContainsBusiness(id, userData.businessId);
            if (!canAccess) {
                throw AppError.forbidden('Not authorized to update this order');
            }
        }

        if (preparationMinutes < 1 || preparationMinutes > 180) {
            throw AppError.badInput('Preparation time must be between 1 and 180 minutes');
        }

        // startPreparing will throw AppError.notFound if the order doesn't exist or is not PENDING.
        const order = await this.startPreparing(id, preparationMinutes);
        // Re-fetch the updated DB record after startPreparing to get the new timestamps
        // (preparingAt, estimatedReadyAt). currentOrder is stale at this point.
        const dbOrder = await this.deps.orderRepository.findById(id);

        if (dbOrder) {
            await this.userBehavior.updateUserBehaviorOnStatusChange(
                dbOrder.userId,
                'PENDING',
                'PREPARING',
                Number(dbOrder.actualPrice) +
                    Number(dbOrder.deliveryPrice) +
                    Number((dbOrder as any).prioritySurcharge ?? 0),
                dbOrder.orderDate || null,
            );

            await this.publishing.publishSingleUserOrder(dbOrder.userId, id);
            await this.publishing.publishAllOrders();

            notifyCustomerOrderStatus(context.notificationService, dbOrder.userId, id, 'PREPARING');

            try {
                const dispatchService = getDispatchService();
                // Clear any stale 'fired' dispatch state — admin may be re-starting prep
                // after reverting the order, and drivers should be re-notified when READY.
                await cache.del(`dispatch:early:${id}`).catch(() => null);
                dispatchService
                    .scheduleEarlyDispatch(id, preparationMinutes, context.notificationService)
                    .catch((err) => log.error({ err, orderId: id }, 'startPreparing:earlyDispatch:error'));
            } catch (err) {
                log.warn({ err }, 'startPreparing:dispatch:serviceNotReady');
            }

            emitOrderEvent({
                orderId: id,
                eventType: 'ORDER_PREPARING',
                actorType: isBusinessAdmin ? 'RESTAURANT' : 'ADMIN',
                actorId: userData?.userId,
                businessId: userData?.businessId ?? undefined,
                metadata: { preparationMinutes },
            });

            updateLiveActivity(
                context.notificationService,
                id,
                'preparing',
                'Your driver',
                preparationMinutes,
                preparationMinutes,
                parseDbTimestamp(dbOrder.preparingAt)?.getTime() ?? Date.now(),
            );

            const auditLogger = createAuditLogger(this.deps.db, context as any);
            await auditLogger.log({
                action: 'ORDER_STATUS_CHANGED',
                entityType: 'ORDER',
                entityId: id,
                metadata: {
                    orderId: id,
                    oldValue: { status: 'PENDING' },
                    newValue: { status: 'PREPARING', preparationMinutes },
                    changedFields: ['status', 'preparationMinutes'],
                },
            });
        }

        return order;
    }

    private async handleLiveActivityUpdate(id: string, status: string, currentStatus: string, dbOrder: DbOrder, order: Order, context: ApiContextInterface) {
        const { notificationService, userData } = context;
        const statusToLiveActivityStatus: Record<string, any> = {
            PENDING: 'pending',
            PREPARING: 'preparing',
            READY: 'ready',
            OUT_FOR_DELIVERY: 'out_for_delivery',
            DELIVERED: 'delivered',
            CANCELLED: 'cancelled',
        };
        const liveActivityStatus = statusToLiveActivityStatus[status];

        if (liveActivityStatus) {
            let driverName = 'Your driver';
            if (order.driver?.firstName) {
                driverName = `${order.driver.firstName} ${order.driver.lastName || ''}`.trim();
            }

            let estimatedMinutes = 0;
            if ((status === 'PREPARING' || status === 'READY') && dbOrder.preparationMinutes) {
                estimatedMinutes = dbOrder.preparationMinutes;
            } else if (status === 'OUT_FOR_DELIVERY') {
                const driverId = dbOrder.driverId ?? userData?.userId;
                if (driverId) {
                    try {
                        const liveEta = await getLiveDriverEta(driverId);
                        if (liveEta?.remainingEtaSeconds != null && liveEta.remainingEtaSeconds > 0) {
                            estimatedMinutes = Math.ceil(liveEta.remainingEtaSeconds / 60);
                        }
                    } catch { /* fall through */ }
                }
                if (estimatedMinutes === 0) {
                    // No live ETA available — set flag so the first driver heartbeat
                    // fires the Live Activity push immediately with real GPS data
                    // instead of sending "15 min" now and correcting later.
                    await cache.set(`cache:la-ofd-pending:${id}`, true, 300);
                }
            }

            // Skip the Live Activity push for OFD when we have no real ETA —
            // the first driver heartbeat will fire it with accurate data.
            const skipOfdPushNoEta = status === 'OUT_FOR_DELIVERY' && estimatedMinutes === 0;

            const phaseInitialMinutes =
                status === 'PENDING'
                    ? Math.max(1, (dbOrder.preparationMinutes ?? estimatedMinutes) || 15)
                    : (status === 'PREPARING' || status === 'READY')
                        ? Math.max(1, (dbOrder.preparationMinutes ?? estimatedMinutes) || 15)
                        : status === 'OUT_FOR_DELIVERY'
                            ? Math.max(1, estimatedMinutes || 15)
                            : Math.max(1, estimatedMinutes || 1);

            const phaseStartedAt =
                status === 'PENDING'
                    ? (parseDbTimestamp(dbOrder.orderDate)?.getTime() ?? Date.now())
                    : (status === 'PREPARING' || status === 'READY')
                        ? (parseDbTimestamp(dbOrder.preparingAt)?.getTime() ?? Date.now())
                        : status === 'OUT_FOR_DELIVERY'
                            ? (parseDbTimestamp(dbOrder.outForDeliveryAt)?.getTime() ?? Date.now())
                            : Date.now();

            if (!skipOfdPushNoEta) {
                updateLiveActivity(notificationService, id, liveActivityStatus, driverName, estimatedMinutes, phaseInitialMinutes, phaseStartedAt);
            }

            if (status === 'DELIVERED' || status === 'CANCELLED') {
                endLiveActivity(notificationService, id, status === 'CANCELLED' ? 'cancelled' : 'delivered');
            }
        }
    }

    /**
     * Gather receipt data and send via EmailService (fire-and-forget).
     */
    private async sendReceiptEmail(
        orderId: string,
        dbOrder: DbOrder,
        items: (typeof orderItemsTable.$inferSelect)[],
        context: GraphQLContext,
    ): Promise<void> {
        const { db } = this.deps;

        const productIds = [...new Set(items.map((i) => i.productId))];

        // Fetch all required data in parallel to avoid sequential round-trips.
        const [userRows, businessRows, productRows, promos] = await Promise.all([
            db
                .select({ email: usersTable.email, firstName: usersTable.firstName, lastName: usersTable.lastName, preferredLanguage: usersTable.preferredLanguage, emailOptOut: usersTable.emailOptOut })
                .from(usersTable)
                .where(eq(usersTable.id, dbOrder.userId)),
            db
                .select({ name: businessesTable.name })
                .from(businessesTable)
                .where(eq(businessesTable.id, dbOrder.businessId)),
            productIds.length
                ? db
                      .select({ id: productsTable.id, name: productsTable.name })
                      .from(productsTable)
                      .where(inArray(productsTable.id, productIds))
                : Promise.resolve([]),
            db
                .select({
                    discountAmount: orderPromotionsTable.discountAmount,
                    appliesTo: orderPromotionsTable.appliesTo,
                    name: promotionsTable.name,
                    code: promotionsTable.code,
                })
                .from(orderPromotionsTable)
                .innerJoin(promotionsTable, eq(orderPromotionsTable.promotionId, promotionsTable.id))
                .where(eq(orderPromotionsTable.orderId, orderId)),
        ]);

        const [user] = userRows;
        const [business] = businessRows;

        if (!user?.email || user.emailOptOut) return;

        const productNameMap = new Map(productRows.map((p) => [p.id, p.name]));
        const discountTotal = promos.reduce((sum, p) => sum + Number(p.discountAmount), 0);

        // Only include top-level items (not option/child items)
        const topLevelItems = items.filter((i) => !i.parentOrderItemId);

        const subtotal = Number(dbOrder.actualPrice);
        const originalDeliveryPrice = Number((dbOrder as any).originalDeliveryPrice ?? dbOrder.deliveryPrice);
        const deliveryPrice = Number(dbOrder.deliveryPrice);
        const prioritySurcharge = Number((dbOrder as any).prioritySurcharge ?? 0);
        const total = subtotal + deliveryPrice + prioritySurcharge;

        // Build unsubscribe URL with signed token
        const { createUnsubscribeToken } = require('@/routes/emailRoutes');
        const unsubToken = createUnsubscribeToken(dbOrder.userId);
        const apiBase = process.env.PUBLIC_API_URL || 'https://colloquial-deadra-cursorily.ngrok-free.dev';
        const unsubscribeUrl = `${apiBase}/api/email/unsubscribe?token=${unsubToken}`;

        void context.emailService.sendOrderReceipt({
            toEmail: user.email,
            toName: `${user.firstName} ${user.lastName}`,
            language: (user.preferredLanguage === 'al' ? 'al' : 'en') as 'en' | 'al',
            unsubscribeUrl,
            order: {
                displayId: dbOrder.displayId,
                orderDate: dbOrder.orderDate ?? null,
                businessName: business?.name ?? 'Unknown',
                items: topLevelItems.map((item) => ({
                    name: productNameMap.get(item.productId) ?? 'Item',
                    quantity: item.quantity,
                    unitPrice: Number(item.finalAppliedPrice),
                })),
                subtotal,
                originalDeliveryPrice,
                deliveryPrice,
                prioritySurcharge,
                discountTotal,
                promotions: promos.map((p) => ({
                    name: p.name,
                    code: p.code,
                    appliesTo: p.appliesTo,
                    discountAmount: Number(p.discountAmount),
                })),
                total,
                paymentCollection: dbOrder.paymentCollection,
                dropoffAddress: dbOrder.dropoffAddress,
            },
        });
    }

    private emitAnalyticsEvent(id: string, status: string, currentStatus: string, dbOrder: DbOrder, userData: any, isDriver: boolean, isBusinessAdmin: boolean, isSuperAdmin: boolean) {
        const statusToEventType: Record<string, string> = {
            READY: 'ORDER_READY',
            OUT_FOR_DELIVERY: 'ORDER_PICKED_UP',
            DELIVERED: 'ORDER_DELIVERED',
            CANCELLED: 'ORDER_CANCELLED',
        };
        const analyticsEvent = statusToEventType[status];
        if (analyticsEvent) {
            emitOrderEvent({
                orderId: id,
                eventType: analyticsEvent as any,
                actorType: isDriver ? 'DRIVER' : isBusinessAdmin ? 'RESTAURANT' : isSuperAdmin ? 'ADMIN' : 'SYSTEM',
                actorId: userData?.userId,
                driverId: isDriver ? userData?.userId : (dbOrder.driverId ?? undefined),
                metadata: { previousStatus: currentStatus },
            });
        }
    }

    async assignDriverToOrder(id: string, driverId: string | null, onlyIfUnassigned = false): Promise<Order | null> {
        const updated = await this.deps.orderRepository.assignDriver(id, driverId, onlyIfUnassigned);
        if (!updated) {
            return null;
        }
        return this.mapping.mapToOrder(updated);
    }

    async cancelOrder(id: string): Promise<Order> {
        const dbOrder = await this.deps.orderRepository.findById(id);
        if (!dbOrder) {
            throw AppError.notFound('Order');
        }

        const db = this.deps.db;

        const order = await this.updateOrderStatus(id, 'CANCELLED');

        const promotionEngine = new PromotionEngine(db);
        await promotionEngine.reverseUsage(id, dbOrder.userId);

        const financialService = new FinancialService(db);
        await financialService.cancelOrderSettlements(id);

        await this.userBehavior.updateUserBehaviorOnStatusChange(
            dbOrder.userId,
            dbOrder.status as OrderStatus,
            'CANCELLED',
            Number(dbOrder.actualPrice) + Number(dbOrder.deliveryPrice) + Number((dbOrder as any).prioritySurcharge ?? 0),
            dbOrder.orderDate || null,
        );
        return order;
    }

    async adminCancelOrder(id: string, reason: string, settleDriver = false, settleBusiness = false): Promise<Order> {
        const dbOrder = await this.deps.orderRepository.findById(id);
        if (!dbOrder) {
            throw AppError.notFound('Order');
        }

        if (dbOrder.status === 'CANCELLED') {
            throw AppError.businessRule('Order is already cancelled');
        }
        if (dbOrder.status === 'DELIVERED') {
            throw AppError.businessRule('Cannot cancel a delivered order');
        }

        const db = this.deps.db;

        const updated = await this.deps.orderRepository.cancelWithReason(id, reason);
        if (!updated) {
            throw AppError.notFound('Order');
        }

        const promotionEngine = new PromotionEngine(db);
        await promotionEngine.reverseUsage(id, dbOrder.userId);

        const financialService = new FinancialService(db);
        if (settleDriver || settleBusiness) {
            const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
            await financialService.createOrderSettlements(updated, items, updated.driverId);
            if (!settleDriver) await financialService.cancelDriverSettlementsForOrder(id);
            if (!settleBusiness) await financialService.cancelBusinessSettlementsForOrder(id);
        } else {
            await financialService.cancelOrderSettlements(id);
        }

        await this.userBehavior.updateUserBehaviorOnStatusChange(
            dbOrder.userId,
            dbOrder.status as OrderStatus,
            'CANCELLED',
            Number(dbOrder.actualPrice) + Number(dbOrder.deliveryPrice) + Number((dbOrder as any).prioritySurcharge ?? 0),
            dbOrder.orderDate || null,
        );

        return this.mapping.mapToOrder(updated);
    }
}
