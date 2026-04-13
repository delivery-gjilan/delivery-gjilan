import { defineConfig } from 'vitest/config';

/**
 * Workspace-level vitest config for pure-logic tests that live outside
 * the API package (e.g. mobile-driver, mobile-customer).
 *
 * Run all:
 *   npx vitest run --config vitest.config.ts
 *
 * Run specific:
 *   npx vitest run --config vitest.config.ts mobile-driver
 */
export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: [
            'mobile-driver/utils/__tests__/**/*.test.ts',
            'mobile-customer/utils/__tests__/**/*.test.ts',
        ],
    },
});
