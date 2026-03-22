/**
 * Route utility — fetches road directions via the backend proxy (/api/directions).
 * The Mapbox token lives server-side only; the client passes its JWT for auth.
 * Uses in-memory caching (10-min TTL) and in-flight request deduplication.
 */

import { useAuthStore } from '@/store/authStore';

/** Strip /graphql suffix so we get the API base URL from the same env var. */
const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/graphql$/, '');

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
async function _doFetch(url: string, token: string): Promise<RouteResult | null> {
    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            console.warn('[Route] Directions proxy error:', res.status);
            return null;
        }
        // Proxy returns { distanceKm, durationMin, geometry: [[lon, lat], ...] }
        const data: { distanceKm: number; durationMin: number; geometry: Array<[number, number]> } =
            await res.json();
        if (!data.geometry?.length) return null;

        return {
            coordinates: data.geometry.map(([lon, lat]) => ({
                latitude: lat,
                longitude: lon,
            })),
            distanceKm: data.distanceKm,
            durationMin: data.durationMin,
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
    const token = useAuthStore.getState().token;
    if (!token) {
        console.warn('[Route] No auth token — cannot fetch route');
        return null;
    }

    if (!API_BASE) {
        console.warn('[Route] EXPO_PUBLIC_API_URL not set');
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

    const points = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
    const url = `${API_BASE}/api/directions?points=${encodeURIComponent(points)}`;

    const promise = _doFetch(url, token).then((result) => {
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
