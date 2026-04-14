import { Router, Request, Response } from 'express';
import { decodeJwtToken } from '@/lib/utils/authUtils';
import { cache } from '@/lib/cache';
import logger from '@/lib/logger';

const router = Router();
const log = logger.child({ service: 'DirectionsProxy' });

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN ?? '';

/** 65 s — must be >= the 60 s recalc gate used by all clients. */
const CACHE_TTL_SECONDS = 65;
/** Round coordinates for cache keys only (Mapbox request keeps original precision). */
const CACHE_KEY_DECIMALS = 5;

type DirectionsResult = Record<string, unknown>;

interface AuthenticatedRequest extends Request {
    userId?: string;
}

// Deduplicate concurrent cache-miss requests for the same route/options.
const inFlightRequests = new Map<string, Promise<DirectionsResult>>();

// ── Auth ─────────────────────────────────────────────────────────────────────

function requireAuth(req: Request, res: Response, next: () => void) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    try {
        const decoded = decodeJwtToken(authHeader.substring(7));
        (req as AuthenticatedRequest).userId = decoded.userId;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * Parse and validate a semicolon-separated "lon,lat;lon,lat" points string.
 * Returns a sanitised string (re-serialised from parsed floats) or null.
 * Defends against SSRF — only real earth coordinate ranges are accepted.
 */
function parsePoints(raw: string): string | null {
    // Only allow digits, minus, dot, comma, semicolon
    if (!/^[-\d.,;]+$/.test(raw)) return null;

    const pairs = raw.split(';');
    if (pairs.length < 2 || pairs.length > 25) return null;

    const validated: string[] = [];
    for (const pair of pairs) {
        const parts = pair.split(',');
        if (parts.length !== 2) return null;
        const lon = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (isNaN(lon) || isNaN(lat)) return null;
        if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;
        // Re-serialise from parsed floats — prevents any injection in the original string
        validated.push(`${lon},${lat}`);
    }

    return validated.join(';');
}

function normalizePointsForCache(points: string): string {
    return points
        .split(';')
        .map((pair) => {
            const [lonRaw, latRaw] = pair.split(',');
            const lon = Number(lonRaw);
            const lat = Number(latRaw);
            return `${lon.toFixed(CACHE_KEY_DECIMALS)},${lat.toFixed(CACHE_KEY_DECIMALS)}`;
        })
        .join(';');
}

async function fetchAndTransformDirections(
    safePoints: string,
    withSteps: boolean,
    lang: string,
): Promise<DirectionsResult> {
    if (!MAPBOX_TOKEN) {
        throw { status: 503, body: { error: 'Directions service unavailable' } };
    }

    const extras = withSteps ? `&steps=true&language=${lang}` : '';
    const mapboxUrl =
        `https://api.mapbox.com/directions/v5/mapbox/driving/${safePoints}` +
        `?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full${extras}`;

    const upstream = await fetch(mapboxUrl);
    if (!upstream.ok) {
        let mapboxBody: unknown;
        try { mapboxBody = await upstream.json(); } catch { mapboxBody = await upstream.text().catch(() => null); }
        log.error({ status: upstream.status, mapboxBody }, 'Mapbox upstream error');
        throw {
            status: 502,
            body: { error: 'Upstream directions error', mapboxStatus: upstream.status, detail: mapboxBody },
        };
    }

    const data = await upstream.json() as { routes?: Array<{ distance: number; duration: number; geometry: { coordinates: Array<[number, number]> }; legs?: Array<{ steps?: Array<{ maneuver: { instruction?: string; type: string; modifier?: string; location: [number, number] }; distance: number; duration: number }> }> }> };
    if (!data.routes?.length) {
        throw { status: 404, body: { error: 'No route found' } };
    }

    const route = data.routes[0];
    const result: DirectionsResult = {
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
        geometry: route.geometry.coordinates as Array<[number, number]>,
    };

    if (withSteps) {
        result.steps = (route.legs ?? []).flatMap((leg) =>
            (leg.steps ?? []).map((step) => ({
                instruction: step.maneuver.instruction ?? 'Continue straight',
                distanceM: step.distance,
                durationS: step.duration,
                maneuverType: step.maneuver.type,
                maneuverModifier: step.maneuver.modifier,
                maneuverLocation: step.maneuver.location,
            })),
        );
    }

    return result;
}

// ── Route ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/directions
 *
 * Query params:
 *   points   (required) Semicolon-separated lon,lat pairs: "lng1,lat1;lng2,lat2[;...]"
 *   steps    (optional) "true" — include turn-by-turn steps in the response
 *   language (optional) BCP 47 language tag for step instructions, default "en"
 *
 * Response: { distanceKm, durationMin, geometry: Array<[number,number]>, steps? }
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    const { points: rawPoints, steps, language } = req.query;

    if (!rawPoints || typeof rawPoints !== 'string') {
        res.status(400).json({ error: 'Missing required query param: points' });
        return;
    }

    const safePoints = parsePoints(rawPoints);
    if (!safePoints) {
        res.status(400).json({ error: 'Invalid points parameter' });
        return;
    }

    const withSteps = steps === 'true';
    const lang = typeof language === 'string' && /^[a-z]{2,5}$/.test(language) ? language : 'en';

    const normalizedPoints = normalizePointsForCache(safePoints);
    const cacheKey = `dir:${normalizedPoints}:s=${withSteps}:l=${lang}`;

    const cached = await cache.get<object>(cacheKey);
    if (cached) {
        res.json(cached);
        return;
    }

    try {
        const existingInFlight = inFlightRequests.get(cacheKey);
        if (existingInFlight) {
            const sharedResult = await existingInFlight;
            res.json(sharedResult);
            return;
        }

        const inFlightPromise = (async () => {
            const freshResult = await fetchAndTransformDirections(safePoints, withSteps, lang);
            await cache.set(cacheKey, freshResult, CACHE_TTL_SECONDS);
            return freshResult;
        })();

        inFlightRequests.set(cacheKey, inFlightPromise);
        inFlightPromise.then(
            () => {
                inFlightRequests.delete(cacheKey);
            },
            () => {
                inFlightRequests.delete(cacheKey);
            },
        );
        const result = await inFlightPromise;
        res.json(result);
    } catch (err) {
        const maybeError = err as { status?: number; body?: unknown };
        if (maybeError?.status && maybeError?.body) {
            if (maybeError.status === 503) {
                log.warn('MAPBOX_TOKEN not set — directions unavailable');
            }
            res.status(maybeError.status).json(maybeError.body);
            return;
        }

        log.error({ err }, 'Directions proxy error');
        res.status(500).json({ error: 'Internal directions error' });
    }
});

export { router as directionsRouter };
