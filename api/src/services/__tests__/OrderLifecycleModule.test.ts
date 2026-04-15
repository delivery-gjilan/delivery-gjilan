import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderLifecycleModule } from '@/services/order/OrderLifecycleModule';

const mockedDeps = vi.hoisted(() => ({
    notifyCustomerOrderStatus: vi.fn(),
    updateLiveActivity: vi.fn(),
    endLiveActivity: vi.fn(),
    getDispatchService: vi.fn(),
    dispatchOrder: vi.fn(async () => undefined),
    scheduleEarlyDispatch: vi.fn(async () => undefined),
    cancelDispatch: vi.fn(),
    cacheGet: vi.fn(async () => null),
    cacheSet: vi.fn(async () => undefined),
    cacheDel: vi.fn(async () => undefined),
    invalidateProducts: vi.fn(async () => undefined),
    emitOrderEvent: vi.fn(),
    auditLog: vi.fn(async () => undefined),
    cancelPendingBusinessNotification: vi.fn(async () => undefined),
}));

vi.mock('@/lib/logger', () => ({
    default: {
        child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock('@/services/orderNotifications', () => ({
    notifyCustomerOrderStatus: mockedDeps.notifyCustomerOrderStatus,
    notifyBusinessNewOrder: vi.fn(),
    updateLiveActivity: mockedDeps.updateLiveActivity,
    endLiveActivity: mockedDeps.endLiveActivity,
}));

vi.mock('@/services/driverServices.init', () => ({
    getDispatchService: vi.fn(() => mockedDeps.getDispatchService()),
}));

vi.mock('@/lib/driverEtaCache', () => ({
    getLiveDriverEta: vi.fn(async () => null),
}));

vi.mock('@/lib/cache', () => ({
    cache: {
        get: mockedDeps.cacheGet,
        set: mockedDeps.cacheSet,
        del: mockedDeps.cacheDel,
        invalidateProducts: mockedDeps.invalidateProducts,
    },
}));

vi.mock('@/repositories/OrderEventRepository', () => ({
    emitOrderEvent: mockedDeps.emitOrderEvent,
}));

vi.mock('@/services/AuditLogger', () => ({
    createAuditLogger: vi.fn(() => ({ log: mockedDeps.auditLog })),
}));

vi.mock('@/models/Inventory/lib/deductOrderStockCore', () => ({
    deductOrderStockCore: vi.fn(async () => undefined),
}));

vi.mock('@/services/scheduleBusinessNotification', () => ({
    scheduleBusinessNotification: vi.fn(async () => undefined),
}));

vi.mock('@/queues/businessNotifyQueue', () => ({
    cancelPendingBusinessNotification: mockedDeps.cancelPendingBusinessNotification,
}));

function makeDbOrder(overrides?: Partial<any>) {
    return {
        id: 'order-1',
        userId: 'customer-1',
        businessId: 'business-1',
        status: 'PREPARING',
        driverId: null,
        actualPrice: 12,
        deliveryPrice: 3,
        prioritySurcharge: 0,
        orderDate: new Date('2026-04-15T10:00:00.000Z').toISOString(),
        preparingAt: new Date('2026-04-15T10:05:00.000Z').toISOString(),
        outForDeliveryAt: null,
        readyAt: null,
        deliveredAt: null,
        preparationMinutes: 15,
        ...overrides,
    };
}

function makeModule() {
    const orderRepository = {
        findById: vi.fn(),
        updateStatusWithTimestamp: vi.fn(),
        updateStatus: vi.fn(),
        updateStatusAndDriver: vi.fn(),
        startPreparing: vi.fn(),
    };

    const module = new OrderLifecycleModule({
        orderRepository,
        authRepository: {} as any,
        productRepository: {} as any,
        pubsub: {} as any,
        db: {} as any,
    });

    const mapping = {
        mapToOrder: vi.fn(async (dbOrder: any) => ({
            id: dbOrder.id,
            userId: dbOrder.userId,
            status: dbOrder.status,
            driver: null,
        })),
    } as any;

    const publishing = {
        publishOrderById: vi.fn(async () => undefined),
        publishSingleUserOrder: vi.fn(async () => undefined),
        publishAllOrders: vi.fn(async () => undefined),
    } as any;

    const query = {
        orderContainsBusiness: vi.fn(async () => true),
    } as any;

    const userBehavior = {
        updateUserBehaviorOnStatusChange: vi.fn(async () => undefined),
    } as any;

    module.setSiblings(mapping, publishing, query, userBehavior);

    return { module, orderRepository, mapping, publishing, query, userBehavior };
}

describe('OrderLifecycleModule dispatch side effects', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedDeps.getDispatchService.mockReturnValue({
            dispatchOrder: mockedDeps.dispatchOrder,
            scheduleEarlyDispatch: mockedDeps.scheduleEarlyDispatch,
            cancelDispatch: mockedDeps.cancelDispatch,
        });
        mockedDeps.cacheGet.mockResolvedValue(null);
    });

    it('dispatches immediately on READY and cancels any pending early-dispatch timer', async () => {
        const { module, orderRepository, publishing, userBehavior } = makeModule();
        const dbOrderBefore = makeDbOrder({ status: 'PREPARING' });
        const dbOrderAfter = makeDbOrder({ status: 'READY', readyAt: new Date('2026-04-15T10:20:00.000Z').toISOString() });

        orderRepository.findById = vi.fn(async () => dbOrderBefore);
        orderRepository.updateStatusWithTimestamp = vi.fn(async () => dbOrderAfter);
        mockedDeps.cacheGet.mockResolvedValue('pending');

        const context: any = {
            userData: {
                role: 'BUSINESS_OWNER',
                userId: 'business-user-1',
                businessId: 'business-1',
            },
            db: {},
            notificationService: {},
            financialService: {},
        };

        const result = await module.updateStatusWithSideEffects('order-1', 'READY', context);

        expect(result.status).toBe('READY');
        expect(mockedDeps.cancelDispatch).toHaveBeenCalledWith('order-1');
        expect(mockedDeps.cacheSet).toHaveBeenCalledWith('dispatch:early:order-1', 'fired', 3600);
        expect(mockedDeps.dispatchOrder).toHaveBeenCalledWith('order-1', context.notificationService);
        expect(mockedDeps.notifyCustomerOrderStatus).toHaveBeenCalledWith(context.notificationService, 'customer-1', 'order-1', 'READY');
        expect(publishing.publishOrderById).toHaveBeenCalledWith('order-1');
        expect(publishing.publishSingleUserOrder).toHaveBeenCalledWith('customer-1', 'order-1');
        expect(publishing.publishAllOrders).toHaveBeenCalled();
        expect(userBehavior.updateUserBehaviorOnStatusChange).toHaveBeenCalled();
    });

    it('starts preparing by clearing stale early state and scheduling a new early dispatch', async () => {
        const { module, orderRepository, query, publishing, userBehavior } = makeModule();
        const dbOrderAfter = makeDbOrder({
            status: 'PREPARING',
            preparingAt: new Date('2026-04-15T10:05:00.000Z').toISOString(),
            estimatedReadyAt: new Date('2026-04-15T10:25:00.000Z').toISOString(),
            preparationMinutes: 20,
        });

        orderRepository.startPreparing = vi.fn(async () => dbOrderAfter);
        orderRepository.findById = vi.fn(async () => dbOrderAfter);

        const context: any = {
            userData: {
                role: 'BUSINESS_OWNER',
                userId: 'business-user-1',
                businessId: 'business-1',
            },
            db: {},
            notificationService: {},
        };

        const result = await module.startPreparingWithSideEffects('order-1', 20, context);

        expect(result.status).toBe('PREPARING');
        expect(query.orderContainsBusiness).toHaveBeenCalledWith('order-1', 'business-1');
        expect(mockedDeps.cacheDel).toHaveBeenCalledWith('dispatch:early:order-1');
        expect(mockedDeps.scheduleEarlyDispatch).toHaveBeenCalledWith('order-1', 20, context.notificationService);
        expect(mockedDeps.notifyCustomerOrderStatus).toHaveBeenCalledWith(context.notificationService, 'customer-1', 'order-1', 'PREPARING');
        expect(mockedDeps.emitOrderEvent).toHaveBeenCalledWith(
            expect.objectContaining({ orderId: 'order-1', eventType: 'ORDER_PREPARING' }),
        );
        expect(publishing.publishSingleUserOrder).toHaveBeenCalledWith('customer-1', 'order-1');
        expect(publishing.publishAllOrders).toHaveBeenCalled();
        expect(userBehavior.updateUserBehaviorOnStatusChange).toHaveBeenCalled();
    });
});