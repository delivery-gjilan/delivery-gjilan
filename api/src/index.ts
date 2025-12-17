import express from 'express';
import cors from 'cors';
import { createYoga } from 'graphql-yoga';
import { schema } from './graphql/schema';
import { createContext } from './graphql/createContext';
import uploadRoutes from './routes/uploadRoutes';
import { WebSocketServer } from 'ws';
// @ts-expect-error - graphql-ws exports are tricky with current module resolution
import { useServer } from 'graphql-ws/use/ws';
import { Context, Message } from 'graphql-ws';
import { ExecutionArgs } from 'graphql';

import { Context, Message } from 'graphql-ws';
import { ExecutionArgs, GraphQLSchema } from 'graphql';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Upload routes (REST API)
app.use('/api/upload', uploadRoutes);

const yoga = createYoga({
    schema,
    graphqlEndpoint: '/graphql',
    maskedErrors: false,
    context: createContext,
});

app.use(yoga.graphqlEndpoint, yoga);

const httpServer = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}/graphql`);
});

const wsServer = new WebSocketServer({
    server: httpServer,
    path: yoga.graphqlEndpoint,
});

interface RootValue {
    execute: (args: ExecutionArgs) => unknown;
    subscribe: (args: ExecutionArgs) => unknown;
}

interface SubscribePayload {
    operationName?: string | null;
    query: string;
    variables?: Record<string, unknown> | null;
}

interface MessageWithPayload {
    payload: SubscribePayload;
}

useServer(
    {
        execute: (args: ExecutionArgs) => (args.rootValue as RootValue).execute(args),
        subscribe: (args: ExecutionArgs) => (args.rootValue as RootValue).subscribe(args),
        onSubscribe: async (ctx: Context, msg: Message) => {
            const connectionParams = (ctx.connectionParams || {}) as Record<string, string | undefined>;
            const token = connectionParams.Authorization || connectionParams.authorization || connectionParams.token;

            // Mock Request object for createContext compatibility
            const mockRequest = {
                headers: {
                    get: (key: string) => {
                        if (key.toLowerCase() === 'authorization' && token) {
                            return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
                        }
                        return null;
                    },
                    [Symbol.iterator]: function* () {
                        if (token) yield ['authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`];
                    },
                },
                method: 'GET',
                url: 'ws://localhost/graphql',
            };

            // Safely access payload by casting to interface with payload
            const payload = (msg as unknown as MessageWithPayload).payload;

            const {
                schema: envelopedSchema,
                execute,
                subscribe,
                contextFactory,
                parse,
                validate,
            } = yoga.getEnveloped({
                ...ctx,
                req: mockRequest,
                request: mockRequest,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                socket: (ctx.extra as any).socket,
                params: payload,
            });

            // Fallback to yoga instance schema if enveloped schema is missing
            const schema = envelopedSchema || (yoga as unknown as { schema: GraphQLSchema }).schema;

            const executionArgs: ExecutionArgs = {
                schema,
                operationName: payload.operationName,
                document: parse(payload.query),
                variableValues: payload.variables,
                contextValue: await contextFactory(),
                rootValue: {
                    execute,
                    subscribe,
                },
            };

            const errors = validate(executionArgs.schema, executionArgs.document);
            if (errors.length) return errors;
            return executionArgs;
        },
    },
    wsServer,
);
