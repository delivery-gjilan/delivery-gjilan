import { GraphQLError } from 'graphql';

/**
 * Standardized application errors that extend GraphQLError.
 * These survive GraphQL Yoga's `maskedErrors: true` setting because they
 * carry an `extensions.code`, preventing them from being masked as
 * "Unexpected error".
 *
 * Usage:
 *   throw AppError.notFound('User');
 *   throw AppError.badInput('Invalid referral code');
 *   throw AppError.unauthorized();
 */
export class AppError extends GraphQLError {
    constructor(message: string, code: string) {
        super(message, { extensions: { code } });
    }

    // ── Factory methods ──────────────────────────────────────

    /** 401 – caller is not authenticated */
    static unauthorized(message = 'Unauthorized') {
        return new AppError(message, 'UNAUTHENTICATED');
    }

    /** 403 – caller lacks permission */
    static forbidden(message = 'Forbidden') {
        return new AppError(message, 'FORBIDDEN');
    }

    /** 404 – entity not found */
    static notFound(entity: string) {
        return new AppError(`${entity} not found`, 'NOT_FOUND');
    }

    /** 400 – bad user input / validation error */
    static badInput(message: string) {
        return new AppError(message, 'BAD_USER_INPUT');
    }

    /** 409 – conflict (duplicate resource, etc.) */
    static conflict(message: string) {
        return new AppError(message, 'CONFLICT');
    }

    /** 422 – business-rule violation */
    static businessRule(message: string) {
        return new AppError(message, 'BUSINESS_RULE_VIOLATION');
    }

    /** Wrap a Zod error into a single BAD_USER_INPUT GraphQLError */
    static fromZodError(zodError: { issues: Array<{ path: any[]; message: string }> }) {
        const messages = zodError.issues.map(
            (issue) => `${issue.path.join('.')}: ${issue.message}`,
        );
        return new AppError(
            `Validation failed: ${messages.join('; ')}`,
            'BAD_USER_INPUT',
        );
    }
}
