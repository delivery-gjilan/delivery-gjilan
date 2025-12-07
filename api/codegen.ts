import type { CodegenConfig } from '@graphql-codegen/cli';
import { defineConfig } from '@eddeee888/gcg-typescript-resolver-files';

const config: CodegenConfig = {
    schema: './src/models/**/*.graphql',
    generates: {
        'src/generated': defineConfig({
            resolverGeneration: 'recommended',
            typesPluginsConfig: {
                contextType: '../graphql/context#GraphQLContext',
            },
        }),
        '../admin-panel/src/graphql/generated/graphql.tsx': {
            plugins: ['typescript', 'typescript-operations', 'typescript-react-apollo'],
            documents: '../admin-panel/src/graphql/operations/**/*.graphql',
            config: {
                withHooks: true,
                withHOC: false,
                withComponent: false,
                apolloReactCommonImportFrom: '@apollo/client/react',
                apolloReactHooksImportFrom: '@apollo/client/react',
            },
        },
    },
};

export default config;
