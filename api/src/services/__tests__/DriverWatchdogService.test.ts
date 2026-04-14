/**
 * Unit tests for DriverWatchdogService.
 *
 * Covers:
 *  - start / stop lifecycle (interval registration, isRunning flag)
 *  - start() idempotency (calling twice doesn't double-register)
 *  - trackHeartbeat schedules stale/disconnected/lost timers at correct delays
 *  - clearDriverTracking cancels pending timers so callbacks never fire
 *  - checkNow delegates to a full DB state reconciliation path
 *  - CONNECTION_THRESHOLDS exported constants match documented values
 *
 * All DB, pubsub & logger dependencies are mocked. Fake timers give us
 * deterministic control over setTimeout / setInterval / clearTimeout.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DriverWatchdogService } from '../DriverWatchdogService';
import { CONNECTION_THRESHOLDS } from '@/repositories/DriverRepository';
import type { DriverRepository } from '@/repositories/DriverRepository';
import type { AuthRepository } from '@/repositories/AuthRepository';

// ── Silence logger ────────────────────────────────────────────────────────────
vi.mock('@/lib/logger', () => ({
    default: { child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));

vi.mock('@/lib/pubsub', () => ({
    pubsub: {},
    publish: vi.fn(),
    topics: {
        allDriversChanged: vi.fn(() => 'drivers:all'),
    },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDriverRepo() {
    return {
        markStaleDrivers: vi.fn().mockResolvedValue([]),
        markDisconnectedDrivers: vi.fn().mockResolvedValue([]),
        markLostDrivers: vi.fn().mockResolvedValue([]),
        markDriverDisconnected: vi.fn().mockResolvedValue(undefined),
        markDriverStaleIfExpired: vi.fn().mockResolvedValue(null),
        markDriverLostIfExpired: vi.fn().mockResolvedValue(null),
        markDriverDisconnectedIfExpired: vi.fn().mockResolvedValue(null),
        getConnectionStatusCounts: vi.fn().mockResolvedValue({ CONNECTED: 0, STALE: 0, LOST: 0, DISCONNECTED: 0 }),
    };
}

function makeAuthRepo() {
    return {
        findDriversByIds: vi.fn().mockResolvedValue([]),
    };
}

// ── CONNECTION_THRESHOLDS constants ───────────────────────────────────────────

describe('CONNECTION_THRESHOLDS', () => {
    it('STALE threshold is 45 seconds', () => expect(CONNECTION_THRESHOLDS.STALE).toBe(45));
    it('DISCONNECTED threshold is 25 seconds', () => expect(CONNECTION_THRESHOLDS.DISCONNECTED).toBe(25));
    it('LOST threshold is 90 seconds', () => expect(CONNECTION_THRESHOLDS.LOST).toBe(90));
    it('LOCATION_THROTTLE is 10 seconds', () => expect(CONNECTION_THRESHOLDS.LOCATION_THROTTLE).toBe(10));
    it('LOCATION_DISTANCE_METERS is 5 metres', () => expect(CONNECTION_THRESHOLDS.LOCATION_DISTANCE_METERS).toBe(5));
});

// ── start / stop lifecycle ────────────────────────────────────────────────────

describe('DriverWatchdogService start/stop', () => {
    let driverRepo: ReturnType<typeof makeDriverRepo>;
    let authRepo: ReturnType<typeof makeAuthRepo>;
    let svc: DriverWatchdogService;

    beforeEach(() => {
        vi.useFakeTimers();
        driverRepo = makeDriverRepo();
        authRepo = makeAuthRepo();
        svc = new DriverWatchdogService(driverRepo as unknown as DriverRepository, authRepo as unknown as AuthRepository);
    });

    afterEach(() => {
        svc.stop();
        vi.useRealTimers();
    });

    it('registers an interval on start()', () => {
        const spy = vi.spyOn(globalThis, 'setInterval');
        svc.start();
        expect(spy).toHaveBeenCalledOnce();
    });

    it('calling start() a second time does not register another interval', () => {
        const spy = vi.spyOn(globalThis, 'setInterval');
        svc.start();
        svc.start();
        expect(spy).toHaveBeenCalledOnce();
    });

    it('stop() clears the interval', () => {
        const spy = vi.spyOn(globalThis, 'clearInterval');
        svc.start();
        svc.stop();
        expect(spy).toHaveBeenCalled();
    });

    it('the watchdog interval fires checkDriverStates every 10 seconds', async () => {
        svc.start();
        // Fast forward one 10-second tick
        await vi.advanceTimersByTimeAsync(10_000);
        expect(driverRepo.markStaleDrivers).toHaveBeenCalledOnce();
    });
});

// ── trackHeartbeat timer scheduling ──────────────────────────────────────────

describe('DriverWatchdogService.trackHeartbeat', () => {
    let driverRepo: ReturnType<typeof makeDriverRepo>;
    let authRepo: ReturnType<typeof makeAuthRepo>;
    let svc: DriverWatchdogService;

    beforeEach(() => {
        vi.useFakeTimers();
        driverRepo = makeDriverRepo();
        authRepo = makeAuthRepo();
        svc = new DriverWatchdogService(driverRepo as unknown as DriverRepository, authRepo as unknown as AuthRepository);
    });

    afterEach(() => {
        svc.stop();
        vi.useRealTimers();
    });

    it('schedules a stale transition after CONNECTION_THRESHOLDS.STALE seconds', async () => {
        const now = Date.now();
        vi.setSystemTime(now);

        // heartbeat was "now" — so stale fires in exactly STALE seconds
        svc.trackHeartbeat('driver-1', new Date(now).toISOString());

        // Just before the threshold — not yet called
        await vi.advanceTimersByTimeAsync((CONNECTION_THRESHOLDS.STALE * 1000) - 1);
        expect(driverRepo.markDriverStaleIfExpired).not.toHaveBeenCalled();

        // At the threshold — fires
        await vi.advanceTimersByTimeAsync(1);
        expect(driverRepo.markDriverStaleIfExpired).toHaveBeenCalledWith('driver-1');
    });

    it('schedules a disconnected transition after CONNECTION_THRESHOLDS.DISCONNECTED seconds', async () => {
        const now = Date.now();
        vi.setSystemTime(now);
        svc.trackHeartbeat('driver-2', new Date(now).toISOString());

        await vi.advanceTimersByTimeAsync(CONNECTION_THRESHOLDS.DISCONNECTED * 1000);
        expect(driverRepo.markDriverDisconnectedIfExpired).toHaveBeenCalledWith('driver-2');
    });

    it('schedules a lost transition after CONNECTION_THRESHOLDS.LOST seconds', async () => {
        const now = Date.now();
        vi.setSystemTime(now);
        svc.trackHeartbeat('driver-3', new Date(now).toISOString());

        await vi.advanceTimersByTimeAsync(CONNECTION_THRESHOLDS.LOST * 1000);
        expect(driverRepo.markDriverLostIfExpired).toHaveBeenCalledWith('driver-3');
    });

    it('re-tracking the same driver cancels the previous timers', async () => {
        const now = Date.now();
        vi.setSystemTime(now);
        svc.trackHeartbeat('driver-1', new Date(now).toISOString());

        // Advance halfway, then re-track (simulating a new heartbeat)
        await vi.advanceTimersByTimeAsync((CONNECTION_THRESHOLDS.STALE * 1000) / 2);
        svc.trackHeartbeat('driver-1', new Date(Date.now()).toISOString());

        // Original stale timer should be cancelled; advance remaining original window
        await vi.advanceTimersByTimeAsync((CONNECTION_THRESHOLDS.STALE * 1000) / 2);
        expect(driverRepo.markDriverStaleIfExpired).not.toHaveBeenCalled();
    });
});

// ── clearDriverTracking ───────────────────────────────────────────────────────

describe('DriverWatchdogService.clearDriverTracking', () => {
    it('prevents stale/lost/disconnected callbacks from firing after clearing', async () => {
        vi.useFakeTimers();
        const driverRepo = makeDriverRepo();
        const svc = new DriverWatchdogService(driverRepo as unknown as DriverRepository, makeAuthRepo() as unknown as AuthRepository);

        const now = Date.now();
        vi.setSystemTime(now);
        svc.trackHeartbeat('driver-x', new Date(now).toISOString());
        svc.clearDriverTracking('driver-x');

        await vi.advanceTimersByTimeAsync(CONNECTION_THRESHOLDS.LOST * 1000 + 1000);

        expect(driverRepo.markDriverStaleIfExpired).not.toHaveBeenCalled();
        expect(driverRepo.markDriverDisconnectedIfExpired).not.toHaveBeenCalled();
        expect(driverRepo.markDriverLostIfExpired).not.toHaveBeenCalled();

        svc.stop();
        vi.useRealTimers();
    });
});

// ── checkNow ──────────────────────────────────────────────────────────────────

describe('DriverWatchdogService.checkNow', () => {
    it('calls all three DB mark methods on a single check', async () => {
        vi.useFakeTimers();
        const driverRepo = makeDriverRepo();
        const svc = new DriverWatchdogService(driverRepo as unknown as DriverRepository, makeAuthRepo() as unknown as AuthRepository);

        await svc.checkNow();

        expect(driverRepo.markStaleDrivers).toHaveBeenCalledOnce();
        expect(driverRepo.markDisconnectedDrivers).toHaveBeenCalledOnce();
        expect(driverRepo.markLostDrivers).toHaveBeenCalledOnce();

        svc.stop();
        vi.useRealTimers();
    });

    it('queries connection status counts during each check', async () => {
        vi.useFakeTimers();
        const driverRepo = makeDriverRepo();
        const svc = new DriverWatchdogService(driverRepo as unknown as DriverRepository, makeAuthRepo() as unknown as AuthRepository);

        await svc.checkNow();
        expect(driverRepo.getConnectionStatusCounts).toHaveBeenCalledOnce();

        svc.stop();
        vi.useRealTimers();
    });
});
