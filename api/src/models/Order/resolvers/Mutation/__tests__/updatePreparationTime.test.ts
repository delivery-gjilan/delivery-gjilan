import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updatePreparationTime } from '../updatePreparationTime';

const mockedDeps = vi.hoisted(() => ({
    auditLog: vi.fn(async () => undefined),
    updateLiveActivity: vi.fn(),
    notifyCustomerPrepTimeUpdated: vi.fn(),
    notifyDriverPrepTimeUpdated: vi.fn(),
    notifyAdminsPrepTimeExtended: vi.fn(),
    emitOrderEvent: vi.fn(),
    cacheGet: vi.fn(async () => null),
    rescheduleEarlyDispatch: vi.fn(async () => undefined),
}));

vi.mock('@/lib/logger', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock('@/services/AuditLogger', () => ({
    createAuditLogger: vi.fn(() => ({ log: mockedDeps.auditLog })),
}));

vi.mock('@/services/orderNotifications', () => ({
    updateLiveActivity: mockedDeps.updateLiveActivity,
    notifyCustomerPrepTimeUpdated: mockedDeps.notifyCustomerPrepTimeUpdated,
    notifyDriverPrepTimeUpdated: mockedDeps.notifyDriverPrepTimeUpdated,
    notifyAdminsPrepTimeExtended: mockedDeps.notifyAdminsPrepTimeExtended,
}));

vi.mock('@/repositories/OrderEventRepository', () => ({
    emitOrderEvent: mockedDeps.emitOrderEvent,
}));

vi.mock('@/services/driverServices.init', () => ({
    getDispatchService: vi.fn(() => ({
        rescheduleEarlyDispatch: mockedDeps.rescheduleEarlyDispatch,
    })),
}));

vi.mock('@/lib/cache', () => ({
    cache: {
        get: mockedDeps.cacheGet,
    },
}));

function makeDbOrder(overrides?: Partial<any>) {
    return {
        id: 'order-1',
        userId: 'customer-1',
        businessId: 'business-1',
        driverId: 'driver-1',
        status: 'PREPARING',
        preparationMinutes: 15,
        preparingAt: new Date('2026-04-15T10:00:00.000Z').toISOString(),
        estimatedReadyAt: new Date('2026-04-15T10:15:00.000Z').toISOString(),
        ...overrides,
    };
}

function makeContext() {
    const previousOrder = makeDbOrder({ preparationMinutes: 15 });
    const updatedOrder = { id: 'order-1', status: 'PREPARING', preparationMinutes: 25 };
    const dbOrderAfter = makeDbOrder({ preparationMinutes: 25, estimatedReadyAt: new Date('2026-04-15T10:25:00.000Z').toISOString() });

    return {
        orderService: {
            orderContainsBusiness: vi.fn(async () => true),
            updatePreparationTime: vi.fn(async () => updatedOrder),
            publishSingleUserOrder: vi.fn(async () => undefined),
            publishAllOrders: vi.fn(async () => undefined),
            orderRepository: {
                findById: vi.fn()
                    .mockResolvedValueOnce(previousOrder)
                    .mockResolvedValueOnce(dbOrderAfter),
            },
        },
        userData: {
            role: 'BUSINESS_OWNER',
            userId: 'business-user-1',
            businessId: 'business-1',
        },
        db: {
            select: vi.fn(() => ({
                from: vi.fn(() => ({
                    where: vi.fn(async () => [{ id: 'admin-1' }, { id: 'admin-2' }]),
                })),
            })),
        },
        notificationService: {},
    } as any;
}

describe('updatePreparationTime resolver', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedDeps.cacheGet.mockResolvedValue(null);
    });

    it('reschedules early dispatch only when the pending early-dispatch state exists', async () => {
        const context = makeContext();
        mockedDeps.cacheGet.mockResolvedValue('pending');

        const result = await updatePreparationTime(null as any, { id: 'order-1', preparationMinutes: 25 }, context);

        expect(context.orderService.orderContainsBusiness).toHaveBeenCalledWith('order-1', 'business-1');
        expect(context.orderService.updatePreparationTime).toHaveBeenCalledWith('order-1', 25);
        expect(mockedDeps.cacheGet).toHaveBeenCalledWith('dispatch:early:order-1');
        expect(mockedDeps.rescheduleEarlyDispatch).toHaveBeenCalledWith(
            'order-1',
            new Date('2026-04-15T10:00:00.000Z').getTime(),
            25,
            context.notificationService,
        );
        expect(mockedDeps.updateLiveActivity).toHaveBeenCalled();
        expect(mockedDeps.notifyCustomerPrepTimeUpdated).toHaveBeenCalledWith(context.notificationService, 'customer-1', 'order-1', 25);
        expect(mockedDeps.notifyDriverPrepTimeUpdated).toHaveBeenCalledWith(context.notificationService, 'driver-1', 'order-1', 25);
        expect(mockedDeps.notifyAdminsPrepTimeExtended).toHaveBeenCalledWith(
            context.notificationService,
            ['admin-1', 'admin-2'],
            'order-1',
            10,
            25,
        );
        expect(mockedDeps.emitOrderEvent).toHaveBeenCalledWith(
            expect.objectContaining({ orderId: 'order-1', eventType: 'PREP_TIME_UPDATED' }),
        );
        expect(mockedDeps.auditLog).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ id: 'order-1', status: 'PREPARING', preparationMinutes: 25 });
    });

    it('does not reschedule early dispatch when dispatch already fired', async () => {
        const context = makeContext();
        mockedDeps.cacheGet.mockResolvedValue('fired');

        await updatePreparationTime(null as any, { id: 'order-1', preparationMinutes: 20 }, context);

        expect(mockedDeps.rescheduleEarlyDispatch).not.toHaveBeenCalled();
        expect(mockedDeps.notifyCustomerPrepTimeUpdated).toHaveBeenCalledWith(context.notificationService, 'customer-1', 'order-1', 20);
    });
});