import { ApolloClient, InMemoryCache, HttpLink, from, split } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { toast } from 'sonner';

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

const errorLink = onError(({ error }) => {
    if (CombinedGraphQLErrors.is(error)) {
        for (const err of error.errors) {
            const code = err.extensions?.code;
            if (code === "UNAUTHENTICATED" || code === "FORBIDDEN") {
                // Auth errors — redirect to login
                if (typeof window !== "undefined") {
                    localStorage.removeItem("authToken");
                    window.location.href = "/";
                }
                return;
            }
            toast.error(err.message || "An error occurred");
        }
    } else {
        toast.error("Network error. Please check your connection.");
    }
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
        from([errorLink, authLink, httpLink])
    )
    : from([errorLink, authLink, httpLink]);

const createApolloClient = () => {
    return new ApolloClient({
        link: splitLink,
        cache: new InMemoryCache(),
    });
};

export default createApolloClient;
