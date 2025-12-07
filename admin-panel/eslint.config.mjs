import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import graphqlEslint from "@graphql-eslint/eslint-plugin";

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,

    // GraphQL ESLint configuration
    {
        files: ["**/*.ts", "**/*.tsx"],
        processor: graphqlEslint.processor,
    },
    {
        files: ["**/*.graphql"],
        languageOptions: {
            parser: graphqlEslint.parser,
        },
        plugins: {
            "@graphql-eslint": graphqlEslint,
        },
        rules: {
            ...graphqlEslint.configs["flat/operations-recommended"].rules,
            "@graphql-eslint/no-deprecated": "warn",
            "@graphql-eslint/fields-on-correct-type": "error",
            "@graphql-eslint/known-argument-names": "error",
            "@graphql-eslint/known-type-names": "error",
        },
    },

    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
        "src/graphql/generated/**",
        "src/gql/**", // Ignore generated GraphQL files
    ]),
]);

export default eslintConfig;
