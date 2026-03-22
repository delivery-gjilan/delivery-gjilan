import express from 'express';
import { randomUUID } from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createYoga } from 'graphql-yoga';
import { EnvelopArmorPlugin } from '@escape.tech/graphql-armor';
import { GraphQLError } from 'graphql';
import { schema } from './graphql/schema';
import { createContext } from './graphql/createContext';
import uploadRoutes from './routes/uploadRoutes';
import debugRoutes from './routes/debugRoutes';
import { directionsRouter } from './routes/directionsRoutes';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { decodeJwtToken } from '@/lib/utils/authUtils';
import { getDriverServices, initializeDriverServices, shutdownDriverServices } from '@/services/driverServices.init';
import { initializePubSubRedisBridge, shutdownPubSubRedisBridge } from '@/lib/pubsub';
import { requestLogger } from '@/lib/middleware/requestLogger';
import logger from '@/lib/logger';
import { initializeFirebase } from '@/lib/firebase';
import { cache } from '@/lib/cache';
import { metricsEndpoint, metricsMiddleware } from '@/lib/metrics';
import { realtimeMonitor } from '@/lib/realtimeMonitoring';
import { getDB } from './../database';
import { sql } from 'drizzle-orm';
import type { GraphQLContext } from './graphql/context';

export type AppContext = GraphQLContext;

const app = express();
const port = Number(process.env.PORT) || 4000;

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

const isProduction = process.env.NODE_ENV === 'production';

// Upload routes (REST API)
app.use('/api/upload', uploadRoutes);

// Directions proxy — keeps MAPBOX_TOKEN server-side, caches in Redis
app.use('/api/directions', directionsRouter);

// Debug routes (non-production only)
if (!isProduction) {
    app.use('/api/debug', debugRoutes);
}

