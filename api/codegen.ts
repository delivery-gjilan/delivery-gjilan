import type { CodegenConfig } from '@graphql-codegen/cli';
import { defineConfig } from '@eddeee888/gcg-typescript-resolver-files';

const config: CodegenConfig = {
  schema: './src/interfaces/graphql/schemas/**/*.graphql',
  generates: {
    'src/interfaces/graphql/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        contextType: '../context#Context',
      },
    },
    'src/interfaces/graphql/generated': defineConfig({
      // (3)
      resolverGeneration: 'recommended', // (4)
      typesPluginsConfig: {
        contextType: '../context#GraphQLContext', // (5)
      },
    }),
    '../web/app/graphql/generated/graphql.tsx': {
      plugins: ['typescript', 'typescript-operations', 'typescript-react-apollo'],
      documents: '../web/app/graphql/operations/**/*.graphql',
      config: {
        gqlImport: '@apollo/client/core/index.js#gql',
      },
    },
  },
};

export default config;
