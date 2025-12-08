import { createSchema } from 'graphql-yoga';
import { resolvers } from '../generated/resolvers.generated';
import { typeDefs } from '../generated/typeDefs.generated';
import { skipAuthDirective } from './directives/skipAuthDirective';

let schema = createSchema({
    typeDefs,
    resolvers,
});

// Apply skipAuth directive transformer
schema = skipAuthDirective(schema);

export { schema };
