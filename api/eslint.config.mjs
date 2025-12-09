import typescriptEslint from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default [
    {
        ignores: [
            'src/generated/**/*.ts',
            '**/generated',
            '**/dist',
            'db/*.js',
            'db/migrations',
            '**/*.graphql',
            '**/.eslintcache',
            'db/docker-compose.yml',
            '**/*.env',
            '**/package.json',
            '**/.md',
            'cloud-build.yml',
            '**/*.json',
        ],
    },
    ...compat.extends(
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:eslint-plugin-prettier/recommended',
        'prettier',
    ),
    {
        plugins: {
            '@typescript-eslint': typescriptEslint,
        },

        languageOptions: {
            globals: {
                ...globals.browser,
            },

            parser: tsParser,
            ecmaVersion: 'latest',
            sourceType: 'module',
        },

        rules: {
            'linebreak-style': ['error', 'windows'],
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'no-var': ['error'],
            'max-len': [
                'error',
                {
                    code: 120,
                },
            ],
            // Ignore unused variables in catch blocks
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    args: 'after-used',
                    ignoreRestSiblings: false,
                    caughtErrors: 'none', // Disable the check for unused `catch` error variables
                },
            ],
        },
    },
];
