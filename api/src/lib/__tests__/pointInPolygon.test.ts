/**
 * Unit tests for isPointInPolygon — the ray-casting function used to decide
 * whether a customer's drop-off address falls inside a delivery zone.
 *
 * Incorrect polygon logic could silently apply the wrong delivery fee to
 * every order, so this is high-value coverage.
 */
import { describe, it, expect } from 'vitest';
import { isPointInPolygon } from '../pointInPolygon';

// A simple axis-aligned square centred on (0,0) with side length 2
//  (-1,1)----(1,1)
//    |          |
//  (-1,-1)---(1,-1)
const SQUARE = [
    { lat: 1,  lng: -1 },
    { lat: 1,  lng:  1 },
    { lat: -1, lng:  1 },
    { lat: -1, lng: -1 },
];

// Real-world-ish irregular polygon (roughly the shape of a neighbourhood)
const IRREGULAR = [
    { lat: 42.36, lng: 21.46 },
    { lat: 42.38, lng: 21.46 },
    { lat: 42.38, lng: 21.49 },
    { lat: 42.37, lng: 21.51 },
    { lat: 42.35, lng: 21.50 },
    { lat: 42.35, lng: 21.47 },
];

describe('isPointInPolygon — basic square', () => {
    it('returns true for the centre of the square', () => {
        expect(isPointInPolygon({ lat: 0, lng: 0 }, SQUARE)).toBe(true);
    });

    it('returns true for a corner-adjacent interior point', () => {
        expect(isPointInPolygon({ lat: 0.9, lng: 0.9 }, SQUARE)).toBe(true);
    });

    it('returns false for a point clearly outside', () => {
        expect(isPointInPolygon({ lat: 5, lng: 5 }, SQUARE)).toBe(false);
    });

    it('returns false above the square', () => {
        expect(isPointInPolygon({ lat: 2, lng: 0 }, SQUARE)).toBe(false);
    });

    it('returns false left of the square', () => {
        expect(isPointInPolygon({ lat: 0, lng: -2 }, SQUARE)).toBe(false);
    });
});

describe('isPointInPolygon — edge cases', () => {
    it('returns false when polygon has fewer than 3 vertices', () => {
        const line = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }];
        expect(isPointInPolygon({ lat: 0.5, lng: 0.5 }, line)).toBe(false);
    });

    it('returns false for an empty polygon', () => {
        expect(isPointInPolygon({ lat: 0, lng: 0 }, [])).toBe(false);
    });

    it('handles a single-vertex degenerate polygon', () => {
        expect(isPointInPolygon({ lat: 0, lng: 0 }, [{ lat: 0, lng: 0 }])).toBe(false);
    });
});

describe('isPointInPolygon — irregular real-world polygon', () => {
    it('detects a point clearly inside', () => {
        // Centroid-ish of IRREGULAR
        expect(isPointInPolygon({ lat: 42.37, lng: 21.48 }, IRREGULAR)).toBe(true);
    });

    it('detects a point clearly outside', () => {
        expect(isPointInPolygon({ lat: 42.30, lng: 21.40 }, IRREGULAR)).toBe(false);
    });

    it('detects a point east of the polygon', () => {
        expect(isPointInPolygon({ lat: 42.37, lng: 21.60 }, IRREGULAR)).toBe(false);
    });
});
