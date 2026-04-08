/**
 * Out-of-Zone Logic Unit Tests
 *
 * Tests the pure logic functions that drive the out-of-zone modal in the
 * mobile-customer app.  No React, React Native, or Apollo — just the
 * plain TypeScript functions/rules extracted or mirrored from:
 *
 *  - mobile-customer/utils/pointInPolygon.ts          (already tested in API but this is the mobile copy)
 *  - mobile-customer/hooks/useServiceZoneCheck.ts     (status derivation)
 *  - mobile-customer/app/(tabs)/home.tsx              (modal trigger decision)
 *  - mobile-customer/components/OutOfZoneSheet.tsx    (validAddresses, isPickedWithinDeliveryZone, step derivation)
 *
 * Run from workspace root:
 *   cd api && npx vitest run --config vitest.config.ts out-of-zone
 *
 * Or from mobile-customer dir if a test runner is added later.
 */

import { describe, it, expect } from 'vitest';
import { isPointInPolygon } from '../pointInPolygon';

// ---------------------------------------------------------------------------
// Shared polygon fixtures
// ---------------------------------------------------------------------------

// Simple axis-aligned square: (lat 1–3, lng 1–3)
const SQUARE = [
    { lat: 1, lng: 1 },
    { lat: 3, lng: 1 },
    { lat: 3, lng: 3 },
    { lat: 1, lng: 3 },
];

// Realistic-ish city polygon (Gjilan area approximation)
const CITY_ZONE = [
    { lat: 42.30, lng: 21.40 },
    { lat: 42.40, lng: 21.40 },
    { lat: 42.40, lng: 21.55 },
    { lat: 42.30, lng: 21.55 },
];

// ===========================================================================
// 1. isPointInPolygon (mobile-customer/utils/pointInPolygon.ts)
// ===========================================================================

