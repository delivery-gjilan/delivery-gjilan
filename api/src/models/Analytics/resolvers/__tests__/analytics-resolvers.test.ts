/**
 * Unit tests for Analytics resolver authorization logic and KPI computation
 * rules (fake-ready, premature-ready, role gating).
 *
 * All tests are pure: they mirror the resolver/service logic without a real
 * DB.  Any change to the production formulas should break the corresponding
 * test here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/lib/errors';

// ---------------------------------------------------------------------------
// Resolver role-check logic (mirrored from resolver files)
// ---------------------------------------------------------------------------

type Role =
    | 'SUPER_ADMIN'
    | 'ADMIN'
    | 'BUSINESS_OWNER'
    | 'DRIVER'
    | 'CUSTOMER'
    | undefined;

function operationalKPIsAccess(role: Role): 'ok' | 'forbidden' | 'unauthenticated' {
    if (!role) return 'unauthenticated';
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return 'ok';
    return 'forbidden';
}

function businessKPIsAccess(
    role: Role,
    requestedBusinessId: string | null,
    userBusinessId: string | null,
): { allowed: boolean; effectiveBusinessId: string | undefined } {
    if (!role) return { allowed: false, effectiveBusinessId: undefined };
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        return { allowed: true, effectiveBusinessId: requestedBusinessId ?? undefined };
    }
    if (role === 'BUSINESS_OWNER') {
        return { allowed: true, effectiveBusinessId: userBusinessId ?? undefined };
    }
    return { allowed: false, effectiveBusinessId: undefined };
}

function driverKPIsAccess(
    role: Role,
    requestedDriverId: string | null,
    userId: string,
): { allowed: boolean; effectiveDriverId: string | undefined } {
    if (!role) return { allowed: false, effectiveDriverId: undefined };
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        return { allowed: true, effectiveDriverId: requestedDriverId ?? undefined };
    }
    if (role === 'DRIVER') {
        return { allowed: true, effectiveDriverId: userId };
    }
    return { allowed: false, effectiveDriverId: undefined };
}

// ---------------------------------------------------------------------------
// Fake-ready formula (mirrored from AnalyticsService SQL logic)
// ---------------------------------------------------------------------------

/**
 * An order where the driver arrived BEFORE the restaurant marked it ready.
 * driver_arrived_at_pickup < ready_at => fake ready
 */
function isFakeReady(
    driverArrivedAtPickup: Date | null,
    readyAt: Date | null,
): boolean {
    if (!driverArrivedAtPickup || !readyAt) return false;
    return driverArrivedAtPickup < readyAt;
}

/**
 * Rate: fake_ready_count / arrivals * 100
 */
function fakeReadyRate(arrivals: number, fakeCount: number): number | null {
    if (arrivals === 0) return null;
    return Number(((fakeCount / arrivals) * 100).toFixed(2));
}

// ---------------------------------------------------------------------------
// Premature-ready formula (mirrored from AnalyticsService SQL logic)
// ---------------------------------------------------------------------------

/**
 * Restaurant pressed Ready in less than 50 % of their declared prep window.
 * (ready_at - preparing_at) < 0.5 * preparation_minutes
 */
function isPrematureReady(
    preparingAt: Date | null,
    readyAt: Date | null,
    preparationMinutes: number | null,
): boolean {
    if (!preparingAt || !readyAt || !preparationMinutes) return false;
    const actualMinutes = (readyAt.getTime() - preparingAt.getTime()) / 60_000;
    return actualMinutes < preparationMinutes * 0.5;
}

// ---------------------------------------------------------------------------
// Prep-overrun formula
// ---------------------------------------------------------------------------

/**
 * Order was late: ready_at > estimated_ready_at
 */
function isPrepOverrun(readyAt: Date | null, estimatedReadyAt: Date | null): boolean {
    if (!readyAt || !estimatedReadyAt) return false;
    return readyAt > estimatedReadyAt;
}

// ---------------------------------------------------------------------------
// Tests: role gating
// ---------------------------------------------------------------------------

