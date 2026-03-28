import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN ?? '';
const JWT_SECRET = process.env.JWT_SECRET ?? '';

// ── Server-side in-memory cache ───────────────────────────────────────────────
// Shared across requests within the same Next.js server instance.
// TTL is 65 s — just above the 60 s recalc gate in useOrderRouteDistances.
const CACHE_TTL_MS = 65_000;
const serverCache = new Map<string, { data: unknown; expiresAt: number }>();

// ── JWT verification (HS256, no external deps) ────────────────────────────────

function verifyHS256(token: string): boolean {
    if (!JWT_SECRET) return false;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        const [header, payload, signature] = parts;

        const expected = createHmac('sha256', JWT_SECRET)
            .update(`${header}.${payload}`)
            .digest('base64url');

        if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;

        const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (claims.exp && claims.exp < Date.now() / 1000) return false;

        return true;
    } catch {
        return false;
    }
}

// ── Coordinate validation (SSRF protection) ───────────────────────────────────

function parsePoints(raw: string): string | null {
    if (!/^[-\d.,;]+$/.test(raw)) return null;
    const pairs = raw.split(';');
    if (pairs.length < 2 || pairs.length > 25) return null;

    const out: string[] = [];
    for (const pair of pairs) {
        const parts = pair.split(',');
        if (parts.length !== 2) return null;
        const lon = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (isNaN(lon) || isNaN(lat)) return null;
        if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;
        // Re-serialise to prevent any injection carried in the original string
        out.push(`${lon},${lat}`);
    }

    return out.join(';');
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    // Verify admin JWT
    const auth = request.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ') || !verifyHS256(auth.substring(7))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawPoints = searchParams.get('points') ?? '';
    const withSteps = searchParams.get('steps') === 'true';
    const rawLang = searchParams.get('language') ?? 'en';
    const lang = /^[a-z]{2,5}$/.test(rawLang) ? rawLang : 'en';

    const safePoints = parsePoints(rawPoints);
    if (!safePoints) {
        return NextResponse.json({ error: 'Invalid points parameter' }, { status: 400 });
    }

    const cacheKey = `${safePoints}:s=${withSteps}:l=${lang}`;
    const now = Date.now();
    const hit = serverCache.get(cacheKey);
    if (hit && hit.expiresAt > now) {
        return NextResponse.json(hit.data);
    }

    if (!MAPBOX_TOKEN) {
        return NextResponse.json({ error: 'Directions service unavailable' }, { status: 503 });
    }

    const extras = withSteps ? `&steps=true&language=${lang}` : '';
    const mapboxUrl =
        `https://api.mapbox.com/directions/v5/mapbox/driving/${safePoints}` +
        `?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full${extras}`;

    let upstream: Response;
    try {
        upstream = await fetch(mapboxUrl);
    } catch (err) {
        console.error('[Directions] Mapbox fetch failed:', err);
        return NextResponse.json({ error: 'Upstream directions error' }, { status: 502 });
    }
    if (!upstream.ok) {
        const body = await upstream.text().catch(() => '');
        console.error(`[Directions] Mapbox returned ${upstream.status}: ${body}`);
        return NextResponse.json({ error: 'Upstream directions error' }, { status: 502 });
    }

    const data: any = await upstream.json();
    if (!data.routes?.length) {
        return NextResponse.json({ error: 'No route found' }, { status: 404 });
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

    serverCache.set(cacheKey, { data: result, expiresAt: now + CACHE_TTL_MS });
    return NextResponse.json(result);
}
