import { Request, Response, NextFunction } from 'express';
import logger from '@/lib/logger';

/**
 * Global Express error handler.
 *
 * Must be registered AFTER all routes with four parameters so Express
 * recognises it as an error-handling middleware.
 *
 * Logs the full error chain (message, stack, cause) with request
 * correlation data.  In development the stack trace and cause chain
 * are also returned in the response body so you can see them in the
 * browser / API client without opening the terminal.
 */
export function globalErrorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    const requestId = (req as any).requestId as string | undefined;
    const statusCode = isHttpError(err) ? err.status : 500;
    const isDev = process.env.NODE_ENV !== 'production';

    const serialized = serializeError(err);

    logger.error(
        {
            requestId,
            method: req.method,
            path: req.path,
            query: req.query,
            statusCode,
            // Pino's built-in err serializer (message + stack + type)
            err,
            // Explicit full chain so it's always present regardless of Pino config
            errorDetail: serialized,
        },
        'http:error',
    );

    if (res.headersSent) {
        return;
    }

    res.status(statusCode).json({
        error: {
            message: isDev ? serialized.message : 'Internal server error',
            requestId,
            // Full detail only in development — never leak internals in prod
            ...(isDev && {
                name: serialized.name,
                stack: serialized.stack,
                cause: serialized.cause,
                extra: serialized.extra,
            }),
        },
    });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

interface HttpError extends Error {
    status: number;
}

function isHttpError(err: unknown): err is HttpError {
    return err instanceof Error && typeof (err as HttpError).status === 'number';
}

interface SerializedError {
    name: string;
    message: string;
    stack: string | undefined;
    cause: SerializedError | undefined;
    /** Any enumerable own properties beyond name/message/stack/cause */
    extra: Record<string, unknown> | undefined;
}

/** Recursively serializes an error chain including `.cause`. */
function serializeError(err: unknown, depth = 0): SerializedError {
    if (!(err instanceof Error)) {
        return {
            name: 'NonError',
            message: typeof err === 'string' ? err : JSON.stringify(err),
            stack: undefined,
            cause: undefined,
            extra: undefined,
        };
    }

    // Collect any enumerable own props that aren't the standard ones
    const SKIP = new Set(['name', 'message', 'stack', 'cause']);
    const extra: Record<string, unknown> = {};
    for (const key of Object.keys(err)) {
        if (!SKIP.has(key)) {
            extra[key] = (err as unknown as Record<string, unknown>)[key];
        }
    }

    return {
        name: err.name,
        message: err.message,
        stack: err.stack,
        // Recurse into .cause but cap depth to avoid circular loops
        cause: err.cause !== undefined && depth < 5 ? serializeError(err.cause, depth + 1) : undefined,
        extra: Object.keys(extra).length > 0 ? extra : undefined,
    };
}
