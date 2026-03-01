import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createYoga } from 'graphql-yoga';
import { EnvelopArmorPlugin } from '@escape.tech/graphql-armor';
import { schema } from './graphql/schema';
import { createContext } from './graphql/createContext';
import uploadRoutes from './routes/uploadRoutes';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { initializeDriverServices, shutdownDriverServices } from '@/services/driverServices.init';
import { initSentry, Sentry } from '@/lib/sentry';
import { requestLogger } from '@/lib/middleware/requestLogger';
import logger from '@/lib/logger';
import { initializeFirebase } from '@/lib/firebase';

// ── Sentry must be initialised before any other middleware ──
initSentry();

const app = express();
const port = Number(process.env.PORT) || 4000;

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
// General API limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,                  // 500 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

// Stricter limiter for auth-related operations (GraphQL login/signup)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                   // 20 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
});

// Upload limiter
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,                   // 50 uploads per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many upload requests, please try again later.' },
});

app.use('/graphql', apiLimiter);
app.use('/api/upload', uploadLimiter);

// Apply stricter auth rate limiting to auth-related GraphQL operations
const AUTH_OPERATIONS = new Set(['Login', 'InitiateSignup', 'RefreshToken', 'VerifyEmail', 'VerifyPhone', 'ResendEmailVerification']);
app.use('/graphql', (req, res, next) => {
    const operationName = req.body?.operationName;
    if (operationName && AUTH_OPERATIONS.has(operationName)) {
        return authLimiter(req, res, next);
    }
    next();
});

// Structured request logging (replaces the old console.log middleware)
app.use(requestLogger);

// Sentry error handler (must be after routes, before custom error handler)
Sentry.setupExpressErrorHandler(app);

// Upload routes (REST API)
app.use('/api/upload', uploadRoutes);

const isProduction = process.env.NODE_ENV === 'production';

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

useServer(
    {
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
    },
    wsServer,
);

// Shutdown handler
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    shutdownDriverServices();
    Sentry.close(2000).then(() => process.exit(0));
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
