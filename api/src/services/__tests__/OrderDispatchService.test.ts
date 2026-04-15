import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OrderDispatchService } from '../OrderDispatchService';

const mockedOrderNotifications = vi.hoisted(() => ({
    notifyDriversOrderReady: vi.fn(),
    notifyDriversOrderExpanded: vi.fn(),
}));

const mockedInfra = vi.hoisted(() => {
    const cacheStore = new Map<string, unknown>();
    return {
        cacheStore,
        cacheGet: vi.fn(async (key: string) => cacheStore.get(key)),
        cacheSet: vi.fn(async (key: string, value: unknown) => {
            cacheStore.set(key, value);
        }),
        cacheDel: vi.fn(async (key: string) => {
            cacheStore.delete(key);
        }),
        queueGetJob: vi.fn(async () => null),
    };
});

vi.mock('@/lib/logger', () => ({
    default: {
        child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
    },
}));

vi.mock('@/services/orderNotifications', () => ({
    notifyDriversOrderReady: mockedOrderNotifications.notifyDriversOrderReady,
    notifyDriversOrderExpanded: mockedOrderNotifications.notifyDriversOrderExpanded,
}));

vi.mock('@/lib/cache', () => ({
    cache: {
        get: mockedInfra.cacheGet,
        set: mockedInfra.cacheSet,
        del: mockedInfra.cacheDel,
    },
}));

vi.mock('@/queues/earlyDispatchQueue', () => ({
    getEarlyDispatchQueue: () => ({
        getJob: mockedInfra.queueGetJob,
        add: vi.fn(),
    }),
}));

type DriverLike = {
    userId: string;
    onlinePreference: boolean;
    connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'LOST' | 'STALE';
    driverLat?: number | null;
    driverLng?: number | null;
    vehicleType?: 'GAS' | 'ELECTRIC' | null;
};

function makeService(drivers: DriverLike[]) {
    const driverRepository = {
        getAllDrivers: vi.fn(async () => drivers),
    };

    const service = new OrderDispatchService({} as any, driverRepository as any);
    return { service, driverRepository };
}

