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
    },
};

export default config;
