/**
 * Unit tests for parseDbTimestamp — the utility that normalises timestamps
 * coming out of the database before they are used in business logic.
 *
 * Timestamps arrive in many formats depending on the driver, timezone,
 * and Postgres config. Wrong parsing silently produces NaN dates, which
 * then propagate as invalid ISO strings to clients.
 */
import { describe, it, expect } from 'vitest';
import { parseDbTimestamp } from '../dateTime';

describe('parseDbTimestamp', () => {
    it('returns null for null', () => {
        expect(parseDbTimestamp(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parseDbTimestamp(undefined)).toBeNull();
    });

    it('returns null for an empty string', () => {
        expect(parseDbTimestamp('')).toBeNull();
    });

    it('passes through a valid Date object', () => {
        const d = new Date('2026-03-25T10:00:00Z');
        const result = parseDbTimestamp(d);
        expect(result).toBeInstanceOf(Date);
        expect(result!.getTime()).toBe(d.getTime());
    });

    it('returns null for an invalid Date object', () => {
        expect(parseDbTimestamp(new Date('not-a-date'))).toBeNull();
    });

    it('parses a standard ISO 8601 UTC string', () => {
        const result = parseDbTimestamp('2026-03-25T10:00:00Z');
        expect(result).toBeInstanceOf(Date);
        expect(result!.toISOString()).toBe('2026-03-25T10:00:00.000Z');
    });

    it('parses a Postgres "space-separated" timestamp (no T)', () => {
        const result = parseDbTimestamp('2026-03-25 10:00:00');
        expect(result).toBeInstanceOf(Date);
        expect(result!.getUTCHours()).toBe(10);
    });

    it('parses a timestamp with a timezone offset (+02:00)', () => {
        const result = parseDbTimestamp('2026-03-25T12:00:00+02:00');
        expect(result).toBeInstanceOf(Date);
        // 12:00 +02:00 = 10:00 UTC
        expect(result!.getUTCHours()).toBe(10);
    });

    it('parses a timestamp with a compact offset (+0200, no colon)', () => {
        const result = parseDbTimestamp('2026-03-25T12:00:00+0200');
        expect(result).toBeInstanceOf(Date);
        expect(result!.getUTCHours()).toBe(10);
    });

    it('returns null for a completely garbled string', () => {
        expect(parseDbTimestamp('not-a-date-at-all')).toBeNull();
    });
});
