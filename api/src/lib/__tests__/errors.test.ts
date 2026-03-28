/**
 * Unit tests for AppError — the unified error class used throughout the API.
 *
 * Every GraphQL resolver throws AppError subclasses to produce
 * well-structured, non-masked GraphQL errors. If the factory methods or
 * extension codes change, these tests catch it immediately.
 */
import { describe, it, expect } from 'vitest';
import { AppError } from '../errors';

describe('AppError factory methods', () => {
    it('unauthorized() has UNAUTHENTICATED code and default message', () => {
        const err = AppError.unauthorized();
        expect(err.message).toBe('Unauthorized');
        expect(err.extensions.code).toBe('UNAUTHENTICATED');
    });

    it('unauthorized() accepts a custom message', () => {
        const err = AppError.unauthorized('Token expired');
        expect(err.message).toBe('Token expired');
    });

    it('forbidden() has FORBIDDEN code', () => {
        const err = AppError.forbidden();
        expect(err.extensions.code).toBe('FORBIDDEN');
        expect(err.message).toBe('Forbidden');
    });

    it('notFound() includes entity name in message', () => {
        const err = AppError.notFound('Order');
        expect(err.message).toBe('Order not found');
        expect(err.extensions.code).toBe('NOT_FOUND');
    });

    it('notFound() works for any entity string', () => {
        expect(AppError.notFound('Business').message).toBe('Business not found');
        expect(AppError.notFound('Driver').message).toBe('Driver not found');
    });

    it('badInput() has BAD_USER_INPUT code', () => {
        const err = AppError.badInput('Email is required');
        expect(err.message).toBe('Email is required');
        expect(err.extensions.code).toBe('BAD_USER_INPUT');
    });

    it('conflict() has CONFLICT code', () => {
        const err = AppError.conflict('Email already in use');
        expect(err.extensions.code).toBe('CONFLICT');
    });

    it('businessRule() has BUSINESS_RULE_VIOLATION code', () => {
        const err = AppError.businessRule('Promotion already used');
        expect(err.extensions.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('all errors are instances of AppError', () => {
        expect(AppError.unauthorized()).toBeInstanceOf(AppError);
        expect(AppError.forbidden()).toBeInstanceOf(AppError);
        expect(AppError.notFound('X')).toBeInstanceOf(AppError);
        expect(AppError.badInput('x')).toBeInstanceOf(AppError);
        expect(AppError.conflict('x')).toBeInstanceOf(AppError);
        expect(AppError.businessRule('x')).toBeInstanceOf(AppError);
    });

    it('fromZodError() formats multiple issues into one message', () => {
        const zodError = {
            issues: [
                { path: ['email'], message: 'Invalid email' },
                { path: ['phone', '0'], message: 'Too short' },
            ],
        };
        const err = AppError.fromZodError(zodError);
        expect(err.extensions.code).toBe('BAD_USER_INPUT');
        expect(err.message).toContain('email: Invalid email');
        expect(err.message).toContain('phone.0: Too short');
    });

    it('fromZodError() handles a single issue', () => {
        const err = AppError.fromZodError({ issues: [{ path: ['name'], message: 'Required' }] });
        expect(err.message).toBe('Validation failed: name: Required');
    });
});