describe('isPointInPolygon', () => {
    describe('basic containment', () => {
        it('returns true for a point clearly inside the polygon', () => {
            expect(isPointInPolygon({ lat: 2, lng: 2 }, SQUARE)).toBe(true);
        });

        it('returns false for a point clearly outside the polygon', () => {
            expect(isPointInPolygon({ lat: 0, lng: 0 }, SQUARE)).toBe(false);
            expect(isPointInPolygon({ lat: 5, lng: 5 }, SQUARE)).toBe(false);
        });

        it('returns false for a point on the same lat but outside lng range', () => {
            expect(isPointInPolygon({ lat: 2, lng: 0 }, SQUARE)).toBe(false);
            expect(isPointInPolygon({ lat: 2, lng: 4 }, SQUARE)).toBe(false);
        });

        it('returns true for a city-centre point inside CITY_ZONE', () => {
            expect(isPointInPolygon({ lat: 42.35, lng: 21.47 }, CITY_ZONE)).toBe(true);
        });

        it('returns false for a point outside CITY_ZONE', () => {
            // North of city
            expect(isPointInPolygon({ lat: 42.50, lng: 21.47 }, CITY_ZONE)).toBe(false);
            // West of city
            expect(isPointInPolygon({ lat: 42.35, lng: 21.30 }, CITY_ZONE)).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('returns false for a polygon with fewer than 3 points', () => {
            expect(isPointInPolygon({ lat: 2, lng: 2 }, [{ lat: 1, lng: 1 }, { lat: 3, lng: 3 }])).toBe(false);
        });

        it('returns false for an empty polygon', () => {
            expect(isPointInPolygon({ lat: 2, lng: 2 }, [])).toBe(false);
        });

        it('treats boundary point (on edge) as inside — avoids edge flicker', () => {
            // Point on the left edge of SQUARE at lat=2, lng=1
            expect(isPointInPolygon({ lat: 2, lng: 1 }, SQUARE)).toBe(true);
        });

        it('treats corner point as inside', () => {
            expect(isPointInPolygon({ lat: 1, lng: 1 }, SQUARE)).toBe(true);
        });
    });

    describe('multiple zone containment (OR logic)', () => {
        // Simulates the .some() call in useServiceZoneCheck and OutOfZoneSheet
        const ZONE_A = [
            { lat: 0, lng: 0 },
            { lat: 2, lng: 0 },
            { lat: 2, lng: 2 },
            { lat: 0, lng: 2 },
        ];
        const ZONE_B = [
            { lat: 3, lng: 3 },
            { lat: 5, lng: 3 },
            { lat: 5, lng: 5 },
            { lat: 3, lng: 5 },
        ];

        const zones = [ZONE_A, ZONE_B];

        it('returns true when point is in the first zone', () => {
            const point = { lat: 1, lng: 1 };
            expect(zones.some((z) => isPointInPolygon(point, z))).toBe(true);
        });

        it('returns true when point is in the second zone only', () => {
            const point = { lat: 4, lng: 4 };
            expect(zones.some((z) => isPointInPolygon(point, z))).toBe(true);
        });

        it('returns false when point is in neither zone', () => {
            const point = { lat: 2.5, lng: 2.5 };  // between the two zones
            expect(zones.some((z) => isPointInPolygon(point, z))).toBe(false);
        });
    });
});

// ===========================================================================
// 2. useServiceZoneCheck — status derivation logic
//    Mirrored from mobile-customer/hooks/useServiceZoneCheck.ts
// ===========================================================================

type ServiceZoneStatus = 'loading' | 'inside' | 'outside' | 'unconfigured';

type Zone = {
    isActive: boolean;
    polygon: Array<{ lat: number; lng: number }>;
};

/**
 * Pure version of useServiceZoneCheck logic, extracted for unit testing.
 * All hook dependencies (Apollo, GPS) are replaced with plain objects.
 */
function deriveServiceZoneStatus(params: {
    gpsLoading: boolean;
    gpsLocation: { latitude: number; longitude: number } | null;
    zonesLoading: boolean;
    zones: Zone[] | null;
    permissionStatus: 'granted' | 'denied' | 'undetermined' | null;
    error: boolean;
}): ServiceZoneStatus {
    const { gpsLoading, gpsLocation, zonesLoading, zones, permissionStatus, error } = params;

    // Still waiting on GPS or zones
    if ((gpsLoading && !gpsLocation) || (zonesLoading && !zones)) return 'loading';

    // GPS permission not granted — don't block
    if (permissionStatus && permissionStatus !== 'granted') return 'unconfigured';

    // Query errored with no data — don't block
    if (error && !zones) return 'unconfigured';

    const allZones = zones ?? [];

    // No zones configured — don't block
    if (allZones.length === 0) return 'unconfigured';

    const activeZones = allZones.filter((z) => z.isActive);
    if (activeZones.length === 0) return 'unconfigured';

    // GPS not yet resolved — give benefit of the doubt
    if (!gpsLocation) return 'inside';

    const point = { lat: gpsLocation.latitude, lng: gpsLocation.longitude };
    const insideAny = activeZones.some((zone) => isPointInPolygon(point, zone.polygon));

    return insideAny ? 'inside' : 'outside';
}

const INSIDE_POINT  = { latitude: 2, longitude: 2 };   // inside SQUARE
const OUTSIDE_POINT = { latitude: 5, longitude: 5 };   // outside SQUARE

const ACTIVE_ZONE: Zone = { isActive: true, polygon: SQUARE };
const INACTIVE_ZONE: Zone = { isActive: false, polygon: SQUARE };

describe('useServiceZoneCheck — status derivation', () => {
    describe('loading states', () => {
        it('returns "loading" while GPS is loading and no location yet', () => {
            expect(deriveServiceZoneStatus({
                gpsLoading: true,
                gpsLocation: null,
                zonesLoading: false,
                zones: [ACTIVE_ZONE],
                permissionStatus: 'granted',
                error: false,
            })).toBe('loading');
        });

        it('returns "loading" while zones are loading and no data yet', () => {
            expect(deriveServiceZoneStatus({
                gpsLoading: false,
                gpsLocation: INSIDE_POINT,
                zonesLoading: true,
                zones: null,
                permissionStatus: 'granted',
                error: false,
            })).toBe('loading');
        });

        it('does NOT return "loading" when GPS is loading but location already resolved', () => {
            // Location might be cached from previous render
            const result = deriveServiceZoneStatus({
                gpsLoading: true,
                gpsLocation: INSIDE_POINT,
                zonesLoading: false,
                zones: [ACTIVE_ZONE],
                permissionStatus: 'granted',
                error: false,
            });
            expect(result).not.toBe('loading');
        });
    });

    describe('permission / error fallbacks', () => {
        it('returns "unconfigured" when GPS permission is denied — never blocks user', () => {
            expect(deriveServiceZoneStatus({
                gpsLoading: false,
                gpsLocation: null,
                zonesLoading: false,
                zones: [ACTIVE_ZONE],
                permissionStatus: 'denied',
                error: false,
            })).toBe('unconfigured');
        });

        it('returns "unconfigured" when GPS permission is undetermined', () => {
            expect(deriveServiceZoneStatus({
                gpsLoading: false,
                gpsLocation: null,
                zonesLoading: false,
                zones: [ACTIVE_ZONE],
                permissionStatus: 'undetermined',
                error: false,
            })).toBe('unconfigured');
        });

        it('returns "unconfigured" when zones query errored and no cached data', () => {
            expect(deriveServiceZoneStatus({
                gpsLoading: false,
                gpsLocation: OUTSIDE_POINT,
                zonesLoading: false,
                zones: null,
                permissionStatus: 'granted',
                error: true,
            })).toBe('unconfigured');
        });

        it('still evaluates if zones query errored but cached data exists', () => {
            // error=true but zones is populated (stale cache) — should still classify
            const result = deriveServiceZoneStatus({
                gpsLoading: false,
                gpsLocation: INSIDE_POINT,
                zonesLoading: false,
                zones: [ACTIVE_ZONE],
                permissionStatus: 'granted',
                error: true,
            });
            expect(result).toBe('inside');
        });
    });

    describe('no zones configured', () => {
        it('returns "unconfigured" when zones array is empty', () => {
            expect(deriveServiceZoneStatus({
                gpsLoading: false,
                gpsLocation: OUTSIDE_POINT,
                zonesLoading: false,
                zones: [],
                permissionStatus: 'granted',
                error: false,
            })).toBe('unconfigured');
        });

        it('returns "unconfigured" when all zones are inactive', () => {
            expect(deriveServiceZoneStatus({
                gpsLoading: false,
                gpsLocation: OUTSIDE_POINT,
                zonesLoading: false,
                zones: [INACTIVE_ZONE, INACTIVE_ZONE],
                permissionStatus: 'granted',
                error: false,
            })).toBe('unconfigured');
        });
    });

    describe('GPS location available + active zones', () => {
        it('returns "inside" when GPS is inside an active zone', () => {
            expect(deriveServiceZoneStatus({
                gpsLoading: false,
                gpsLocation: INSIDE_POINT,
                zonesLoading: false,
                zones: [ACTIVE_ZONE],
                permissionStatus: 'granted',
                error: false,
            })).toBe('inside');
        });

        it('returns "outside" when GPS is outside all active zones', () => {
            expect(deriveServiceZoneStatus({
                gpsLoading: false,
                gpsLocation: OUTSIDE_POINT,
                zonesLoading: false,
                zones: [ACTIVE_ZONE],
                permissionStatus: 'granted',
                error: false,
            })).toBe('outside');
        });

        it('returns "inside" when GPS is inside at least one of multiple zones', () => {
            const ZONE_B: Zone = {
                isActive: true,
                polygon: [
                    { lat: 4, lng: 4 },
                    { lat: 6, lng: 4 },
                    { lat: 6, lng: 6 },
                    { lat: 4, lng: 6 },
                ],
            };
            expect(deriveServiceZoneStatus({
                gpsLoading: false,
                gpsLocation: { latitude: 5, longitude: 5 },  // inside ZONE_B
                zonesLoading: false,
                zones: [ACTIVE_ZONE, ZONE_B],
                permissionStatus: 'granted',
                error: false,
            })).toBe('inside');
        });

        it('ignores inactive zones when evaluating containment', () => {
            // GPS is inside the inactive zone's area but the zone is not active
            expect(deriveServiceZoneStatus({
                gpsLoading: false,
                gpsLocation: INSIDE_POINT,
                zonesLoading: false,
                zones: [INACTIVE_ZONE],
                permissionStatus: 'granted',
                error: false,
            })).toBe('unconfigured');
        });

        it('returns "inside" when GPS not yet resolved (benefit of the doubt)', () => {
            expect(deriveServiceZoneStatus({
                gpsLoading: false,
                gpsLocation: null,
                zonesLoading: false,
                zones: [ACTIVE_ZONE],
                permissionStatus: 'granted',
                error: false,
            })).toBe('inside');
        });
    });
});

// ===========================================================================
// 3. Modal trigger decision logic
//    Mirrored from mobile-customer/app/(tabs)/home.tsx
// ===========================================================================

/**
 * Pure decision function for whether to open the out-of-zone modal.
 * Mirrors the effect in home.tsx:
 *
 *   if (zoneStatus === 'outside' && !hasActiveOrder && !sessionPromptSuppressedForSession)
 *     setZoneSheetVisible(true)
 *   hasEvaluatedInitPromptForSession = true
 */
function shouldShowOutOfZoneModal(params: {
    zoneStatus: ServiceZoneStatus;
    hasActiveOrder: boolean;
    hasActiveOrderLoading: boolean;
    hasEvaluatedInitPromptForSession: boolean;
    sessionPromptSuppressedForSession: boolean;
}): boolean {
    const { zoneStatus, hasActiveOrder, hasActiveOrderLoading, hasEvaluatedInitPromptForSession, sessionPromptSuppressedForSession } = params;

    // Already evaluated — don't show again in same session
    if (hasEvaluatedInitPromptForSession) return false;

    // Still loading — can't evaluate yet
    if (zoneStatus === 'loading' || hasActiveOrderLoading) return false;

    return zoneStatus === 'outside' && !hasActiveOrder && !sessionPromptSuppressedForSession;
}

describe('out-of-zone modal trigger logic', () => {
    const BASE = {
        zoneStatus: 'outside' as ServiceZoneStatus,
        hasActiveOrder: false,
        hasActiveOrderLoading: false,
        hasEvaluatedInitPromptForSession: false,
        sessionPromptSuppressedForSession: false,
    };

    it('shows the modal on first evaluation when outside zone with no active order', () => {
        expect(shouldShowOutOfZoneModal(BASE)).toBe(true);
    });

    it('does NOT show modal when inside zone', () => {
        expect(shouldShowOutOfZoneModal({ ...BASE, zoneStatus: 'inside' })).toBe(false);
    });

    it('does NOT show modal when zone is unconfigured', () => {
        expect(shouldShowOutOfZoneModal({ ...BASE, zoneStatus: 'unconfigured' })).toBe(false);
    });

    it('does NOT show modal while zone status is still loading', () => {
        expect(shouldShowOutOfZoneModal({ ...BASE, zoneStatus: 'loading' })).toBe(false);
    });

    it('does NOT show modal while active-order loading is in progress', () => {
        expect(shouldShowOutOfZoneModal({ ...BASE, hasActiveOrderLoading: true })).toBe(false);
    });

    it('does NOT show modal when user has an active order (suppresses zone gate)', () => {
        expect(shouldShowOutOfZoneModal({ ...BASE, hasActiveOrder: true })).toBe(false);
    });

    it('does NOT show modal when session was already suppressed (e.g. active order resolved mid-session)', () => {
        expect(shouldShowOutOfZoneModal({ ...BASE, sessionPromptSuppressedForSession: true })).toBe(false);
    });

    it('does NOT show modal a second time in the same session (hasEvaluated=true)', () => {
        expect(shouldShowOutOfZoneModal({ ...BASE, hasEvaluatedInitPromptForSession: true })).toBe(false);
    });

    it('shows modal again after user logs out+in (fresh session flags)', () => {
        // Both evaluated and suppressed flags reset on user change, so fresh session = show again
        expect(shouldShowOutOfZoneModal({
            ...BASE,
            hasEvaluatedInitPromptForSession: false,
            sessionPromptSuppressedForSession: false,
        })).toBe(true);
    });

    it('does NOT show modal when both outside AND has active order', () => {
        // AWAITING_APPROVAL orders count as active — should suppress modal while order is pending
        expect(shouldShowOutOfZoneModal({
            ...BASE,
            zoneStatus: 'outside',
            hasActiveOrder: true,
        })).toBe(false);
    });
});

// ===========================================================================
// 4. validAddresses filtering logic
//    Mirrored from OutOfZoneSheet.tsx — only shows addresses inside zones
// ===========================================================================

type Address = { id: string; latitude: number; longitude: number; addressName: string };

/**
 * Mirrors:
 *   const validAddresses = effectiveZones.length > 0
 *     ? allAddresses.filter((addr) => effectiveZones.some((z) => isPointInPolygon(...)))
 *     : allAddresses;
 */
function filterValidAddresses(addresses: Address[], effectiveZones: Zone[]): Address[] {
    if (effectiveZones.length === 0) return addresses;
    return addresses.filter((addr) =>
        effectiveZones.some((zone) =>
            isPointInPolygon({ lat: addr.latitude, lng: addr.longitude }, zone.polygon),
        ),
    );
}

const ADDR_INSIDE:  Address = { id: 'a1', latitude: 2,    longitude: 2,    addressName: 'Home'   };
const ADDR_OUTSIDE: Address = { id: 'a2', latitude: 10,   longitude: 10,   addressName: 'Office' };
const ADDR_BORDER:  Address = { id: 'a3', latitude: 1,    longitude: 1,    addressName: 'Corner' };

describe('validAddresses filtering (OutOfZoneSheet)', () => {
    it('returns only in-zone addresses when zones are configured', () => {
        const result = filterValidAddresses(
            [ADDR_INSIDE, ADDR_OUTSIDE],
            [ACTIVE_ZONE],
        );
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('a1');
    });

    it('returns all addresses when no effective zones are configured', () => {
        const result = filterValidAddresses([ADDR_INSIDE, ADDR_OUTSIDE], []);
        expect(result).toHaveLength(2);
    });

    it('returns an empty array when all addresses are outside all zones', () => {
        const result = filterValidAddresses([ADDR_OUTSIDE], [ACTIVE_ZONE]);
        expect(result).toHaveLength(0);
    });

    it('includes a border address (boundary counts as inside)', () => {
        const result = filterValidAddresses([ADDR_BORDER], [ACTIVE_ZONE]);
        expect(result).toHaveLength(1);
    });

    it('includes an address in any one of multiple zones', () => {
        const ZONE_B: Zone = {
            isActive: true,
            polygon: [
                { lat: 9, lng: 9 },
                { lat: 11, lng: 9 },
                { lat: 11, lng: 11 },
                { lat: 9, lng: 11 },
            ],
        };
        const result = filterValidAddresses(
            [ADDR_INSIDE, ADDR_OUTSIDE],
            [ACTIVE_ZONE, ZONE_B],
        );
        // Both should pass — each is inside one zone
        expect(result).toHaveLength(2);
    });

    it('does not return duplicates for addresses inside multiple overlapping zones', () => {
        const ZONE_OVERLAP: Zone = {
            isActive: true,
            polygon: [
                { lat: 1.5, lng: 1.5 },
                { lat: 3.5, lng: 1.5 },
                { lat: 3.5, lng: 3.5 },
                { lat: 1.5, lng: 3.5 },
            ],
        };
        // ADDR_INSIDE (lat=2, lng=2) is inside both ACTIVE_ZONE and ZONE_OVERLAP
        const result = filterValidAddresses([ADDR_INSIDE], [ACTIVE_ZONE, ZONE_OVERLAP]);
        // .filter() with .some() never duplicates — should be exactly 1
        expect(result).toHaveLength(1);
    });
});

// ===========================================================================
// 5. isPickedWithinDeliveryZone logic
//    Mirrored from OutOfZoneSheet.tsx — controls confirm-button enabled state
// ===========================================================================

/**
 * Mirrors:
 *   const isPickedWithinDeliveryZone = useMemo(() => {
 *     if (!pickedCoord) return false;
 *     if (effectiveZones.length === 0) return true;
 *     return effectiveZones.some((zone) => isPointInPolygon(...));
 *   }, [pickedCoord, effectiveZones]);
 */
function isPickedWithinDeliveryZone(
    pickedCoord: { latitude: number; longitude: number } | null,
    effectiveZones: Zone[],
): boolean {
    if (!pickedCoord) return false;
    if (effectiveZones.length === 0) return true;
    return effectiveZones.some((zone) =>
        isPointInPolygon({ lat: pickedCoord.latitude, lng: pickedCoord.longitude }, zone.polygon),
    );
}

describe('isPickedWithinDeliveryZone (OutOfZoneSheet confirm button)', () => {
    it('returns false when no coord is picked yet (button stays disabled)', () => {
        expect(isPickedWithinDeliveryZone(null, [ACTIVE_ZONE])).toBe(false);
    });

    it('returns true when no zones are configured (no delivery restriction)', () => {
        expect(isPickedWithinDeliveryZone({ latitude: 2, longitude: 2 }, [])).toBe(true);
    });

    it('returns true when picked coord is inside the zone', () => {
        expect(isPickedWithinDeliveryZone({ latitude: 2, longitude: 2 }, [ACTIVE_ZONE])).toBe(true);
    });

    it('returns false when picked coord is outside all zones', () => {
        expect(isPickedWithinDeliveryZone({ latitude: 10, longitude: 10 }, [ACTIVE_ZONE])).toBe(false);
    });

    it('returns true when picked coord is on the zone boundary', () => {
        expect(isPickedWithinDeliveryZone({ latitude: 1, longitude: 1 }, [ACTIVE_ZONE])).toBe(true);
    });

    it('shows warning when the user moves the pin outside the zone', () => {
        // This mirrors !isPickedWithinDeliveryZone condition that shows the orange warning
        const outsideZone = isPickedWithinDeliveryZone({ latitude: 0, longitude: 0 }, [ACTIVE_ZONE]);
        expect(!outsideZone).toBe(true);
    });
});

// ===========================================================================
// 6. Step derivation logic
//    Mirrored from OutOfZoneSheet.tsx
// ===========================================================================

type Step = 'choice' | 'addresses' | 'map' | 'save-prompt';

/**
 * Mirrors:
 *   const dataReady = !addressesLoading && !zonesLoading;
 *   const step: Step = userStep ?? (dataReady
 *     ? (validAddresses.length > 0 ? 'choice' : 'addresses')
 *     : 'addresses');
 */
function deriveStep(params: {
    userStep: Step | null;
    addressesLoading: boolean;
    zonesLoading: boolean;
    validAddressCount: number;
}): Step {
    const { userStep, addressesLoading, zonesLoading, validAddressCount } = params;
    const dataReady = !addressesLoading && !zonesLoading;
    return userStep ?? (dataReady
        ? (validAddressCount > 0 ? 'choice' : 'addresses')
        : 'addresses');
}

describe('OutOfZoneSheet step derivation', () => {
    it('shows "addresses" step while data is loading (safe default)', () => {
        expect(deriveStep({ userStep: null, addressesLoading: true, zonesLoading: false, validAddressCount: 2 })).toBe('addresses');
        expect(deriveStep({ userStep: null, addressesLoading: false, zonesLoading: true, validAddressCount: 2 })).toBe('addresses');
    });

    it('shows "choice" step when data is ready and there are valid in-zone addresses', () => {
        expect(deriveStep({ userStep: null, addressesLoading: false, zonesLoading: false, validAddressCount: 1 })).toBe('choice');
        expect(deriveStep({ userStep: null, addressesLoading: false, zonesLoading: false, validAddressCount: 3 })).toBe('choice');
    });

    it('shows "addresses" step when data is ready but no valid in-zone addresses', () => {
        expect(deriveStep({ userStep: null, addressesLoading: false, zonesLoading: false, validAddressCount: 0 })).toBe('addresses');
    });

    it('honours userStep when explicitly set — overrides auto-derivation', () => {
        expect(deriveStep({ userStep: 'map', addressesLoading: false, zonesLoading: false, validAddressCount: 2 })).toBe('map');
        expect(deriveStep({ userStep: 'save-prompt', addressesLoading: true, zonesLoading: true, validAddressCount: 0 })).toBe('save-prompt');
    });

    it('choice step requires at least 1 valid address — boundary', () => {
        expect(deriveStep({ userStep: null, addressesLoading: false, zonesLoading: false, validAddressCount: 0 })).toBe('addresses');
        expect(deriveStep({ userStep: null, addressesLoading: false, zonesLoading: false, validAddressCount: 1 })).toBe('choice');
    });
});

// ===========================================================================
// 7. Effective zone selection (service zones take priority)
//    Mirrored from both OutOfZoneSheet.tsx and useServiceZoneCheck.ts
// ===========================================================================

type ZoneWithServiceFlag = Zone & { isServiceZone: boolean };

/**
 * Mirrors the priority rule in OutOfZoneSheet and useServiceZoneCheck:
 *   const serviceZones = activeZones.filter((z) => z.isServiceZone);
 *   const effectiveZones = serviceZones.length > 0 ? serviceZones : activeZones;
 */
function resolveEffectiveZones(zones: ZoneWithServiceFlag[]): ZoneWithServiceFlag[] {
    const activeZones = zones.filter((z) => z.isActive);
    const serviceZones = activeZones.filter((z) => z.isServiceZone);
    return serviceZones.length > 0 ? serviceZones : activeZones;
}

describe('effective zone selection (service zones take priority)', () => {
    const makeZone = (isActive: boolean, isServiceZone: boolean): ZoneWithServiceFlag => ({
        isActive,
        isServiceZone,
        polygon: SQUARE,
    });

    it('returns service zones when any exist', () => {
        const zones = [
            makeZone(true, false),   // regular
            makeZone(true, true),    // service zone
        ];
        const result = resolveEffectiveZones(zones);
        expect(result).toHaveLength(1);
        expect(result[0].isServiceZone).toBe(true);
    });

    it('falls back to all active zones when no service zones exist', () => {
        const zones = [
            makeZone(true, false),
            makeZone(true, false),
        ];
        const result = resolveEffectiveZones(zones);
        expect(result).toHaveLength(2);
    });

    it('does not include inactive zones in fallback', () => {
        const zones = [
            makeZone(true, false),
            makeZone(false, false),  // inactive
        ];
        const result = resolveEffectiveZones(zones);
        expect(result).toHaveLength(1);
        expect(result[0].isActive).toBe(true);
    });

    it('does not include inactive service zones', () => {
        // If the only service zone is inactive, fall back to active regular zones
        const zones = [
            makeZone(false, true),  // inactive service zone
            makeZone(true, false),  // active regular zone
        ];
        const result = resolveEffectiveZones(zones);
        // No active service zones → falls back to active regular zones
        expect(result).toHaveLength(1);
        expect(result[0].isServiceZone).toBe(false);
    });

    it('returns empty array when all zones are inactive', () => {
        const zones = [makeZone(false, false), makeZone(false, true)];
        const result = resolveEffectiveZones(zones);
        expect(result).toHaveLength(0);
    });
});