const yoga = createYoga({
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

const httpServer = app.listen(port, async () => {
    logger.info({ port }, 'Server started on http://localhost:%d/graphql', port);
    realtimeMonitor.startSummaryLogging();

    // Initialize cross-instance GraphQL pubsub bridge (falls back to in-memory if Redis is unavailable)
    await initializePubSubRedisBridge();

    // Initialize Firebase Admin SDK for push notifications
    try {
        initializeFirebase();
    } catch (error) {
        logger.warn(
            { err: error },
            'Firebase not initialized — push notifications disabled. Set FIREBASE_SERVICE_ACCOUNT_KEY env var.',
        );
    }

    // Initialize driver services (heartbeat checker)
    try {
        await initializeDriverServices();
    } catch (error) {
        logger.error({ err: error }, 'Failed to initialize driver services');
    }
});

const wsServer = new WebSocketServer({
    server: httpServer,
    path: yoga.graphqlEndpoint,
});

const wsSocketIds = new WeakMap<object, string>();
const wsDriverSessions = new WeakMap<object, string>();
const wsSubscriptionCounts = new WeakMap<object, number>();
const wsSubscribeWindowMs = new WeakMap<object, number[]>();
const wsOperations = new WeakMap<object, Map<string, string>>();

const WS_MAX_SUBSCRIPTIONS_PER_SOCKET = 20;
const WS_SUBSCRIBE_WINDOW_MS = 10_000;
const WS_MAX_SUBSCRIBE_OPS_PER_WINDOW = 35;

function getBearerFromConnectionParams(connectionParams: unknown): string | null {
    if (!connectionParams || typeof connectionParams !== 'object') {
        return null;
    }

    const params = connectionParams as Record<string, unknown>;
    const authValue = params.Authorization ?? params.authorization;
    if (typeof authValue !== 'string' || !authValue.startsWith('Bearer ')) {
        return null;
    }

    return authValue.slice(7);
}

function getSocketId(socket: object): string {
    const existing = wsSocketIds.get(socket);
    if (existing) {
        return existing;
    }

    const created = randomUUID();
    wsSocketIds.set(socket, created);
    return created;
}

function getSocketIp(ctx: any): string | undefined {
    const headerIp = ctx.extra?.request?.headers?.['x-forwarded-for'];
    if (typeof headerIp === 'string' && headerIp.trim()) {
        return headerIp;
    }

    return ctx.extra?.socket?.remoteAddress;
}

function rememberSocketOperation(socket: object, operationId: string, operationName: string): void {
    const operations = wsOperations.get(socket) ?? new Map<string, string>();
    operations.set(operationId, operationName);
    wsOperations.set(socket, operations);
}

function forgetSocketOperation(socket: object, operationId: string): string | undefined {
    const operations = wsOperations.get(socket);
    if (!operations) {
        return undefined;
    }

    const operationName = operations.get(operationId);
    operations.delete(operationId);
    if (operations.size === 0) {
        wsOperations.delete(socket);
    }

    return operationName;
}

function graphQLErrorSummary(errors: readonly GraphQLError[]): { codes: string[]; detail: string } {
    const codes = errors
        .map((error) => error.extensions?.code)
        .filter((value): value is string => typeof value === 'string');
    const detail =
        errors
            .map((error) => error.message)
            .filter(Boolean)
            .slice(0, 3)
            .join(' | ') || 'Subscription lifecycle error';
    return { codes, detail };
}

function canAcceptSubscribe(socket: object): { ok: boolean; reason?: string } {
    const activeCount = wsSubscriptionCounts.get(socket) ?? 0;
    if (activeCount >= WS_MAX_SUBSCRIPTIONS_PER_SOCKET) {
        return { ok: false, reason: 'Too many active subscriptions on this connection' };
    }

    const now = Date.now();
    const timestamps = wsSubscribeWindowMs.get(socket) ?? [];
    const recent = timestamps.filter((ts) => now - ts <= WS_SUBSCRIBE_WINDOW_MS);
    if (recent.length >= WS_MAX_SUBSCRIBE_OPS_PER_WINDOW) {
        wsSubscribeWindowMs.set(socket, recent);
        return { ok: false, reason: 'Too many subscribe operations, please slow down' };
    }

    recent.push(now);
    wsSubscribeWindowMs.set(socket, recent);
    return { ok: true };
}

function incrementSocketSubscriptions(socket: object): void {
    const current = wsSubscriptionCounts.get(socket) ?? 0;
    wsSubscriptionCounts.set(socket, current + 1);
}

function decrementSocketSubscriptions(socket: object): void {
    const current = wsSubscriptionCounts.get(socket) ?? 0;
    if (current <= 1) {
        wsSubscriptionCounts.delete(socket);
        return;
    }
    wsSubscriptionCounts.set(socket, current - 1);
}

useServer(
    {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onConnect: async (ctx: any) => {
            const socket = ctx.extra.socket as object;
            const socketId = getSocketId(socket);
            const ip = getSocketIp(ctx);
            const token = getBearerFromConnectionParams(ctx.connectionParams);
            if (!token) {
                realtimeMonitor.recordConnection({ socketId, ip, hasAuth: false });
                logger.info({ socketId, ip, hasAuth: false }, 'ws:connect');
                return;
            }

            try {
                const decoded = decodeJwtToken(token);
                realtimeMonitor.recordConnection({
                    socketId,
                    ip,
                    hasAuth: true,
                    userId: decoded.userId,
                    role: decoded.role,
                });
                logger.info({ socketId, ip, hasAuth: true, userId: decoded.userId, role: decoded.role }, 'ws:connect');

                if (decoded.role !== 'DRIVER' || !decoded.userId) {
                    return;
                }

                wsDriverSessions.set(socket, decoded.userId);

                try {
                    const { driverService } = getDriverServices();
                    await driverService.handleReconnect(decoded.userId);
                } catch (error) {
                    logger.warn({ err: error, userId: decoded.userId }, 'driverSocket:reconnect:failed');
                }
            } catch {
                realtimeMonitor.recordConnection({ socketId, ip, hasAuth: true });
                logger.warn({ socketId, ip }, 'ws:connect:invalidToken');
                // Invalid token: ignore and allow GraphQL auth to handle operation-level access.
            }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        execute: (args: any) => args.rootValue.execute(args),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subscribe: (args: any) => args.rootValue.subscribe(args),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSubscribe: async (ctx: any, id: any, payload: any) => {
            const socket = ctx.extra.socket as object;
            const socketId = getSocketId(socket);
            const operationName = payload.operationName || 'anonymous';

            realtimeMonitor.recordSubscribeAttempt(operationName);
            const allowed = canAcceptSubscribe(socket);
            if (!allowed.ok) {
                realtimeMonitor.recordSubscribeRejected({ socketId, operationName, reason: 'rate_limited' });
                logger.warn({ socketId, operationName, reason: allowed.reason }, 'ws:subscribe:rejected');
                return [
                    new GraphQLError(allowed.reason || 'Subscription rejected', {
                        extensions: { code: 'RATE_LIMITED' },
                    }),
                ];
            }

            const { schema, execute, subscribe, contextFactory, parse, validate } = yoga.getEnveloped({
                ...ctx,
                req: ctx.extra.request,
                socket: ctx.extra.socket,
                params: payload,
            });

            const args = {
                schema,
                operationName: payload.operationName,
                document: parse(payload.query),
                variableValues: payload.variables,
                contextValue: await contextFactory({
                    ...ctx,
                    connectionParams: ctx.connectionParams,
                }),
                rootValue: {
                    execute,
                    subscribe,
                },
            };

            const errors = validate(args.schema, args.document);
            if (errors.length) {
                const summary = graphQLErrorSummary(errors);
                realtimeMonitor.recordSubscribeRejected({ socketId, operationName, reason: 'validation_failed' });
                logger.warn(
                    { socketId, operationName, codes: summary.codes, detail: summary.detail },
                    'ws:subscribe:validationFailed',
                );
                return errors;
            }
            incrementSocketSubscriptions(socket);
            rememberSocketOperation(socket, String(id), operationName);
            realtimeMonitor.recordSubscribeAccepted({ socketId, operationId: String(id), operationName });
            logger.info(
                {
                    socketId,
                    operationId: String(id),
                    operationName,
                    activeOnSocket: wsSubscriptionCounts.get(socket) ?? 0,
                },
                'ws:subscribe:accepted',
            );
            return args;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onComplete: async (ctx: any, id: any, payload: any) => {
            const socket = ctx.extra.socket as object;
            const socketId = getSocketId(socket);
            const operationName = forgetSocketOperation(socket, String(id)) || payload?.operationName || 'anonymous';

            decrementSocketSubscriptions(socket);
            realtimeMonitor.recordSubscribeCompleted({ socketId, operationId: String(id), operationName });
            logger.info(
                {
                    socketId,
                    operationId: String(id),
                    operationName,
                    activeOnSocket: wsSubscriptionCounts.get(socket) ?? 0,
                },
                'ws:subscribe:completed',
            );
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: async (ctx: any, id: any, payload: any, errors: readonly GraphQLError[]) => {
            const socket = ctx.extra.socket as object;
            const socketId = getSocketId(socket);
            const operationName = wsOperations.get(socket)?.get(String(id)) || payload?.operationName || 'anonymous';
            const summary = graphQLErrorSummary(errors);

            realtimeMonitor.recordSubscribeError({
                socketId,
                operationId: String(id),
                operationName,
                phase: 'runtime',
                detail: summary.detail,
            });
            logger.error(
                { socketId, operationId: String(id), operationName, codes: summary.codes, detail: summary.detail },
                'ws:subscribe:error',
            );
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onDisconnect: async (ctx: any) => {
            const socket = ctx.extra.socket as object;
            const socketId = getSocketId(socket);

            wsSubscriptionCounts.delete(socket);
            wsSubscribeWindowMs.delete(socket);
            wsOperations.delete(socket);
            wsSocketIds.delete(socket);
            realtimeMonitor.recordDisconnect(socketId);
            logger.info({ socketId }, 'ws:disconnect');

            const userId = wsDriverSessions.get(socket);
            if (!userId) {
                return;
            }

            wsDriverSessions.delete(socket);

            try {
                const { driverService } = getDriverServices();
                await driverService.handleDisconnect(userId);
            } catch (error) {
                logger.warn({ err: error, userId }, 'driverSocket:disconnect:failed');
            }
        },
    },
    wsServer,
);

// Shutdown handler
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    realtimeMonitor.stopSummaryLogging();
    shutdownDriverServices();
    await shutdownPubSubRedisBridge();
    const { pool } = await import('../database');
    await pool?.end();
    await cache.disconnect();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error({ err: error }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception — exiting');
    process.exit(1);
});
