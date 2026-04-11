/**
 * Integration tests for GET /api/directions
 *
 * Uses an isolated Express app mounting only the directions router.
 * Real JWTs exercise the actual decodeJwtToken / jwt.verify code path.
 * Global fetch is stubbed to avoid real Mapbox API calls.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ── vi.hoisted runs before any module import ─────────────────────────────
const { mockCacheGet, mockCacheSet } = vi.hoisted(() => {
    process.env.JWT_SECRET = 'directions-test-secret';
    process.env.MAPBOX_TOKEN = 'pk.test.token';
    return {
        mockCacheGet: vi.fn().mockResolvedValue(null),
        mockCacheSet: vi.fn().mockResolvedValue(undefined),
    };
});

const JWT_SECRET = 'directions-test-secret';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
    default: {
        child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/lib/cache', () => ({
    cache: {
        get: mockCacheGet,
        set: mockCacheSet,
        del: vi.fn().mockResolvedValue(undefined),
        ping: vi.fn().mockResolvedValue({ ok: false, disabled: true }),
        disconnect: vi.fn().mockResolvedValue(undefined),
    },
}));

// ── Test app ────────────────────────────────────────────────────────────────
import { directionsRouter } from '../directionsRoutes';

const app = express();
app.use(express.json());
app.use('/api/directions', directionsRouter);

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeToken(role = 'CUSTOMER', userId = 'user-1') {
    return jwt.sign({ userId, role }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
}

/** Stub global fetch to return a Mapbox-shaped success response */
function stubMapboxSuccess(distanceM = 5000, durationS = 600) {
    const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
            routes: [
                {
                    distance: distanceM,
                    duration: durationS,
                    geometry: { coordinates: [[21.16, 42.66], [21.18, 42.68]] },
                    legs: [],
                },
            ],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);
    return mockFetch;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/directions — authentication', () => {
    it('returns 401 with no Authorization header', async () => {
        const res = await request(app).get('/api/directions?points=21.16,42.66;21.18,42.68');
        expect(res.status).toBe(401);
        expect(res.body.error).toBeDefined();
    });

    it('returns 401 with a malformed token', async () => {
        const res = await request(app)
            .get('/api/directions?points=21.16,42.66;21.18,42.68')
            .set('Authorization', 'Bearer bad.token');
        expect(res.status).toBe(401);
    });

    it('returns 401 when signed with wrong secret', async () => {
        const badToken = jwt.sign({ userId: 'x', role: 'CUSTOMER' }, 'wrong-secret', { expiresIn: '1h' });
        const res = await request(app)
            .get('/api/directions?points=21.16,42.66;21.18,42.68')
            .set('Authorization', `Bearer ${badToken}`);
        expect(res.status).toBe(401);
    });
});

describe('GET /api/directions — input validation (SSRF protection)', () => {
    const auth = () => makeToken();

    it('returns 400 when points param is missing', async () => {
        const res = await request(app)
            .get('/api/directions')
            .set('Authorization', `Bearer ${auth()}`);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/missing/i);
    });

    it('returns 400 for only one coordinate pair (minimum is 2)', async () => {
        const res = await request(app)
            .get('/api/directions?points=21.16,42.66')
            .set('Authorization', `Bearer ${auth()}`);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/invalid/i);
    });

    it('returns 400 when points contain forbidden characters (injection attempt)', async () => {
        const malicious = '21.16,42.66;21.18%20OR%201=1,42.68';
        const res = await request(app)
            .get(`/api/directions?points=${malicious}`)
            .set('Authorization', `Bearer ${auth()}`);
        expect(res.status).toBe(400);
    });

    it('returns 400 when longitude is out of earth range', async () => {
        const res = await request(app)
            .get('/api/directions?points=999,42.66;21.18,42.68')
            .set('Authorization', `Bearer ${auth()}`);
        expect(res.status).toBe(400);
    });

    it('returns 400 when latitude is out of earth range', async () => {
        const res = await request(app)
            .get('/api/directions?points=21.16,999;21.18,42.68')
            .set('Authorization', `Bearer ${auth()}`);
        expect(res.status).toBe(400);
    });

    it('returns 400 when more than 25 waypoints are given', async () => {
        const tooMany = Array.from({ length: 26 }, (_, i) => `${21 + i * 0.01},42.66`).join(';');
        const res = await request(app)
            .get(`/api/directions?points=${tooMany}`)
            .set('Authorization', `Bearer ${auth()}`);
        expect(res.status).toBe(400);
    });
});

