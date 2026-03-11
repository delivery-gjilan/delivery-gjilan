const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const ROUTE_CACHE_TTL_MS = 30000;

type RouteResult = { distanceKm: number; durationMin: number; geometry: Array<[number, number]> };
const routeCache = new Map<string, { value: RouteResult; timestamp: number }>();
const inFlightRoutes = new Map<string, Promise<RouteResult | null>>();

type MinuteBucket = { minute: number; count: number };
const MAX_BUCKETS = 60;

const metrics = {
    networkCalls: 0,
    cacheHits: 0,
    inFlightDedupHits: 0,
    abortedCalls: 0,
    failedCalls: 0,
    successfulCalls: 0,
    recentMinuteBuckets: [] as MinuteBucket[],
};

function recordNetworkCall(): void {
    metrics.networkCalls += 1;
    const minute = Math.floor(Date.now() / 60000);
    const last = metrics.recentMinuteBuckets[metrics.recentMinuteBuckets.length - 1];
    if (last && last.minute === minute) {
        last.count += 1;
    } else {
        metrics.recentMinuteBuckets.push({ minute, count: 1 });
    }
    if (metrics.recentMinuteBuckets.length > MAX_BUCKETS) {
        metrics.recentMinuteBuckets.splice(0, metrics.recentMinuteBuckets.length - MAX_BUCKETS);
    }
}

export function getDirectionsTelemetry() {
    const currentMinute = Math.floor(Date.now() / 60000);
    const lastMinute = currentMinute - 1;
    const lastMinuteCalls = metrics.recentMinuteBuckets
        .filter((b) => b.minute === lastMinute)
        .reduce((sum, b) => sum + b.count, 0);

    const cacheRequests = metrics.cacheHits + metrics.networkCalls;
    const cacheHitRate = cacheRequests > 0 ? metrics.cacheHits / cacheRequests : 0;

    return {
        ...metrics,
        lastMinuteCalls,
        cacheHitRate,
    };
}

interface DirectionsResponse {
    routes: Array<{
        distance: number; // in meters
        duration: number; // in seconds
        geometry: {
            coordinates: Array<[number, number]>;
            type: string;
        };
    }>;
}

/**
 * Calculate route distance between two coordinates using Mapbox Directions API
 * @param from - Starting coordinates [longitude, latitude]
 * @param to - Destination coordinates [longitude, latitude]
 * @returns Distance in kilometers, duration in minutes, and polyline coordinates, or null if failed
 */
export async function calculateRouteDistance(
    from: { longitude: number; latitude: number },
    to: { longitude: number; latitude: number },
    signal?: AbortSignal
): Promise<{ distanceKm: number; durationMin: number; geometry: Array<[number, number]> } | null> {
    const key = `${from.longitude.toFixed(5)},${from.latitude.toFixed(5)}->${to.longitude.toFixed(5)},${to.latitude.toFixed(5)}`;
    const now = Date.now();
    const cached = routeCache.get(key);
    if (cached && now - cached.timestamp < ROUTE_CACHE_TTL_MS) {
        metrics.cacheHits += 1;
        return cached.value;
    }

    const inFlight = inFlightRoutes.get(key);
    if (inFlight) {
        metrics.inFlightDedupHits += 1;
        return inFlight;
    }

    const promise = (async () => {
        try {
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`;
            recordNetworkCall();

            const response = await fetch(url, { signal });
            if (!response.ok) {
                metrics.failedCalls += 1;
                console.error('Mapbox Directions API error:', response.statusText);
                return null;
            }

            const data: DirectionsResponse = await response.json();

            if (!data.routes || data.routes.length === 0) {
                metrics.failedCalls += 1;
                console.error('No route found');
                return null;
            }

            const route = data.routes[0];
            const result: RouteResult = {
                distanceKm: route.distance / 1000, // Convert meters to kilometers
                durationMin: route.duration / 60,   // Convert seconds to minutes
                geometry: route.geometry.coordinates, // Polyline coordinates
            };

            routeCache.set(key, { value: result, timestamp: Date.now() });
            metrics.successfulCalls += 1;
            return result;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                metrics.abortedCalls += 1;
                return null;
            }
            metrics.failedCalls += 1;
            console.error('Error calculating route distance:', error);
            return null;
        } finally {
            inFlightRoutes.delete(key);
        }
    })();

    inFlightRoutes.set(key, promise);
    return promise;
}
