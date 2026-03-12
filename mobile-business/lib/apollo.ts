import { ApolloClient, InMemoryCache, HttpLink, split, from, ApolloLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { useAuthStore } from '@/store/authStore';
import { getValidAccessToken } from './authSession';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:4000';

// HTTP Link
const httpLink = new HttpLink({
    uri: `${API_URL}/graphql`,
});

// Exponential backoff for reconnection: 1s -> 2s -> 5s -> 10s
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000];
let reconnectAttempts = 0;

// WebSocket Link for subscriptions
const wsLink = new GraphQLWsLink(
    createClient({
        url: `${WS_URL}/graphql`,
        lazy: true,
        connectionParams: async () => {
            // Get fresh token for each connection attempt
            const token = await getValidAccessToken();
            return token ? { authorization: `Bearer ${token}` } : {};
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
);

// Auth Link
const authLink = setContext(async (_, { headers }) => {
    const token = await getValidAccessToken();
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
        },
    };
});

// Error Link
const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
        graphQLErrors.forEach(({ message, locations, path }) => {
            console.error(`[GraphQL error]: Message: ${message}, Path: ${path}`);
            if (message.includes('Unauthorized') || message.includes('token')) {
                useAuthStore.getState().logout();
            }
        });
    }
    if (networkError) {
        console.error(`[Network error]: ${networkError}`);
    }
});

// Split link for queries/mutations vs subscriptions
const splitLink = split(
    ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
    },
    wsLink,
    from([errorLink, authLink, httpLink])
);

export const apolloClient = new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
    defaultOptions: {
        watchQuery: {
            fetchPolicy: 'cache-and-network',
        },
    },
});
