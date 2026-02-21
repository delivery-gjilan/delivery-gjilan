import express from 'express';
import cors from 'cors';
import { createYoga } from 'graphql-yoga';
import { schema } from './graphql/schema';
import { createContext } from './graphql/createContext';
import uploadRoutes from './routes/uploadRoutes';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { initializeDriverServices, shutdownDriverServices } from '@/services/driverServices.init';
import { initSentry, Sentry } from '@/lib/sentry';
import { requestLogger } from '@/lib/middleware/requestLogger';
import logger from '@/lib/logger';

// ── Sentry must be initialised before any other middleware ──
initSentry();

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

// Structured request logging (replaces the old console.log middleware)
app.use(requestLogger);

// Sentry error handler (must be after routes, before custom error handler)
Sentry.setupExpressErrorHandler(app);

// Upload routes (REST API)
app.use('/api/upload', uploadRoutes);

const yoga = createYoga({
    schema,
    graphqlEndpoint: '/graphql',
    maskedErrors: false,
    context: createContext,
    graphiql: {
        subscriptionsProtocol: 'WS',
    },
});

app.use(yoga.graphqlEndpoint, yoga);

const httpServer = app.listen(port, async () => {
    logger.info({ port }, 'Server started on http://localhost:%d/graphql', port);
    
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