describe('OrderDispatchService dispatch waves', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        mockedInfra.cacheStore.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('sends wave 1 immediately and wave 2 after accept window for remaining drivers', async () => {
        const { service } = makeService([
            {
                userId: 'driver-near-1',
                onlinePreference: true,
                connectionStatus: 'CONNECTED',
                driverLat: 42.46,
                driverLng: 21.47,
                vehicleType: 'GAS',
            },
            {
                userId: 'driver-near-2',
                onlinePreference: true,
                connectionStatus: 'CONNECTED',
                driverLat: 42.4601,
                driverLng: 21.4701,
                vehicleType: 'ELECTRIC',
            },
            {
                userId: 'driver-far',
                onlinePreference: true,
                connectionStatus: 'CONNECTED',
                driverLat: 42.7,
                driverLng: 21.7,
                vehicleType: 'GAS',
            },
            {
                userId: 'driver-push-only',
                onlinePreference: true,
                connectionStatus: 'DISCONNECTED',
                driverLat: null,
                driverLng: null,
                vehicleType: null,
            },
        ]);

        vi.spyOn(service as any, '_getPickupCoords').mockResolvedValue({ lat: 42.46, lng: 21.47, businessName: 'Biz' });
        vi.spyOn(service as any, '_getOrderRouteDistanceKm').mockResolvedValue(2);
        vi.spyOn(service as any, 'getGasPrioritySettings').mockResolvedValue({ thresholdKm: 5, windowSeconds: 30 });

        await service.dispatchOrder('order-1', {} as any);

        expect(mockedOrderNotifications.notifyDriversOrderReady).toHaveBeenCalledTimes(1);
        const firstWaveIds = mockedOrderNotifications.notifyDriversOrderReady.mock.calls[0][1] as string[];
        expect(firstWaveIds).toEqual(expect.arrayContaining(['driver-near-1', 'driver-near-2', 'driver-push-only']));
        expect(firstWaveIds).not.toContain('driver-far');

        await vi.advanceTimersByTimeAsync(60_000);

        expect(mockedOrderNotifications.notifyDriversOrderExpanded).toHaveBeenCalledTimes(1);
        expect(mockedOrderNotifications.notifyDriversOrderExpanded.mock.calls[0][1]).toEqual(['driver-far']);
    });

    it('cancelDispatch prevents delayed wave-2 expansion', async () => {
        const { service } = makeService([
            {
                userId: 'driver-1',
                onlinePreference: true,
                connectionStatus: 'CONNECTED',
                driverLat: 42.46,
                driverLng: 21.47,
                vehicleType: 'GAS',
            },
            {
                userId: 'driver-2',
                onlinePreference: true,
                connectionStatus: 'CONNECTED',
                driverLat: 42.8,
                driverLng: 21.8,
                vehicleType: 'ELECTRIC',
            },
        ]);

        vi.spyOn(service as any, '_getPickupCoords').mockResolvedValue({ lat: 42.46, lng: 21.47, businessName: 'Biz' });
        vi.spyOn(service as any, '_getOrderRouteDistanceKm').mockResolvedValue(2);
        vi.spyOn(service as any, 'getGasPrioritySettings').mockResolvedValue({ thresholdKm: 5, windowSeconds: 30 });

        await service.dispatchOrder('order-2', {} as any);
        service.cancelDispatch('order-2');

        await vi.advanceTimersByTimeAsync(60_000);
        expect(mockedOrderNotifications.notifyDriversOrderExpanded).not.toHaveBeenCalled();
    });

    it('uses gas-priority split for far orders and then notifies delayed electric wave', async () => {
        const { service } = makeService([
            {
                userId: 'gas-connected',
                onlinePreference: true,
                connectionStatus: 'CONNECTED',
                driverLat: 42.46,
                driverLng: 21.47,
                vehicleType: 'GAS',
            },
            {
                userId: 'electric-connected',
                onlinePreference: true,
                connectionStatus: 'CONNECTED',
                driverLat: 42.4601,
                driverLng: 21.4701,
                vehicleType: 'ELECTRIC',
            },
            {
                userId: 'push-only',
                onlinePreference: true,
                connectionStatus: 'DISCONNECTED',
                driverLat: null,
                driverLng: null,
                vehicleType: null,
            },
        ]);

        vi.spyOn(service as any, '_getPickupCoords').mockResolvedValue({ lat: 42.46, lng: 21.47, businessName: 'Biz' });
        vi.spyOn(service as any, '_getOrderRouteDistanceKm').mockResolvedValue(10);
        vi.spyOn(service as any, 'getGasPrioritySettings').mockResolvedValue({ thresholdKm: 5, windowSeconds: 30 });

        await service.dispatchOrder('order-3', {} as any);

        expect(mockedOrderNotifications.notifyDriversOrderReady).toHaveBeenCalledTimes(1);
        expect(mockedOrderNotifications.notifyDriversOrderReady.mock.calls[0][1]).toEqual(expect.arrayContaining(['gas-connected', 'push-only']));
        expect(mockedOrderNotifications.notifyDriversOrderReady.mock.calls[0][1]).not.toContain('electric-connected');

        await vi.advanceTimersByTimeAsync(30_000);

        expect(mockedOrderNotifications.notifyDriversOrderReady).toHaveBeenCalledTimes(2);
        expect(mockedOrderNotifications.notifyDriversOrderReady.mock.calls[1][1]).toEqual(['electric-connected']);
    });

    it('falls back to notify-all when pickup coordinates are missing', async () => {
        const { service } = makeService([
            {
                userId: 'driver-a',
                onlinePreference: true,
                connectionStatus: 'CONNECTED',
                driverLat: 42.46,
                driverLng: 21.47,
                vehicleType: 'GAS',
            },
            {
                userId: 'driver-b',
                onlinePreference: true,
                connectionStatus: 'DISCONNECTED',
                driverLat: null,
                driverLng: null,
                vehicleType: null,
            },
        ]);

        vi.spyOn(service as any, '_getPickupCoords').mockResolvedValue(null);

        await service.dispatchOrder('order-4', {} as any);
        expect(mockedOrderNotifications.notifyDriversOrderReady).toHaveBeenCalledTimes(1);
        expect(mockedOrderNotifications.notifyDriversOrderReady.mock.calls[0][1]).toEqual(expect.arrayContaining(['driver-a', 'driver-b']));
    });

    it('sends nothing when no eligible drivers are found', async () => {
        const { service } = makeService([
            {
                userId: 'driver-offline',
                onlinePreference: false,
                connectionStatus: 'DISCONNECTED',
                driverLat: null,
                driverLng: null,
                vehicleType: null,
            },
        ]);

        vi.spyOn(service as any, '_getPickupCoords').mockResolvedValue({ lat: 42.46, lng: 21.47, businessName: 'Biz' });
        vi.spyOn(service as any, '_getOrderRouteDistanceKm').mockResolvedValue(1);
        vi.spyOn(service as any, 'getGasPrioritySettings').mockResolvedValue({ thresholdKm: 5, windowSeconds: 30 });

        await service.dispatchOrder('order-5', {} as any);
        expect(mockedOrderNotifications.notifyDriversOrderReady).not.toHaveBeenCalled();
        expect(mockedOrderNotifications.notifyDriversOrderExpanded).not.toHaveBeenCalled();
    });
});
