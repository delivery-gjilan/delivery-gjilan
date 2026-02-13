import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { SetContextLink } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient, Client } from 'graphql-ws';
import { useAuthStore } from '@/store/authStore';

/**
 * Exponential backoff configuration for WebSocket reconnection
 * Pattern: 1s → 2s → 5s → 10s (infinite retry)
 */
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000];

function getNextReconnectDelay(retries: number): number {
  const index = Math.min(retries, RECONNECT_DELAYS.length - 1);
  return RECONNECT_DELAYS[index];
}

const logLink = new ApolloLink((operation, forward) => {
    console.log('Request', {
        name: operation.operationName,
        vars: operation.variables,
        query: operation.query?.loc?.source?.body,
    });
    return forward(operation);
});

const authLink = new SetContextLink(async ({ headers }) => {
    let token = useAuthStore.getState().token;

    if (!token) {
        const { getToken } = await import('@/utils/secureTokenStore');
        token = await getToken();
    }

    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
        },
    };
});

const httpLink = new HttpLink({
    uri: process.env.EXPO_PUBLIC_API_URL,
});

const httpUrl = process.env.EXPO_PUBLIC_API_URL!;
const wsUrl = httpUrl.replace(/^http/, 'ws');

// Track reconnection attempts
let reconnectAttempts = 0;

const wsClient: Client = createClient({
    url: wsUrl,
    connectionParams: async () => {
        let token = useAuthStore.getState().token;
        if (!token) {
            const { getToken } = await import('@/utils/secureTokenStore');
            token = await getToken();
        }

        return {
            Authorization: token ? `Bearer ${token}` : '',
        };
    },
    // Infinite retry with exponential backoff
    shouldRetry: () => true,
    retryAttempts: Infinity,
    retryWait: async (retries) => {
        reconnectAttempts = retries;
        const delay = getNextReconnectDelay(retries);
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${retries + 1})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
    },
    on: {
        connected: () => {
            console.log('[WS] Connected');
            if (reconnectAttempts > 0) {
                console.log(`[WS] Reconnected after ${reconnectAttempts} attempts`);
            }
            reconnectAttempts = 0;
        },
        closed: (event) => {
            console.log('[WS] Closed', event);
        },
        error: (err) => {
            console.error('[WS] Error', err);
        },
    },
    // Keep-alive ping every 30 seconds
    keepAlive: 30000,
    // Lazy connection - only connect when needed
    lazy: true,
});

const wsLink = new GraphQLWsLink(wsClient);

const splitLink = ApolloLink.split(
    ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
    },
    wsLink,
    authLink.concat(httpLink),
);

const client = new ApolloClient({
    link: ApolloLink.from([logLink, splitLink]),
    cache: new InMemoryCache(),
});

export default client;