describe('GET /api/directions — cache hit', () => {
    beforeEach(() => {
        mockCacheGet.mockResolvedValue(null);
        mockCacheSet.mockResolvedValue(undefined);
        vi.unstubAllGlobals();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns cached result without calling Mapbox', async () => {
        const cached = { distanceKm: 5, durationMin: 10, geometry: [] };
        mockCacheGet.mockResolvedValueOnce(cached);
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);

        const res = await request(app)
            .get('/api/directions?points=21.16,42.66;21.18,42.68')
            .set('Authorization', `Bearer ${makeToken()}`);

        expect(res.status).toBe(200);
        expect(res.body.distanceKm).toBe(5);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('normalizes coordinates in cache key for better reuse', async () => {
        stubMapboxSuccess(5000, 600);

        await request(app)
            .get('/api/directions?points=21.1234567,42.7654321;21.7654321,42.1234567')
            .set('Authorization', `Bearer ${makeToken()}`);

        const cacheGetKey = mockCacheGet.mock.calls.at(-1)?.[0] as string;
        expect(cacheGetKey).toContain('21.12346,42.76543;21.76543,42.12346');
    });
});

describe('GET /api/directions — Mapbox proxy', () => {
    beforeEach(() => {
        mockCacheGet.mockResolvedValue(null);
        mockCacheSet.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns 200 with distanceKm and durationMin from Mapbox', async () => {
        stubMapboxSuccess(5000, 600);
        const res = await request(app)
            .get('/api/directions?points=21.16,42.66;21.18,42.68')
            .set('Authorization', `Bearer ${makeToken()}`);

        expect(res.status).toBe(200);
        expect(res.body.distanceKm).toBeCloseTo(5);
        expect(res.body.durationMin).toBeCloseTo(10);
        expect(Array.isArray(res.body.geometry)).toBe(true);
    });

    it('stores the result in cache with TTL=65', async () => {
        stubMapboxSuccess();
        await request(app)
            .get('/api/directions?points=21.16,42.66;21.18,42.68')
            .set('Authorization', `Bearer ${makeToken()}`);

        expect(mockCacheSet).toHaveBeenCalledWith(
            expect.stringContaining('dir:'),
            expect.objectContaining({ distanceKm: expect.any(Number) }),
            65,
        );
    });

    it('deduplicates concurrent cache-miss requests for the same route', async () => {
        const delayedFetch = vi.fn().mockImplementation(() =>
            new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        ok: true,
                        json: vi.fn().mockResolvedValue({
                            routes: [
                                {
                                    distance: 5000,
                                    duration: 600,
                                    geometry: { coordinates: [[21.16, 42.66], [21.18, 42.68]] },
                                    legs: [],
                                },
                            ],
                        }),
                    });
                }, 15);
            }),
        );
        vi.stubGlobal('fetch', delayedFetch as any);

        const [res1, res2] = await Promise.all([
            request(app)
                .get('/api/directions?points=21.16,42.66;21.18,42.68')
                .set('Authorization', `Bearer ${makeToken()}`),
            request(app)
                .get('/api/directions?points=21.16,42.66;21.18,42.68')
                .set('Authorization', `Bearer ${makeToken()}`),
        ]);

        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);
        expect(delayedFetch).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when Mapbox returns no routes', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ routes: [] }),
        }));
        const res = await request(app)
            .get('/api/directions?points=21.16,42.66;21.18,42.68')
            .set('Authorization', `Bearer ${makeToken()}`);
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/no route/i);
    });

    it('returns 502 when Mapbox responds with an error status', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 422,
            json: vi.fn().mockResolvedValue({ message: 'Invalid coordinates' }),
        }));
        const res = await request(app)
            .get('/api/directions?points=21.16,42.66;21.18,42.68')
            .set('Authorization', `Bearer ${makeToken()}`);
        expect(res.status).toBe(502);
    });

    it('returns 503 when MAPBOX_TOKEN is not set', async () => {
        const saved = process.env.MAPBOX_TOKEN;
        delete process.env.MAPBOX_TOKEN;
        // Re-import the router to pick up the empty token
        vi.resetModules();
        const { directionsRouter: freshRouter } = await import('../directionsRoutes');
        const freshApp = express();
        freshApp.use(express.json());
        freshApp.use('/api/directions', freshRouter);

        const res = await request(freshApp)
            .get('/api/directions?points=21.16,42.66;21.18,42.68')
            .set('Authorization', `Bearer ${makeToken()}`);
        expect(res.status).toBe(503);
        process.env.MAPBOX_TOKEN = saved;
    });
});
