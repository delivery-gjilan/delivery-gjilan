/**
 * Route utility for fetching real road directions via Mapbox Directions API.
 * Uses in-memory caching (10-min TTL) and in-flight request deduplication
 * to minimise API calls — same pattern as the driver app.
 */

const MAPBOX_TOKEN =
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN ??
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
    '';

// ─── Types ──────────────────────────────────────────────────
interface Coord {
    latitude: number;
    longitude: number;
}

interface RouteResult {
    /** Road-following coordinates in {latitude, longitude} format (react-native-maps). */
    coordinates: Coord[];
    /** Driving distance in km. */
    distanceKm: number;
    /** Estimated driving time in minutes. */
    durationMin: number;
}

interface DirectionsResponse {
    routes: Array<{
        distance: number; // metres
        duration: number; // seconds
        geometry?: {
            coordinates: Array<[number, number]>; // [lon, lat]
        };
    }>;
}

// ─── Cache ──────────────────────────────────────────────────
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
    result: RouteResult;
    expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<RouteResult | null>>();

function roundCoord(n: number): string {
    return n.toFixed(4); // ~11 m precision
}

function buildCacheKey(from: Coord, to: Coord): string {
    return `${roundCoord(from.longitude)},${roundCoord(from.latitude)};${roundCoord(to.longitude)},${roundCoord(to.latitude)}`;
}

// ─── Fetch ──────────────────────────────────────────────────
async function _doFetch(url: string): Promise<RouteResult | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.warn('[Route] Directions API error:', res.status);
            return null;
        }
        const data: DirectionsResponse = await res.json();
        const route = data.routes?.[0];
        if (!route?.geometry?.coordinates?.length) return null;

        return {
            coordinates: route.geometry.coordinates.map(([lon, lat]) => ({
                latitude: lat,
                longitude: lon,
            })),
            distanceKm: route.distance / 1000,
            durationMin: route.duration / 60,
        };
    } catch (err) {
        console.warn('[Route] Fetch error:', err);
        return null;
    }
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Fetch a road-following route between two points.
 *
 * - Results are cached for 10 minutes.
 * - Concurrent requests for the same route share a single API call.
 * - Returns `null` if the API fails or no route is found.
 */
export async function fetchRoute(from: Coord, to: Coord): Promise<RouteResult | null> {
    if (!MAPBOX_TOKEN) {
        console.warn('[Route] No Mapbox token — cannot fetch route');
        return null;
    }

    const key = buildCacheKey(from, to);
    const now = Date.now();

    // Cache hit
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) return cached.result;

    // In-flight dedup
    const existing = inFlight.get(key);
    if (existing) return existing;

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`;

    const promise = _doFetch(url).then((result) => {
        inFlight.delete(key);
        if (result) cache.set(key, { result, expiresAt: now + CACHE_TTL });
        return result;
    });

    inFlight.set(key, promise);
    return promise;
}

/** Clear the route cache. */
export function clearRouteCache(): void {
    cache.clear();
}
