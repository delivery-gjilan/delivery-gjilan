/**
 * Route progress utilities — no API calls required.
 *
 * Given the driver's current position and the original Mapbox polyline, these
 * helpers compute how far along the route the driver is and derive a live,
 * decrementing ETA without re-fetching anything.
 *
 * Algorithm:
 *   1. Walk every coordinate in the polyline and find the one closest to the
 *      driver (nearestIndex).
 *   2. Sum Haversine segment lengths from nearestIndex → end to get
 *      remainingDistanceM.
 *   3. Apply the original Mapbox speed ratio (totalDurationSec / totalDistanceM)
 *      to get remainingDurationSec.
 *
 * Accuracy: a city delivery is typically 50–200 polyline points. Nearest-vertex
 * (vs. nearest-point-on-segment) introduces at most half a segment of error —
 * well under 50 m for dense city polylines, acceptable for ETA display.
 */

/** Haversine distance between two lat/lng points, in metres. */
function haversineM(
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number },
): number {
    const R = 6_371_000;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const aVal =
        sinDLat * sinDLat +
        Math.cos((a.latitude * Math.PI) / 180) *
            Math.cos((b.latitude * Math.PI) / 180) *
            sinDLng *
            sinDLng;
    return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

export interface RouteProgress {
    /** Index in the coordinates array nearest to the driver. */
    nearestIndex: number;
    /** Metres remaining from nearestIndex to the end of the route. */
    remainingDistanceM: number;
    /** Seconds remaining, scaled by the original Mapbox speed. */
    remainingDurationSec: number;
    /** 0–1 fraction of the route completed so far. */
    completedFraction: number;
}

/**
 * Compute how far along a Mapbox polyline the driver currently is.
 *
 * @param location         Driver's current GPS position.
 * @param coords           Polyline coordinates from Mapbox — each entry is [longitude, latitude].
 * @param totalDistanceM   Total route distance in metres  (route.distance from RouteData).
 * @param totalDurationSec Total route duration in seconds (route.duration from RouteData).
 */
export function computeRouteProgress(
    location: { latitude: number; longitude: number },
    coords: Array<[number, number]>,
    totalDistanceM: number,
    totalDurationSec: number,
): RouteProgress {
    if (coords.length === 0 || totalDistanceM <= 0) {
        return {
            nearestIndex: 0,
            remainingDistanceM: totalDistanceM,
            remainingDurationSec: totalDurationSec,
            completedFraction: 0,
        };
    }

    // 1. Find the nearest vertex to the driver
    let nearestIndex = 0;
    let minDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
        const c = coords[i]!;
        const d = haversineM(location, { latitude: c[1], longitude: c[0] });
        if (d < minDist) {
            minDist = d;
            nearestIndex = i;
        }
    }

    // 2. Sum remaining segment lengths from nearestIndex to end
    let remainingDistanceM = 0;
    for (let i = nearestIndex; i < coords.length - 1; i++) {
        const a = coords[i]!;
        const b = coords[i + 1]!;
        remainingDistanceM += haversineM(
            { latitude: a[1], longitude: a[0] },
            { latitude: b[1], longitude: b[0] },
        );
    }

    // 3. Scale by the original Mapbox speed ratio
    const speedMps = totalDistanceM / totalDurationSec; // m/s
    const remainingDurationSec =
        speedMps > 0 ? remainingDistanceM / speedMps : totalDurationSec;

    const completedFraction = Math.max(
        0,
        Math.min(1, 1 - remainingDistanceM / totalDistanceM),
    );

    return {
        nearestIndex,
        remainingDistanceM,
        remainingDurationSec,
        completedFraction,
    };
}
