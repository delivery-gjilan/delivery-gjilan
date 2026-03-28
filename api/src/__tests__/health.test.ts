/**
 * Integration tests for GET /health, GET /ready, GET /health/realtime
 *
 * We import the real Express app (app.ts) with all heavy dependencies
 * mocked so no real DB / Redis / Firebase connections are made.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ── Set required env vars before any module loads ──────────────────────────
process.env.JWT_SECRET = 'test-secret-12345';

// ── Mock modules that would open real connections ──────────────────────────

vi.mock('@/lib/cache', () => ({
    cache: {
        ping: vi.fn().mockResolvedValue({ ok: false, disabled: true }),
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        del: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('@/database', () => ({
    getDB: vi.fn().mockResolvedValue({
        execute: vi.fn().mockResolvedValue([]),
    }),
    pool: null,
}));

vi.mock('@/lib/realtimeMonitoring', () => ({
    realtimeMonitor: {
        getSummary: vi.fn().mockReturnValue({
            activeSockets: 0,
            activeSubscriptions: 0,
            connections: { total: 0, authenticated: 0 },
        }),
        startSummaryLogging: vi.fn(),
        stopSummaryLogging: vi.fn(),
        recordConnection: vi.fn(),
        recordDisconnect: vi.fn(),
        recordSubscribeAttempt: vi.fn(),
        recordSubscribeRejected: vi.fn(),
        recordSubscribeAccepted: vi.fn(),
        recordSubscribeCompleted: vi.fn(),
        recordSubscribeError: vi.fn(),
    },
}));

vi.mock('@/lib/metrics', () => ({
    metricsMiddleware: (_req: any, _res: any, next: any) => next(),
    metricsEndpoint: (_req: any, res: any) => res.status(200).send('# metrics'),
}));

vi.mock('@/lib/middleware/requestLogger', () => ({
    requestLogger: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('@/lib/middleware/errorHandler', () => ({
    globalErrorHandler: (err: any, _req: any, res: any, _next: any) => {
        res.status(500).json({ error: err?.message ?? 'Internal Server Error' });
    },
}));

vi.mock('@/lib/logger', () => ({
    default: {
        child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() }),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
    },
}));

// Mock graphql-yoga so no real schema/context evaluation happens
vi.mock('graphql-yoga', () => {
    const mockHandler = vi.fn((_req: any, _res: any, next: any) => next());
    return {
        createYoga: vi.fn(() =>
            Object.assign(mockHandler, { graphqlEndpoint: '/graphql', getEnveloped: vi.fn() }),
        ),
    };
});

vi.mock('@escape.tech/graphql-armor', () => ({
    EnvelopArmorPlugin: vi.fn(() => ({})),
}));

vi.mock('../graphql/schema', () => ({ schema: {} }));
vi.mock('../graphql/createContext', () => ({ createContext: vi.fn() }));

// Mock routes so they don't try to connect to S3 / Mapbox / Firebase at import time
vi.mock('../routes/uploadRoutes', () => ({
    default: (_req: any, _res: any, next: any) => next(),
}));
vi.mock('../routes/directionsRoutes', () => ({
    directionsRouter: (_req: any, _res: any, next: any) => next(),
}));
vi.mock('../routes/debugRoutes', () => ({
    default: (_req: any, _res: any, next: any) => next(),
}));

// ── Import app AFTER mocks ─────────────────────────────────────────────────
import { app } from '../app';
import { cache } from '@/lib/cache';
import { getDB } from '@/database';

// ── Tests ──────────────────────────────────────────────────────────────────

describe('GET /health', () => {
    it('returns HTTP 200', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
    });

    it('returns status "ok"', async () => {
        const res = await request(app).get('/health');
        expect(res.body.status).toBe('ok');
    });

    it('includes uptimeSeconds as a non-negative number', async () => {
        const res = await request(app).get('/health');
        expect(typeof res.body.uptimeSeconds).toBe('number');
        expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('includes a valid ISO timestamp', async () => {
        const res = await request(app).get('/health');
        const parsed = new Date(res.body.timestamp);
        expect(isNaN(parsed.getTime())).toBe(false);
    });
});

describe('GET /ready', () => {
    beforeEach(() => {
        vi.mocked(cache.ping).mockResolvedValue({ ok: false, disabled: true });
        vi.mocked(getDB).mockResolvedValue({ execute: vi.fn().mockResolvedValue([]) } as any);
        delete process.env.REDIS_REQUIRED;
    });

    afterEach(() => {
        delete process.env.REDIS_REQUIRED;
    });

    it('returns 200 when postgres succeeds and redis is disabled', async () => {
        const res = await request(app).get('/ready');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ready');
        expect(res.body.checks.postgres).toBe('ok');
        expect(res.body.checks.redis).toBe('disabled');
    });

    it('returns 503 when postgres fails', async () => {
        vi.mocked(getDB).mockRejectedValueOnce(new Error('connection refused'));
        const res = await request(app).get('/ready');
        expect(res.status).toBe(503);
        expect(res.body.status).toBe('not_ready');
        expect(res.body.checks.postgres).toBe('failed');
    });

    it('returns 503 when redis is required but check fails', async () => {
        process.env.REDIS_REQUIRED = 'true';
        vi.mocked(cache.ping).mockResolvedValueOnce({ ok: false, disabled: false });
        const res = await request(app).get('/ready');
        expect(res.status).toBe(503);
        expect(res.body.checks.redis).toBe('failed');
    });

    it('returns 200 when redis is required and healthy', async () => {
        process.env.REDIS_REQUIRED = 'true';
        vi.mocked(cache.ping).mockResolvedValueOnce({ ok: true, disabled: false });
        const res = await request(app).get('/ready');
        expect(res.status).toBe(200);
        expect(res.body.checks.redis).toBe('ok');
    });

    it('includes a valid ISO timestamp', async () => {
        const res = await request(app).get('/ready');
        const parsed = new Date(res.body.timestamp);
        expect(isNaN(parsed.getTime())).toBe(false);
    });
});

describe('GET /health/realtime', () => {
    it('returns HTTP 200', async () => {
        const res = await request(app).get('/health/realtime');
        expect(res.status).toBe(200);
    });

    it('delegates to realtimeMonitor.getSummary', async () => {
        const { realtimeMonitor } = await import('@/lib/realtimeMonitoring');
        vi.mocked(realtimeMonitor.getSummary).mockReturnValueOnce({
            activeSockets: 5,
            activeSubscriptions: 12,
        } as any);
        const res = await request(app).get('/health/realtime');
        expect(res.body.activeSockets).toBe(5);
        expect(res.body.activeSubscriptions).toBe(12);
    });
});
