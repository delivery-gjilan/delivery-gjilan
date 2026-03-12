import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createYoga } from 'graphql-yoga';
import { EnvelopArmorPlugin } from '@escape.tech/graphql-armor';
import { schema } from './graphql/schema';
import { createContext } from './graphql/createContext';
import uploadRoutes from './routes/uploadRoutes';
import debugRoutes from './routes/debugRoutes';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { decodeJwtToken } from '@/lib/utils/authUtils';
import { getDriverServices, initializeDriverServices, shutdownDriverServices } from '@/services/driverServices.init';
import { initializePubSubRedisBridge, shutdownPubSubRedisBridge } from '@/lib/pubsub';
import { initSentry, Sentry } from '@/lib/sentry';
import { requestLogger } from '@/lib/middleware/requestLogger';
import logger from '@/lib/logger';
import { initializeFirebase } from '@/lib/firebase';
import { cache } from '@/lib/cache';

// ── Sentry must be initialised before any other middleware ──
initSentry();

const app = express();
const port = Number(process.env.PORT) || 4000;

// Respect upstream proxy IPs (ngrok/load balancers) so rate limiting uses real client addresses.
app.set('trust proxy', 1);

// ── Security headers ──
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for GraphiQL

// ── CORS ──
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:8082', 'http://localhost:8083', 'http://localhost:8084'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

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

    return `ip:${req.ip}`;
}

// General API limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,                  // 500 requests per window
    keyGenerator: getRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

// Stricter limiter for auth-related operations (GraphQL login/signup)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                   // 20 attempts per window
    keyGenerator: getRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
});

// Upload limiter
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,                   // 50 uploads per window
    keyGenerator: getRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many upload requests, please try again later.' },
});

// Exclude high-frequency system operations from rate limiting
const SYSTEM_OPERATIONS = new Set(['DriverHeartbeat', 'DriverBatteryReport']);
const AUTH_OPERATIONS = new Set(['Login', 'InitiateSignup', 'RefreshToken', 'VerifyEmail', 'VerifyPhone', 'ResendEmailVerification']);

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

// Structured request logging (replaces the old console.log middleware)
app.use(requestLogger);

// Sentry error handler (must be after routes, before custom error handler)
Sentry.setupExpressErrorHandler(app);

const isProduction = process.env.NODE_ENV === 'production';

// Upload routes (REST API)
app.use('/api/upload', uploadRoutes);

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

    // Initialize cross-instance GraphQL pubsub bridge (falls back to in-memory if Redis is unavailable)
    await initializePubSubRedisBridge();
    
    // Initialize Firebase Admin SDK for push notifications
    try {
        initializeFirebase();
    } catch (error) {
        logger.warn({ err: error }, 'Firebase not initialized — push notifications disabled. Set FIREBASE_SERVICE_ACCOUNT_KEY env var.');
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

const wsDriverSessions = new WeakMap<object, string>();

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

useServer(
    {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onConnect: async (ctx: any) => {
            const token = getBearerFromConnectionParams(ctx.connectionParams);
            if (!token) {
                return;
            }

            try {
                const decoded = decodeJwtToken(token);
                if (decoded.role !== 'DRIVER' || !decoded.userId) {
                    return;
                }

                wsDriverSessions.set(ctx.extra.socket, decoded.userId);

                try {
                    const { driverService } = getDriverServices();
                    await driverService.handleReconnect(decoded.userId);
                } catch (error) {
                    logger.warn({ err: error, userId: decoded.userId }, 'driverSocket:reconnect:failed');
                }
            } catch {
                // Invalid token: ignore and allow GraphQL auth to handle operation-level access.
            }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        execute: (args: any) => args.rootValue.execute(args),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subscribe: (args: any) => args.rootValue.subscribe(args),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSubscribe: async (ctx: any, _id: any, payload: any) => {
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
            if (errors.length) return errors;
            return args;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onDisconnect: async (ctx: any) => {
            const userId = wsDriverSessions.get(ctx.extra.socket);
            if (!userId) {
                return;
            }

            wsDriverSessions.delete(ctx.extra.socket);

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
    shutdownDriverServices();
    await shutdownPubSubRedisBridge();
    const { pool } = await import('../database');
    await pool?.end();
    await cache.disconnect();
    await Sentry.close(2000);
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error({ err: error }, 'Unhandled promise rejection');
    Sentry.captureException(error);
});

process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception — exiting');
    Sentry.captureException(error);
    Sentry.close(2000).then(() => process.exit(1));
});
