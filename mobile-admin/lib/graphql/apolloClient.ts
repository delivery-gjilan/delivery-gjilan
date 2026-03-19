import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { SetContextLink } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient, Client } from 'graphql-ws';
import { persistCache, AsyncStorageWrapper } from 'apollo3-cache-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getValidAccessToken } from './authSession';

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000];

function getNextReconnectDelay(retries: number): number {
    const index = Math.min(retries, RECONNECT_DELAYS.length - 1);
    return RECONNECT_DELAYS[index]!;
}

function getApiUrl(): string | null {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) {
        console.error('[Apollo] EXPO_PUBLIC_API_URL is missing. Network calls are disabled.');
        return null;
    }
    return apiUrl;
}

const logLink = new ApolloLink((operation, forward) => {
    if (__DEV__) {
        console.log('[GQL]', operation.operationName, operation.variables);
    }
    return forward(operation);
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
    uri: getApiUrl() ?? 'https://invalid.local/graphql',
});

const httpUrl = getApiUrl();
const wsUrl = httpUrl ? httpUrl.replace(/^http/, 'ws') : null;

let reconnectAttempts = 0;

const wsClient: Client | null = wsUrl
    ? createClient({
          url: wsUrl,
          connectionParams: async () => {
              const token = await getValidAccessToken();
              return { Authorization: token ? `Bearer ${token}` : '' };
          },
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
                  if (reconnectAttempts > 0) console.log(`[WS] Reconnected after ${reconnectAttempts} attempts`);
              reconnectAttempts = 0;
          },
          closed: (event) => console.log('[WS] Closed', event),
          error: (err) => console.error('[WS] Error', err),
      },
      keepAlive: 30000,
      lazy: true,
    })
    : null;

const wsLink = wsClient ? new GraphQLWsLink(wsClient) : ApolloLink.empty();

const splitLink = ApolloLink.split(
    ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
    },
    wsLink,
    authLink.concat(httpLink),
);

export const cache = new InMemoryCache({
    typePolicies: {
        Order: { keyFields: ['id'], fields: { businesses: { merge: false } } },
        Business: { keyFields: ['id'], fields: { products: { merge: false } } },
        Product: { keyFields: ['id'] },
        User: { keyFields: ['id'] },
        Driver: { keyFields: ['id'] },
        Settlement: { keyFields: ['id'] },
        UserAddress: { keyFields: ['id'] },
        Promotion: { keyFields: ['id'] },
        Query: {
            fields: {
                order: {
                    read(_, { args, toReference }) {
                        return toReference({ __typename: 'Order', id: args?.id });
                    },
                },
                business: {
                    read(_, { args, toReference }) {
                        return toReference({ __typename: 'Business', id: args?.id });
                    },
                },
            },
        },
    },
});

export const cacheReady: Promise<void> = persistCache({
    cache,
    storage: new AsyncStorageWrapper(AsyncStorage),
    maxSize: 5 * 1024 * 1024,
    debug: __DEV__,
}).catch((err) => {
    console.warn('[ApolloCache] Failed to persist cache:', err);
});

const client = new ApolloClient({
    link: ApolloLink.from([logLink, splitLink]),
    cache,
    defaultOptions: {
        watchQuery: {
            fetchPolicy: 'cache-and-network',
            nextFetchPolicy: 'cache-first',
        },
    },
});

export default client;
