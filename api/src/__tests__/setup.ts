/**
 * Global Vitest unit-test setup.
 *
 * Mocks the `redis` package so no real TCP connections are attempted during
 * unit tests (rate-limit-redis in app.ts calls createClient at import time).
 */
import { vi } from 'vitest';

const mockRedisClient = {
    on: vi.fn().mockReturnThis(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    sendCommand: vi.fn().mockResolvedValue(null),
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
};

vi.mock('redis', () => ({
    createClient: vi.fn(() => ({ ...mockRedisClient })),
}));
