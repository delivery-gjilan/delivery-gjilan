import { randomUUID } from 'crypto';
import { GraphQLError } from 'graphql';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { getDriverServices, initializeDriverServices, shutdownDriverServices } from '@/services/driverServices.init';
import { initializePubSubRedisBridge, shutdownPubSubRedisBridge } from '@/lib/pubsub';
import logger from '@/lib/logger';
import { initializeFirebase } from '@/lib/firebase';
import { cache } from '@/lib/cache';
import { decodeJwtToken } from '@/lib/utils/authUtils';
import { realtimeMonitor } from '@/lib/realtimeMonitoring';
import { app, yoga } from './app';

export type { AppContext } from './app';

const port = Number(process.env.PORT) || 4000;

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
