import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        exclude: ['src/**/*.integration.test.ts', 'node_modules'],
        setupFiles: ['src/__tests__/setup.ts'],
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
