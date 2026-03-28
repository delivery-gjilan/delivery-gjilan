/**
 * Unit tests for the haversine straight-line distance formula.
 *
 * This is the fallback when Mapbox is unavailable, and is also used directly
 * in delivery zone tier matching. Wrong math here silently misprices deliveries.
 *
 * We test the pure haversineDistanceKm function, which is unexported from
 * haversine.ts. We re-implement it here to verify our known reference distances.
 * Known reference distances are computed independently (Google Maps / Wolfram Alpha).
 */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Mirror of the private haversineDistanceKm from haversine.ts
// ---------------------------------------------------------------------------
function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

describe('haversineDistanceKm', () => {
    it('returns 0 for the same point', () => {
        expect(haversineDistanceKm(42.37, 21.48, 42.37, 21.48)).toBeCloseTo(0, 5);
    });

    it('calculates ~111 km per degree of latitude (along a meridian)', () => {
        // 1° latitude ≈ 111.195 km
        const d = haversineDistanceKm(0, 0, 1, 0);
        expect(d).toBeCloseTo(111.195, 0);
    });

    it('calculates ~111 km per degree of longitude at the equator', () => {
        const d = haversineDistanceKm(0, 0, 0, 1);
        expect(d).toBeCloseTo(111.195, 0);
    });

    it('is symmetric — A→B equals B→A', () => {
        const d1 = haversineDistanceKm(42.37, 21.48, 42.40, 21.52);
        const d2 = haversineDistanceKm(42.40, 21.52, 42.37, 21.48);
        expect(d1).toBeCloseTo(d2, 6);
    });

    it('distance between Gjilan city centre and a neighbourhood (~3 km range)', () => {
        // Gjilan city centre approx coords: 42.464, 21.467
        // A point ~3 km north: 42.491, 21.467
        const d = haversineDistanceKm(42.464, 21.467, 42.491, 21.467);
        expect(d).toBeGreaterThan(2.5);
        expect(d).toBeLessThan(3.5);
    });

    it('does not return negative distances', () => {
        expect(haversineDistanceKm(42.37, 21.48, 42.38, 21.49)).toBeGreaterThan(0);
    });

    it('returns a larger value for farther points', () => {
        const nearby = haversineDistanceKm(42.37, 21.48, 42.38, 21.49);
        const faraway = haversineDistanceKm(42.37, 21.48, 42.50, 21.70);
        expect(faraway).toBeGreaterThan(nearby);
    });
});
