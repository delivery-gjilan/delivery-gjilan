import express from 'express';
import cors from 'cors';
import { createYoga } from 'graphql-yoga';
import { schema } from './graphql/schema';
import { createContext } from './graphql/createContext';
import uploadRoutes from './routes/uploadRoutes';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { initializeDriverServices, shutdownDriverServices } from '@/services/driverServices.init';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Basic request logging for visibility in dev
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const durationMs = Date.now() - start;
        console.log(`[${res.statusCode}] ${req.method} ${req.originalUrl} ${durationMs}ms`);
    });
    next();
});

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
    console.log(`Server is running on http://localhost:${port}/graphql`);
    
    // Initialize driver services (heartbeat checker)
    try {
        await initializeDriverServices();
    } catch (error) {
        console.error('Failed to initialize driver services:', error);
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
    console.log('SIGTERM received, shutting down gracefully');
    shutdownDriverServices();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});