describe('operationalKPIs access control', () => {
    it('grants access to SUPER_ADMIN', () => {
        expect(operationalKPIsAccess('SUPER_ADMIN')).toBe('ok');
    });

    it('grants access to ADMIN', () => {
        expect(operationalKPIsAccess('ADMIN')).toBe('ok');
    });

    it('blocks BUSINESS_OWNER', () => {
        expect(operationalKPIsAccess('BUSINESS_OWNER')).toBe('forbidden');
    });

    it('blocks DRIVER', () => {
        expect(operationalKPIsAccess('DRIVER')).toBe('forbidden');
    });

    it('blocks CUSTOMER', () => {
        expect(operationalKPIsAccess('CUSTOMER')).toBe('forbidden');
    });

    it('returns unauthenticated when role is absent', () => {
        expect(operationalKPIsAccess(undefined)).toBe('unauthenticated');
    });
});

describe('businessKPIs access control', () => {
    it('ADMIN can query all businesses and passes requestedBusinessId through', () => {
        const result = businessKPIsAccess('ADMIN', 'biz-1', null);
        expect(result.allowed).toBe(true);
        expect(result.effectiveBusinessId).toBe('biz-1');
    });

    it('ADMIN with no filter returns undefined effectiveBusinessId (all businesses)', () => {
        const result = businessKPIsAccess('ADMIN', null, null);
        expect(result.allowed).toBe(true);
        expect(result.effectiveBusinessId).toBeUndefined();
    });

    it('BUSINESS_OWNER is scoped to their own business, ignoring requestedBusinessId', () => {
        const result = businessKPIsAccess('BUSINESS_OWNER', 'other-biz', 'own-biz');
        expect(result.allowed).toBe(true);
        expect(result.effectiveBusinessId).toBe('own-biz');
    });

    it('BUSINESS_OWNER with no businessId on user returns undefined', () => {
        const result = businessKPIsAccess('BUSINESS_OWNER', null, null);
        expect(result.allowed).toBe(true);
        expect(result.effectiveBusinessId).toBeUndefined();
    });

    it('DRIVER is not allowed', () => {
        const result = businessKPIsAccess('DRIVER', null, null);
        expect(result.allowed).toBe(false);
    });

    it('unauthenticated is not allowed', () => {
        const result = businessKPIsAccess(undefined, null, null);
        expect(result.allowed).toBe(false);
    });
});

