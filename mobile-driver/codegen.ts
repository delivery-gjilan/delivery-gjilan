import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    schema: '../api/src/generated/schema.generated.graphql',
    documents: ['graphql/**/*.ts', 'graphql/**/*.tsx'],
    ignoreNoDocuments: true,
    generates: {
        './gql/': {
            preset: 'client',
        },
    },
};

export default config;
