import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { getMainDefinition } from '@apollo/client/utilities';
import { SetContextLink } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient, Client } from 'graphql-ws';
import { persistCache, AsyncStorageWrapper } from 'apollo3-cache-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getValidAccessToken } from './authSession';

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

const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
        for (const err of graphQLErrors) {
            if (err.extensions?.code === 'UNAUTHENTICATED' || err.message === 'Unauthorized') {
                console.warn('[Apollo] Auth error:', err.message);
                // DON'T auto-logout - let user stay logged in unless they explicitly log out
                // Token refresh or reconnection will handle temporary auth issues
            }
        }
    }
    if (networkError && 'statusCode' in networkError && (networkError as any).statusCode === 401) {
        console.warn('[Apollo] 401 Unauthorized - token may need refresh');
        // DON'T auto-logout - let user stay logged in
        // This prevents forced logouts due to temporary auth issues or token expiry
    }
});

const authLink = new SetContextLink(async ({ headers }) => {
    const token = await getValidAccessToken();

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
        const token = await getValidAccessToken();

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

/**
 * Normalise every entity by its `id` field so Apollo can merge updates from
 * subscriptions and queries into the same cache entries instead of duplicating.
 * The `merge: false` on list fields suppresses the "existing data will be lost"
 * warning when a subscription payload replaces a list.
 */
export const cache = new InMemoryCache({
    typePolicies: {
        Order:       { keyFields: ['id'], fields: { businesses: { merge: false } } },
        Business:    { keyFields: ['id'], fields: { products:   { merge: false } } },
        Product:     { keyFields: ['id'] },
        User:        { keyFields: ['id'] },
        Driver:      { keyFields: ['id'] },
        Settlement:  { keyFields: ['id'] },
        UserAddress: { keyFields: ['id'] },
        Query: {
            fields: {
                // Return cached order by id without a round-trip when navigating
                // from the orders list to an individual order screen.
                order: { read(_, { args, toReference }) {
                    return toReference({ __typename: 'Order', id: args?.id });
                }},
            },
        },
    },
});

/**
 * Restore the Apollo cache from AsyncStorage on cold start.
 * Call (await) this before rendering the first screen so data is available
 * before the first paint. 5 MB cap prevents runaway growth.
 */
export const cacheReady: Promise<void> = persistCache({
    cache,
    storage: new AsyncStorageWrapper(AsyncStorage),
    maxSize: 5 * 1024 * 1024,
    debug: __DEV__,
}).catch((err) => {
    // Persistence failure is non-fatal — the app works with an empty cache.
    console.warn('[ApolloCache] Failed to persist cache:', err);
});

const client = new ApolloClient({
    link: ApolloLink.from([logLink, errorLink, splitLink]),
    cache,
    defaultOptions: {
        watchQuery: {
            // Show cached data immediately and refresh in background.
            // Individual queries can still override this per-call.
            fetchPolicy: 'cache-and-network',
            nextFetchPolicy: 'cache-first',
        },
    },
});

export default client;
