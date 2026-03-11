import { ApolloClient, InMemoryCache, HttpLink, from, split } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { toast } from 'sonner';

const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/graphql",
});

// Exponential backoff for reconnection: 1s -> 2s -> 5s -> 10s
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000];
let reconnectAttempts = 0;

const wsLink = typeof window !== "undefined" ? new GraphQLWsLink(
    createClient({
        url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/graphql',
        lazy: true,
        connectionParams: () => {
            // Get fresh token for each connection attempt
            const token = localStorage.getItem("authToken");
            return {
                authorization: token ? `Bearer ${token}` : "",
            };
        },
        retryAttempts: Infinity,
        shouldRetry: () => true,
        retryWait: async (retries) => {
            reconnectAttempts = retries;
            const delay = RECONNECT_DELAYS[Math.min(retries, RECONNECT_DELAYS.length - 1)];
            console.log(`[WS] Reconnecting in ${delay}ms (attempt ${retries + 1})`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        },
        keepAlive: 30000, // Send ping every 30s to keep connection alive
        on: {
            connected: () => {
                console.log('[WS] Connected');
                if (reconnectAttempts > 0) {
                    console.log(`[WS] Reconnected after ${reconnectAttempts} attempts`);
                    toast.success('Connection restored');
                }
                reconnectAttempts = 0;
            },
            closed: (event) => {
                console.log('[WS] Connection closed', event);
            },
            error: (err) => {
                console.error('[WS] WebSocket error:', err);
            },
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

const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
        for (const err of graphQLErrors) {
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
    }
    if (networkError) {
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
