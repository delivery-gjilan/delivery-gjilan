import { ApolloClient, InMemoryCache, HttpLink, from, split } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/graphql",
});

const wsLink = typeof window !== "undefined" ? new GraphQLWsLink(
    createClient({
        url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/graphql',
        connectionParams: () => {
            const token = localStorage.getItem("authToken");
            return {
                authorization: token ? `Bearer ${token}` : "",
            };
        },
    })
) : null;

const authLink = setContext((_, { headers }) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    return {
        headers: {
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    };
});

// Split link: use WebSocket for subscriptions, HTTP for queries/mutations
const splitLink = typeof window !== "undefined" && wsLink
    ? split(
        ({ query }) => {
            const definition = getMainDefinition(query);
            return (
                definition.kind === 'OperationDefinition' &&
                definition.operation === 'subscription'
            );
        },
        wsLink,
        from([authLink, httpLink])
    )
    : from([authLink, httpLink]);

const createApolloClient = () => {
    return new ApolloClient({
        link: splitLink,
        cache: new InMemoryCache(),
    });
};

export default createApolloClient;
