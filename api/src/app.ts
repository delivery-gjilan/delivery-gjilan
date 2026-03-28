import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createYoga } from 'graphql-yoga';
import { EnvelopArmorPlugin } from '@escape.tech/graphql-armor';
import { schema } from './graphql/schema';
import { createContext } from './graphql/createContext';
import uploadRoutes from './routes/uploadRoutes';
import debugRoutes from './routes/debugRoutes';
import { directionsRouter } from './routes/directionsRoutes';
import { opsWallRouter } from './routes/opsWall';
import { decodeJwtToken } from '@/lib/utils/authUtils';
import { requestLogger } from '@/lib/middleware/requestLogger';
import { globalErrorHandler } from '@/lib/middleware/errorHandler';
import { metricsEndpoint, metricsMiddleware } from '@/lib/metrics';
import { realtimeMonitor } from '@/lib/realtimeMonitoring';
import { cache } from '@/lib/cache';
import { getDB } from '../database';
import { sql } from 'drizzle-orm';

export type AppContext = ReturnType<typeof createContext>;

export const app = express();

// Respect upstream proxy IPs (ngrok/load balancers) so rate limiting uses real client addresses.
app.set('trust proxy', 1);

// ── Security headers ──
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for GraphiQL

// ── CORS ──
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:8082', 'http://localhost:8083', 'http://localhost:8084'];

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    }),
);

// ── Body parsing with size limit ──
app.use(express.json({ limit: '16kb' }));

// ── Rate limiting ──
function getBearerFromHeaders(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7);
}

function getRateLimitKey(req: express.Request): string {
    const token = getBearerFromHeaders(req.headers.authorization);
    if (token) {
        try {
            const decoded = decodeJwtToken(token);
            if (decoded?.userId) {
                return `user:${decoded.userId}`;
            }
        } catch {
            // Fall back to non-auth identifiers below.
        }
    }

    const email = req.body?.variables?.input?.email;
    if (typeof email === 'string' && email.trim()) {
        return `email:${email.trim().toLowerCase()}`;
    }

    return `ip:${ipKeyGenerator(req.ip)}`;
}

// General API limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per window
    keyGenerator: getRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

// Stricter limiter for auth-related operations (GraphQL login/signup)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per window
    keyGenerator: getRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
});

// Upload limiter
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 uploads per window
    keyGenerator: getRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many upload requests, please try again later.' },
});

// Directions limiter — generous enough for max active orders × 3 clients
const directionsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    keyGenerator: getRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many directions requests, please try again later.' },
});

// Exclude high-frequency system operations from rate limiting
const AUTH_OPERATIONS = new Set([
    'Login',
    'InitiateSignup',
    'RefreshToken',
    'VerifyEmail',
    'VerifyPhone',
    'ResendEmailVerification',
]);
const SYSTEM_OPERATIONS = new Set([
    'DriverHeartbeat',
    'DriverBatteryReport',
    'BusinessDeviceHeartbeat',
    'BusinessDeviceOrderSignal',
]);

app.use('/graphql', (req, res, next) => {
    const operationName = req.body?.operationName;

    // Skip rate limiting for critical system operations (heartbeats, etc.)
    if (operationName && SYSTEM_OPERATIONS.has(operationName)) {
        return next();
    }

    // Apply stricter auth rate limiting
    if (operationName && AUTH_OPERATIONS.has(operationName)) {
        return authLimiter(req, res, next);
    }

    // Apply general rate limiting for all other operations
    return apiLimiter(req, res, next);
});

app.use('/api/upload', uploadLimiter);
app.use('/api/directions', directionsLimiter);

// Structured request logging (replaces the old console.log middleware)
app.use(requestLogger);
app.use(metricsMiddleware);

app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

app.get('/ready', async (_req, res) => {
    let postgresOk = false;
    let redisStatus: 'ok' | 'disabled' | 'failed' = 'failed';

    try {
        const db = await getDB();
        await db.execute(sql`select 1`);
        postgresOk = true;
    } catch {
        postgresOk = false;
    }

    const redisHealth = await cache.ping();
    if (redisHealth.ok) {
        redisStatus = 'ok';
    } else if (redisHealth.disabled) {
        redisStatus = 'disabled';
    }

    const redisRequired = process.env.REDIS_REQUIRED === 'true';
    const ready = postgresOk && (!redisRequired || redisStatus === 'ok');

    res.status(ready ? 200 : 503).json({
        status: ready ? 'ready' : 'not_ready',
        checks: {
            postgres: postgresOk ? 'ok' : 'failed',
            redis: redisStatus,
        },
        timestamp: new Date().toISOString(),
    });
});

app.get('/metrics', metricsEndpoint);

app.get('/health/realtime', (_req, res) => {
    res.status(200).json(realtimeMonitor.getSummary());
});

app.use('/health/ops-wall', opsWallRouter);

const isProduction = process.env.NODE_ENV === 'production';

// Upload routes (REST API)
app.use('/api/upload', uploadRoutes);

// Directions proxy — keeps MAPBOX_TOKEN server-side, caches in Redis
app.use('/api/directions', directionsRouter);

// Debug routes (non-production only)
if (!isProduction) {
    app.use('/api/debug', debugRoutes);
}

export const yoga = createYoga({
    schema,
    graphqlEndpoint: '/graphql',
    maskedErrors: isProduction,
    context: createContext,
    graphiql: isProduction ? false : { subscriptionsProtocol: 'WS' },
    plugins: [
        EnvelopArmorPlugin({
            maxDepth: { n: 10 },
            costLimit: { maxCost: 5000 },
            maxAliases: { n: 5 },
            maxDirectives: { n: 10 },
            maxTokens: { n: 1000 },
        }),
    ],
});

app.use(yoga.graphqlEndpoint, yoga);

// Global error handler — must be registered after all routes
app.use(globalErrorHandler);
