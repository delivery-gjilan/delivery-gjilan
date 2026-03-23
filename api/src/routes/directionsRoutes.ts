import { Router, Request, Response } from 'express';
import { decodeJwtToken } from '@/lib/utils/authUtils';
import { cache } from '@/lib/cache';
import logger from '@/lib/logger';

const router = Router();
const log = logger.child({ service: 'DirectionsProxy' });

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN ?? '';

/** 65 s — must be >= the 60 s recalc gate used by all clients. */
const CACHE_TTL_SECONDS = 65;

// ── Auth ─────────────────────────────────────────────────────────────────────

function requireAuth(req: Request, res: Response, next: () => void) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    try {
        const decoded = decodeJwtToken(authHeader.substring(7));
        (req as any).userId = decoded.userId;
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

    const cacheKey = `dir:${safePoints}:s=${withSteps}:l=${lang}`;

    const cached = await cache.get<object>(cacheKey);
    if (cached) {
        res.json(cached);
        return;
    }

    if (!MAPBOX_TOKEN) {
        log.warn('MAPBOX_TOKEN not set — directions unavailable');
        res.status(503).json({ error: 'Directions service unavailable' });
        return;
    }

    const extras = withSteps ? `&steps=true&language=${lang}` : '';
    const mapboxUrl =
        `https://api.mapbox.com/directions/v5/mapbox/driving/${safePoints}` +
        `?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full${extras}`;

    try {
        const upstream = await fetch(mapboxUrl);
        if (!upstream.ok) {
            let mapboxBody: unknown;
            try { mapboxBody = await upstream.json(); } catch { mapboxBody = await upstream.text().catch(() => null); }
            log.error({ status: upstream.status, mapboxBody }, 'Mapbox upstream error');
            res.status(502).json({ error: 'Upstream directions error', mapboxStatus: upstream.status, detail: mapboxBody });
            return;
        }

        const data: any = await upstream.json();
        if (!data.routes?.length) {
            res.status(404).json({ error: 'No route found' });
            return;
        }

        const route = data.routes[0];
        const result: Record<string, unknown> = {
            distanceKm: route.distance / 1000,
            durationMin: route.duration / 60,
            geometry: route.geometry.coordinates as Array<[number, number]>,
        };

        if (withSteps) {
            result.steps = (route.legs ?? []).flatMap((leg: any) =>
                (leg.steps ?? []).map((step: any) => ({
                    instruction: step.maneuver.instruction ?? 'Continue straight',
                    distanceM: step.distance,
                    durationS: step.duration,
                    maneuverType: step.maneuver.type,
                    maneuverModifier: step.maneuver.modifier,
                    maneuverLocation: step.maneuver.location,
                })),
            );
        }

        await cache.set(cacheKey, result, CACHE_TTL_SECONDS);
        res.json(result);
    } catch (err) {
        log.error({ err }, 'Directions proxy error');
        res.status(500).json({ error: 'Internal directions error' });
    }
});

export { router as directionsRouter };
