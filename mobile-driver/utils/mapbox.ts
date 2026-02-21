export const MAPBOX_TOKEN =
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN ??
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
    '';

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
let directionsApiCallCount = 0;
export function getDirectionsApiCallCount() {
    return directionsApiCallCount;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DirectionsResponse {
    routes: Array<{
        distance: number; // in meters
        duration: number; // in seconds
        legs?: Array<{
            steps?: Array<{
                distance: number;
                duration: number;
                maneuver: {
                    instruction?: string;
                    type?: string;
                    modifier?: string;
                    location: [number, number];
                };
            }>;
        }>;
        geometry?: {
            coordinates: Array<[number, number]>;
        };
    }>;
}

export interface NavigationStep {
    instruction: string;
    distanceM: number;
    durationS: number;
    maneuverType?: string;
    maneuverModifier?: string;
    maneuverLocation: [number, number];
}

type Coord = { longitude: number; latitude: number };

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

/** Round to 4 decimal places (~11 m precision) for cache key stability. */
function roundCoord(n: number): string {
    return n.toFixed(4);
}

function buildCacheKey(points: Coord[]): string {
    return points.map((p) => `${roundCoord(p.longitude)},${roundCoord(p.latitude)}`).join(';');
}

interface CacheEntry<T> {
    result: T;
    expiresAt: number;
}

/** TTL in ms: 10 min for simple geometry, 5 min for navigation (steps may drift). */
const SIMPLE_TTL = 10 * 60 * 1000;
const NAV_TTL = 5 * 60 * 1000;

const simpleCache = new Map<string, CacheEntry<{
    coordinates: Array<[number, number]>;
    distanceKm: number;
    durationMin: number;
}>>();
const navCache = new Map<string, CacheEntry<{
    coordinates: Array<[number, number]>;
    distanceKm: number;
    durationMin: number;
    steps: NavigationStep[];
}>>();

/** In-flight deduplication: if the same key is being fetched, re-use the Promise. */
const simpleInFlight = new Map<string, Promise<{
    coordinates: Array<[number, number]>;
    distanceKm: number;
    durationMin: number;
} | null>>();
const navInFlight = new Map<string, Promise<{
    coordinates: Array<[number, number]>;
    distanceKm: number;
    durationMin: number;
    steps: NavigationStep[];
} | null>>();

/** Clear all cached route data (useful when logging out or testing). */
export function clearRouteCache(): void {
    simpleCache.clear();
    navCache.clear();
}

// ---------------------------------------------------------------------------
// Internal fetchers
// ---------------------------------------------------------------------------

async function _doFetchSimpleRoute(url: string, key: string): Promise<{
    coordinates: Array<[number, number]>;
    distanceKm: number;
    durationMin: number;
} | null> {
    directionsApiCallCount++;
    console.log('[MAPBOX] Directions API call #', directionsApiCallCount, '| key:', key);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('[MAPBOX] Directions API error:', response.status, response.statusText);
            return null;
        }
        const data: DirectionsResponse = await response.json();
        const route = data.routes?.[0];
        if (!route) {
            console.error('[MAPBOX] No route found for key:', key);
            return null;
        }
        return {
            coordinates: route.geometry?.coordinates ?? [],
            distanceKm: route.distance / 1000,
            durationMin: route.duration / 60,
        };
    } catch (error) {
        console.error('[MAPBOX] Fetch error:', error);
        return null;
    }
}

/**
 * Shared internal function used by both calculateRouteDistance and fetchRouteGeometry.
 * Returns coordinates + distance + duration with caching and in-flight deduplication.
 */
async function _fetchSimpleRoute(from: Coord, to: Coord): Promise<{
    coordinates: Array<[number, number]>;
    distanceKm: number;
    durationMin: number;
} | null> {
    const key = buildCacheKey([from, to]);
    const now = Date.now();

    // Cache hit
    const cached = simpleCache.get(key);
    if (cached && cached.expiresAt > now) {
        return cached.result;
    }

    // In-flight deduplication
    const existing = simpleInFlight.get(key);
    if (existing) return existing;

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?access_token=${MAPBOX_TOKEN}&geometries=geojson`;

    const promise = _doFetchSimpleRoute(url, key).then((result) => {
        simpleInFlight.delete(key);
        if (result) simpleCache.set(key, { result, expiresAt: now + SIMPLE_TTL });
        return result;
    });

    simpleInFlight.set(key, promise);
    return promise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate route distance between two coordinates using Mapbox Directions API.
 * Results are cached for 10 minutes; concurrent identical calls share one request.
 */
export async function calculateRouteDistance(
    from: Coord,
    to: Coord,
): Promise<{ distanceKm: number; durationMin: number } | null> {
    const result = await _fetchSimpleRoute(from, to);
    if (!result) return null;
    return { distanceKm: result.distanceKm, durationMin: result.durationMin };
}

/**
 * Fetch route geometry (polyline + distance + duration).
 * Uses the same cache as calculateRouteDistance — they hit the same endpoint.
 */
export async function fetchRouteGeometry(
    from: Coord,
    to: Coord,
): Promise<{
    coordinates: Array<[number, number]>;
    distanceKm: number;
    durationMin: number;
} | null> {
    return _fetchSimpleRoute(from, to);
}

/**
 * Fetch a full turn-by-turn navigation route with steps and optional waypoints.
 * Results are cached for 5 minutes; concurrent identical calls share one request.
 */
export async function fetchNavigationRoute(
    from: Coord,
    to: Coord,
    waypoints: Coord[] = [],
): Promise<{
    coordinates: Array<[number, number]>;
    distanceKm: number;
    durationMin: number;
    steps: NavigationStep[];
} | null> {
    const allPoints = [from, ...waypoints, to];
    const key = buildCacheKey(allPoints);
    const now = Date.now();

    // Cache hit
    const cached = navCache.get(key);
    if (cached && cached.expiresAt > now) {
        return cached.result;
    }

    // In-flight deduplication
    const existing = navInFlight.get(key);
    if (existing) return existing;

    const pointsStr = allPoints.map((p) => `${p.longitude},${p.latitude}`).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pointsStr}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full&steps=true&language=en`;

    directionsApiCallCount++;
    console.log('[MAPBOX] Directions API call #', directionsApiCallCount, '| key:', key);

    const promise = (async (): Promise<{
        coordinates: Array<[number, number]>;
        distanceKm: number;
        durationMin: number;
        steps: NavigationStep[];
    } | null> => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error('[MAPBOX] Navigation API error:', response.status, response.statusText);
                return null;
            }
            const data: DirectionsResponse = await response.json();
            const route = data.routes?.[0];
            if (!route) {
                console.error('[MAPBOX] No navigation route found for key:', key);
                return null;
            }

            const steps: NavigationStep[] = (route.legs ?? []).flatMap((leg) =>
                (leg.steps ?? []).map((step) => ({
                    instruction: step.maneuver.instruction ?? 'Continue straight',
                    distanceM: step.distance,
                    durationS: step.duration,
                    maneuverType: step.maneuver.type,
                    maneuverModifier: step.maneuver.modifier,
                    maneuverLocation: step.maneuver.location,
                })),
            );

            const result = {
                coordinates: route.geometry?.coordinates ?? [],
                distanceKm: route.distance / 1000,
                durationMin: route.duration / 60,
                steps,
            };

            navCache.set(key, { result, expiresAt: now + NAV_TTL });
            return result;
        } catch (error) {
            console.error('[MAPBOX] Navigation fetch error:', error);
            return null;
        } finally {
            navInFlight.delete(key);
        }
    })();

    navInFlight.set(key, promise);
    return promise;
}