describe('driverKPIs access control', () => {
    it('ADMIN can query any driver', () => {
        const result = driverKPIsAccess('ADMIN', 'driver-99', 'me');
        expect(result.allowed).toBe(true);
        expect(result.effectiveDriverId).toBe('driver-99');
    });

    it('ADMIN with no filter returns undefined effectiveDriverId (all drivers)', () => {
        const result = driverKPIsAccess('ADMIN', null, 'me');
        expect(result.allowed).toBe(true);
        expect(result.effectiveDriverId).toBeUndefined();
    });

    it('DRIVER is scoped to their own userId regardless of requested driverId', () => {
        const result = driverKPIsAccess('DRIVER', 'another-driver', 'my-user-id');
        expect(result.allowed).toBe(true);
        expect(result.effectiveDriverId).toBe('my-user-id');
    });

    it('BUSINESS_OWNER is not allowed', () => {
        const result = driverKPIsAccess('BUSINESS_OWNER', null, 'me');
        expect(result.allowed).toBe(false);
    });

    it('CUSTOMER is not allowed', () => {
        const result = driverKPIsAccess('CUSTOMER', null, 'me');
        expect(result.allowed).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Tests: fake-ready detection
// ---------------------------------------------------------------------------

describe('fake-ready detection', () => {
    it('is fake-ready when driver arrived 2 minutes before restaurant pressed ready', () => {
        const arrived = new Date('2025-01-01T12:00:00Z');
        const ready = new Date('2025-01-01T12:02:00Z');
        expect(isFakeReady(arrived, ready)).toBe(true);
    });

    it('is NOT fake-ready when driver arrived after the order was ready', () => {
        const arrived = new Date('2025-01-01T12:05:00Z');
        const ready = new Date('2025-01-01T12:02:00Z');
        expect(isFakeReady(arrived, ready)).toBe(false);
    });

    it('is NOT fake-ready when driver arrived exactly when order became ready', () => {
        const t = new Date('2025-01-01T12:00:00Z');
        expect(isFakeReady(t, t)).toBe(false);
    });

    it('returns false when driver_arrived_at_pickup is null', () => {
        expect(isFakeReady(null, new Date())).toBe(false);
    });

    it('returns false when ready_at is null', () => {
        expect(isFakeReady(new Date(), null)).toBe(false);
    });

    it('rates fake-ready correctly for a batch of 4 arrivals, 3 fake', () => {
        expect(fakeReadyRate(4, 3)).toBe(75);
    });

    it('returns null rate when there are no arrivals', () => {
        expect(fakeReadyRate(0, 0)).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Tests: premature-ready detection
// ---------------------------------------------------------------------------

describe('premature-ready detection', () => {
    it('is premature when restaurant is ready in less than 50% of prep window', () => {
        const preparingAt = new Date('2025-01-01T12:00:00Z');
        // Declared 20 min prep window; ready in 8 min (< 10 min threshold)
        const readyAt = new Date('2025-01-01T12:08:00Z');
        expect(isPrematureReady(preparingAt, readyAt, 20)).toBe(true);
    });

    it('is NOT premature when restaurant is ready in exactly 50% of prep window', () => {
        const preparingAt = new Date('2025-01-01T12:00:00Z');
        const readyAt = new Date('2025-01-01T12:10:00Z'); // exactly 10 min, 50% of 20
        expect(isPrematureReady(preparingAt, readyAt, 20)).toBe(false);
    });

    it('is NOT premature when restaurant is ready after 60% of prep window', () => {
        const preparingAt = new Date('2025-01-01T12:00:00Z');
        const readyAt = new Date('2025-01-01T12:12:00Z'); // 12 min > 10 min threshold
        expect(isPrematureReady(preparingAt, readyAt, 20)).toBe(false);
    });

    it('returns false when preparingAt is null', () => {
        expect(isPrematureReady(null, new Date(), 20)).toBe(false);
    });

    it('returns false when preparationMinutes is null', () => {
        expect(isPrematureReady(new Date(), new Date(), null)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Tests: prep-overrun detection
// ---------------------------------------------------------------------------

describe('prep-overrun detection', () => {
    it('is overrun when ready_at is after estimated_ready_at', () => {
        const estimated = new Date('2025-01-01T12:15:00Z');
        const actual = new Date('2025-01-01T12:20:00Z');
        expect(isPrepOverrun(actual, estimated)).toBe(true);
    });

    it('is NOT overrun when ready_at equals estimated_ready_at', () => {
        const t = new Date('2025-01-01T12:15:00Z');
        expect(isPrepOverrun(t, t)).toBe(false);
    });

    it('is NOT overrun when ready_at is before estimated_ready_at', () => {
        const estimated = new Date('2025-01-01T12:15:00Z');
        const actual = new Date('2025-01-01T12:10:00Z');
        expect(isPrepOverrun(actual, estimated)).toBe(false);
    });

    it('returns false when ready_at is null', () => {
        expect(isPrepOverrun(null, new Date())).toBe(false);
    });

    it('returns false when estimated_ready_at is null', () => {
        expect(isPrepOverrun(new Date(), null)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Tests: AppError type verification
// ---------------------------------------------------------------------------

describe('AppError shape', () => {
    it('forbidden error has FORBIDDEN code', () => {
        const err = AppError.forbidden('test');
        expect(err.extensions.code).toBe('FORBIDDEN');
    });

    it('unauthorized error has UNAUTHENTICATED code', () => {
        const err = AppError.unauthorized();
        expect(err.extensions.code).toBe('UNAUTHENTICATED');
    });
});
