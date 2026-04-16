import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDirectDispatchOrder } from '../createDirectDispatchOrder';

const mockedDeps = vi.hoisted(() => ({
    createOrder: vi.fn(),
    scheduleEarlyDispatch: vi.fn(async () => undefined),
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

vi.mock('@/services/DirectDispatchService', () => ({
    DirectDispatchService: class {
        constructor(_db: unknown, _driverRepo: unknown, _orderRepo: unknown) {}

        createOrder = mockedDeps.createOrder;
    },
}));

vi.mock('@/repositories/DriverRepository', () => ({
    DriverRepository: class {
        constructor(_db: unknown) {}
    },
}));

vi.mock('@/services/driverServices.init', () => ({
    getDispatchService: vi.fn(() => ({
        scheduleEarlyDispatch: mockedDeps.scheduleEarlyDispatch,
    })),
}));

function makeContext(role: string = 'BUSINESS_OWNER', orderStatus: 'PREPARING' | 'READY' = 'PREPARING') {
    return {
        db: {},
        userData: {
            userId: 'business-user-1',
            role,
            businessId: 'business-1',
        },
        orderService: {
            orderRepository: {},
            getOrderById: vi.fn(async (id: string) => ({ id, status: orderStatus })),
            publishAllOrders: vi.fn(async () => undefined),
        },
        notificationService: {},
    } as any;
}

describe('createDirectDispatchOrder resolver', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedDeps.createOrder.mockResolvedValue({ id: 'direct-order-1' });
    });

    it('creates a PREPARING direct dispatch order and schedules early dispatch with preparation time', async () => {
        const context = makeContext();
        const input = {
            dropOffLocation: { latitude: 42.46, longitude: 21.47, address: 'Gjilan' },
            preparationMinutes: 25,
            recipientPhone: '+38344111222',
            recipientName: 'Customer',
            driverNotes: 'Ring once',
        };

        const result = await createDirectDispatchOrder(null as any, { input }, context);

        expect(mockedDeps.createOrder).toHaveBeenCalledWith(
            {
                businessId: 'business-1',
                dropOffLocation: input.dropOffLocation,
                preparationMinutes: 25,
                recipientPhone: '+38344111222',
                recipientName: 'Customer',
                driverNotes: 'Ring once',
                cashToCollect: null,
            },
            'business-user-1',
        );
        expect(mockedDeps.scheduleEarlyDispatch).toHaveBeenCalledWith('direct-order-1', 25, context.notificationService);
        expect(context.orderService.getOrderById).toHaveBeenCalledWith('direct-order-1');
        expect(result).toEqual({ id: 'direct-order-1', status: 'PREPARING' });
    });

    it('still returns the order when early dispatch scheduling fails', async () => {
        const context = makeContext('BUSINESS_EMPLOYEE');
        mockedDeps.scheduleEarlyDispatch.mockRejectedValueOnce(new Error('queue offline'));

        const result = await createDirectDispatchOrder(
            null as any,
            {
                input: {
                    dropOffLocation: { latitude: 42.46, longitude: 21.47, address: 'Gjilan' },
                    preparationMinutes: 10,
                    recipientPhone: '+38344111222',
                },
            },
            context,
        );

        expect(mockedDeps.createOrder).toHaveBeenCalledTimes(1);
        expect(context.orderService.getOrderById).toHaveBeenCalledWith('direct-order-1');
        expect(result).toEqual({ id: 'direct-order-1', status: 'PREPARING' });
    });

    it('returns a READY order immediately when preparation time is zero', async () => {
        const context = makeContext('BUSINESS_OWNER', 'READY');

        const result = await createDirectDispatchOrder(
            null as any,
            {
                input: {
                    dropOffLocation: { latitude: 42.46, longitude: 21.47, address: 'Gjilan' },
                    preparationMinutes: 0,
                    recipientPhone: '+38344111222',
                },
            },
            context,
        );

        expect(mockedDeps.createOrder).toHaveBeenCalledWith(
            expect.objectContaining({
                preparationMinutes: 0,
                recipientPhone: '+38344111222',
            }),
            'business-user-1',
        );
        expect(mockedDeps.scheduleEarlyDispatch).toHaveBeenCalledWith('direct-order-1', 0, context.notificationService);
        expect(result).toEqual({ id: 'direct-order-1', status: 'READY' });
    });
});