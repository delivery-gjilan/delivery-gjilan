import { createSchema } from 'graphql-yoga';
import { resolvers } from '../generated/resolvers.generated';
import { typeDefs } from '../generated/typeDefs.generated';
import { skipAuthDirective } from './directives/skipAuthDirective';
import { DateScalar } from './scalars/dateScalar';
import { DateTimeScalar } from './scalars/dateTimeScalar';
import { JSONScalar } from './scalars/jsonScalar';

let schema = createSchema({
    typeDefs,
    resolvers: {
        ...resolvers,
        Date: DateScalar,
        DateTime: DateTimeScalar,
        JSON: JSONScalar,
    },
});

// Apply skipAuth directive transformer
schema = skipAuthDirective(schema);

export { schema };
