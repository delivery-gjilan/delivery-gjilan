import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import logger from '@/lib/logger';

type GraphQLRequestBody = {
    operationName?: string;
    query?: string;
};

const SLOW_GRAPHQL_OPERATION_MS = Number(process.env.SLOW_GRAPHQL_OPERATION_MS) || 750;

function normalizeGraphQLOperationName(name: unknown): string {
    if (typeof name !== 'string') {
        return 'anonymous';
    }

    const trimmed = name.trim();
    if (!trimmed) {
        return 'anonymous';
    }

    return trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed;
}

function inferGraphQLOperationType(query: unknown): string {
    if (typeof query !== 'string') {
        return 'unknown';
    }

    const normalized = query.trimStart();
    if (normalized.startsWith('{')) {
        return 'query';
    }

    const match = normalized.match(/^(query|mutation|subscription)\b/i);
    if (!match) {
        return 'unknown';
    }

    return match[1].toLowerCase();
}

function getGraphQLMeta(req: Request): { operationName: string; operationType: string } | null {
    if (req.path !== '/graphql') {
        return null;
    }

    const body = req.body as GraphQLRequestBody | GraphQLRequestBody[] | undefined;
    const operation = Array.isArray(body) ? body[0] : body;

    return {
        operationName: normalizeGraphQLOperationName(operation?.operationName),
        operationType: inferGraphQLOperationType(operation?.query),
    };
}

/**
 * Express middleware that:
 * 1. Attaches a unique `requestId` to every inbound request.
 * 2. Creates a per-request child logger available on `req.log`.
 * 3. Logs request start + request finish (status, duration).
 *
 * The `requestId` is propagated to the GraphQL context
 * so every log line in a single operation is correlated.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
    // Prefer client-supplied correlation id, else generate one
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();

    // Attach to request for downstream consumers
    (req as any).requestId = requestId;

    // Return it in response header for client-side correlation
    res.setHeader('x-request-id', requestId);

    // Derive logged-in user early (cheap header peek, no JWT verify here)
    const authHeader = req.headers.authorization;
    const hasAuth = !!authHeader && authHeader.startsWith('Bearer ');

    // Child logger with per-request bindings
    const log = logger.child({ requestId, hasAuth });
    (req as any).log = log;

    const start = Date.now();
    const graphqlMeta = getGraphQLMeta(req);

    log.info(
        {
            method: req.method,
            url: req.originalUrl,
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
        },
        'request:start',
    );

    res.on('finish', () => {
        const durationMs = Date.now() - start;
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

        log[level](
            {
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                durationMs,
                ...(graphqlMeta ? { operationName: graphqlMeta.operationName, operationType: graphqlMeta.operationType } : {}),
            },
            'request:finish',
        );

        if (graphqlMeta && durationMs >= SLOW_GRAPHQL_OPERATION_MS) {
            log.warn(
                {
                    method: req.method,
                    url: req.originalUrl,
                    statusCode: res.statusCode,
                    durationMs,
                    operationName: graphqlMeta.operationName,
                    operationType: graphqlMeta.operationType,
                    slowThresholdMs: SLOW_GRAPHQL_OPERATION_MS,
                },
                'graphql:slow-operation',
            );
        }
    });

    next();
}
