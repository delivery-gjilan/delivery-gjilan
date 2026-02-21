import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import logger from '@/lib/logger';

/**
 * Express middleware that:
 * 1. Attaches a unique `requestId` to every inbound request.
 * 2. Creates a per-request child logger available on `req.log`.
 * 3. Logs request start + request finish (status, duration).
 *
 * The `requestId` is propagated to Sentry and to the GraphQL context
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
            },
            'request:finish',
        );
    });

    next();
}
