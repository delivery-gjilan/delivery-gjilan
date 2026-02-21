import * as Sentry from '@sentry/node';
import logger from '@/lib/logger';

const dsn = process.env.SENTRY_DSN;

/**
 * Initialize Sentry for the Node.js API.
 * Call once at server boot, **before** any Express middleware.
 *
 * When SENTRY_DSN is missing the SDK operates in noop mode — safe for local dev.
 */
export function initSentry() {
    if (!dsn) {
        logger.warn('SENTRY_DSN not set — Sentry is disabled');
        return;
    }

    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV ?? 'development',
        release: process.env.npm_package_version ?? '0.0.0',

        // Performance monitoring — sample 20 % of transactions in production
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

        // Automatically capture unhandled rejections & exceptions
        integrations: [
            Sentry.httpIntegration(),
            Sentry.expressIntegration(),
            Sentry.graphqlIntegration(),
        ],

        // Strip PII
        beforeSend(event) {
            if (event.request?.headers) {
                delete event.request.headers['authorization'];
                delete event.request.headers['cookie'];
            }
            return event;
        },
    });

    logger.info('Sentry initialized');
}

/**
 * Attach user + request context so every Sentry event is actionable.
 * Call this from the GraphQL context factory.
 */
export function setSentryContext(opts: {
    requestId: string;
    userId?: string;
    role?: string;
    operationName?: string;
}) {
    Sentry.setUser(opts.userId ? { id: opts.userId, role: opts.role } : null);
    Sentry.setTag('requestId', opts.requestId);
    if (opts.operationName) {
        Sentry.setTag('graphql.operation', opts.operationName);
    }
}

/**
 * Capture an exception and forward a simplified message to Pino so both
 * systems have visibility.
 */
export function captureException(error: unknown, extras?: Record<string, unknown>) {
    Sentry.captureException(error, { extra: extras });
    logger.error({ err: error, ...extras }, 'sentry:captureException');
}

export { Sentry };
