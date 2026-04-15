import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assignDriverToOrder } from '../assignDriverToOrder';

const mockedDeps = vi.hoisted(() => ({
    auditLog: vi.fn(async () => undefined),
    notifyDriverOrderAssigned: vi.fn(),
    notifyDriverOrderReassigned: vi.fn(),
    cancelDispatch: vi.fn(),
    emitOrderEvent: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/services/AuditLogger', () => ({
    createAuditLogger: vi.fn(() => ({ log: mockedDeps.auditLog })),
}));

vi.mock('@/services/orderNotifications', () => ({
    notifyDriverOrderAssigned: mockedDeps.notifyDriverOrderAssigned,
    notifyDriverOrderReassigned: mockedDeps.notifyDriverOrderReassigned,
}));

vi.mock('@/services/driverServices.init', () => ({
    getDispatchService: vi.fn(() => ({ cancelDispatch: mockedDeps.cancelDispatch })),
}));

vi.mock('@/repositories/OrderEventRepository', () => ({
    emitOrderEvent: mockedDeps.emitOrderEvent,
}));

function makeContext(role: 'DRIVER' | 'SUPER_ADMIN', overrides?: Partial<any>) {
    const dbOrderBefore = {
        id: 'order-1',
        userId: 'customer-1',
        driverId: null,
        status: 'READY',
        dropoffAddress: 'Gjilan',
    };

    const assignedOrder = {
        id: 'order-1',
        status: 'READY',
        driver: { id: 'driver-1', firstName: 'Driver', lastName: 'One' },
    };

    const ctx: any = {
        orderService: {
            orderRepository: {
                findById: vi.fn(async () => dbOrderBefore),
                findUncompletedOrdersByUserId: vi.fn(async () => []),
            },
            assignDriverToOrder: vi.fn(async () => assignedOrder),
            publishSingleUserOrder: vi.fn(async () => undefined),
            publishAllOrders: vi.fn(async () => undefined),
        },
        authService: {
            authRepository: {
                findById: vi.fn(async () => ({
                    id: 'driver-1',
                    role: 'DRIVER',
                    firstName: 'Driver',
                    lastName: 'One',
                })),
            },
        },
        db: {
            query: {
                drivers: {
                    findFirst: vi.fn(async () => ({ maxActiveOrders: 2 })),
                },
            },
        },
        notificationService: {},
        userData: {
            role,
            userId: role === 'DRIVER' ? 'driver-1' : 'admin-1',
        },
    };

    if (overrides) {
        return { ...ctx, ...overrides };
    }

    return ctx;
}

describe('assignDriverToOrder resolver', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects driver assigning a different driverId', async () => {
        const ctx = makeContext('DRIVER');
        await expect(assignDriverToOrder(null as any, { id: 'order-1', driverId: 'driver-2' }, ctx)).rejects.toThrow(
            /Drivers can only assign themselves/,
        );
    });

    it('rejects driver self-assign when status is not READY or PREPARING', async () => {
        const ctx = makeContext('DRIVER');
        ctx.orderService.orderRepository.findById = vi.fn(async () => ({
            id: 'order-1',
            userId: 'customer-1',
            driverId: null,
            status: 'PENDING',
        }));

        await expect(assignDriverToOrder(null as any, { id: 'order-1', driverId: null }, ctx)).rejects.toThrow(
            /Order is not available for driver assignment/,
        );
    });

    it('rejects driver claim when order already belongs to another driver', async () => {
        const ctx = makeContext('DRIVER');
        ctx.orderService.orderRepository.findById = vi.fn(async () => ({
            id: 'order-1',
            userId: 'customer-1',
            driverId: 'driver-other',
            status: 'READY',
        }));

        await expect(assignDriverToOrder(null as any, { id: 'order-1', driverId: null }, ctx)).rejects.toThrow(
            /already been taken by another driver/,
        );
    });

    it('enforces max active orders guard', async () => {
        const ctx = makeContext('DRIVER');
        ctx.orderService.orderRepository.findUncompletedOrdersByUserId = vi.fn(async () => [{ id: 'a' }, { id: 'b' }]);

        await expect(assignDriverToOrder(null as any, { id: 'order-1', driverId: null }, ctx)).rejects.toThrow(
            /maximum number of active orders/,
        );
    });

    it('driver success path uses atomic assignment and cancels dispatch timers', async () => {
        const ctx = makeContext('DRIVER');

        const result = await assignDriverToOrder(null as any, { id: 'order-1', driverId: null }, ctx);

        expect(result).toBeTruthy();
        expect(ctx.orderService.assignDriverToOrder).toHaveBeenCalledWith('order-1', 'driver-1', true);
        expect(mockedDeps.cancelDispatch).toHaveBeenCalledWith('order-1');
        expect(mockedDeps.notifyDriverOrderAssigned).toHaveBeenCalledTimes(1);
        expect(mockedDeps.auditLog).toHaveBeenCalledTimes(1);
    });

    it('super admin reassign notifies previous driver and does not call dispatch cancel', async () => {
        const ctx = makeContext('SUPER_ADMIN');
        ctx.orderService.orderRepository.findById = vi
            .fn()
            .mockResolvedValueOnce({
                id: 'order-1',
                userId: 'customer-1',
                driverId: 'driver-old',
                status: 'READY',
                dropoffAddress: 'Gjilan',
            })
            .mockResolvedValueOnce({
                id: 'order-1',
                userId: 'customer-1',
                driverId: 'driver-new',
                status: 'READY',
                dropoffAddress: 'Gjilan',
            });

        ctx.authService.authRepository.findById = vi.fn(async () => ({
            id: 'driver-new',
            role: 'DRIVER',
            firstName: 'Driver',
            lastName: 'New',
        }));

        await assignDriverToOrder(null as any, { id: 'order-1', driverId: 'driver-new' }, ctx);

        expect(ctx.orderService.assignDriverToOrder).toHaveBeenCalledWith('order-1', 'driver-new', false);
        expect(mockedDeps.cancelDispatch).not.toHaveBeenCalled();
        expect(mockedDeps.notifyDriverOrderReassigned).toHaveBeenCalledWith({}, 'driver-old', 'order-1');
    });
});
