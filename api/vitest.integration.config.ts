import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';

// Load .env before Vitest spins up test workers so DB_URL is available.
loadEnv({ path: resolve(__dirname, '.env') });

/**
 * Separate vitest config for integration tests.
 * These tests require a live PostgreSQL connection (the same dev DB).
 *
 * Run with:
 *   cd api && npx vitest run --config vitest.integration.config.ts
 *   or:
 *   cd api && npm run test:integration
 */
export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['src/**/*.integration.test.ts'],
        testTimeout: 45_000,
        hookTimeout: 30_000,
        // Run integration tests sequentially — prevents concurrent beforeAll hooks
        // from racing on the same DB rows when both test files seed/cleanup together.
        fileParallelism: false,
        pool: 'forks',
        forks: { singleFork: true },
    },
    resolve: {
        alias: {
            '@/database/schema': resolve(__dirname, './database/schema'),
            '@/database': resolve(__dirname, './database'),
            '@': resolve(__dirname, './src'),
            '@lib': resolve(__dirname, './src/lib'),
        },
    },
});
