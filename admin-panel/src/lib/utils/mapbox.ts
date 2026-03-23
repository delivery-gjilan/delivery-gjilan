// MAPBOX_TOKEN is no longer exposed to the browser.
// All directions calls go through /api/directions (Next.js server route)
// which reads MAPBOX_TOKEN from the server-side environment.

// Must be >= ROUTE_RECALC_MIN_MS (60 s) in useOrderRouteDistances so the cache
// is always alive for the full recalc-gate window. 65 s gives a small buffer.
const ROUTE_CACHE_TTL_MS = 65000;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql';

function parseJwtExpiryMs(token: string): number | null {
    try {
        const [, payload] = token.split('.');
        if (!payload) return null;
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const decoded = JSON.parse(atob(padded)) as { exp?: number };
        return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
    } catch {
        return null;
    }
}

let directionsRefreshPromise: Promise<string | null> | null = null;

async function getValidAuthToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    // If token is still valid for > 60s, use it
    const expiryMs = parseJwtExpiryMs(token);
    if (expiryMs && expiryMs - Date.now() > 60_000) return token;

    // Refresh the token
    if (directionsRefreshPromise) return directionsRefreshPromise;
    directionsRefreshPromise = (async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return token; // return stale token as fallback
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operationName: 'RefreshToken',
                    query: `mutation RefreshToken($refreshToken: String!) { refreshToken(refreshToken: $refreshToken) { token refreshToken } }`,
                    variables: { refreshToken },
                }),
            });
            const data = await res.json();
            const refreshed = data?.data?.refreshToken;
            if (refreshed?.token) {
                localStorage.setItem('authToken', refreshed.token);
                if (refreshed.refreshToken) localStorage.setItem('refreshToken', refreshed.refreshToken);
                return refreshed.token as string;
            }
        } catch { /* fall through */ }
        return token; // return stale token as last resort
    })().finally(() => { directionsRefreshPromise = null; });
    return directionsRefreshPromise;
}

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

/**
 * Calculate route distance between two coordinates.
 * Proxied through the local Next.js API route (/api/directions) so the
 * Mapbox token never leaves the server.
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
            const token = await getValidAuthToken();
            if (!token) {
                console.warn('[Directions] No auth token — skipping route fetch');
                return null;
            }

            const points = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
            const url = `/api/directions?points=${encodeURIComponent(points)}`;
            recordNetworkCall();

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
                signal,
            });

            // On 401, force-refresh the token and retry once
            if (response.status === 401) {
                const freshToken = await getValidAuthToken();
                if (freshToken && freshToken !== token) {
                    const retry = await fetch(url, {
                        headers: { Authorization: `Bearer ${freshToken}` },
                        signal,
                    });
                    if (retry.ok) {
                        const result: RouteResult = await retry.json();
                        routeCache.set(key, { value: result, timestamp: Date.now() });
                        metrics.successfulCalls += 1;
                        return result;
                    }
                }
                metrics.failedCalls += 1;
                console.error('[Directions] Proxy error: Unauthorized after refresh');
                return null;
            }

            if (!response.ok) {
                metrics.failedCalls += 1;
                console.error('[Directions] Proxy error:', response.statusText);
                return null;
            }

            const result: RouteResult = await response.json();
            routeCache.set(key, { value: result, timestamp: Date.now() });
            metrics.successfulCalls += 1;
            return result;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                metrics.abortedCalls += 1;
                return null;
            }
            metrics.failedCalls += 1;
            console.error('[Directions] Error calculating route distance:', error);
            return null;
        } finally {
            inFlightRoutes.delete(key);
        }
    })();

    inFlightRoutes.set(key, promise);
    return promise;
}
