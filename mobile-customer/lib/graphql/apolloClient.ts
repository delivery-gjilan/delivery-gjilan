import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { SetContextLink } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { persistCache, AsyncStorageWrapper } from 'apollo3-cache-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';

const logLink = new ApolloLink((operation, forward) => {
    console.log('Request', {
        name: operation.operationName,
        vars: operation.variables,
    });
    return forward(operation);
});

const authLink = new SetContextLink(async ({ headers }) => {
    // Try to get token from Zustand store first (faster)
    let token = useAuthStore.getState().token;

    // If not in store, try secure storage (fallback)
    if (!token) {
        const { getToken } = await import('../../utils/secureTokenStore');
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

// Calculate WS URL from HTTP URL (e.g. https://... -> wss://...)
const httpUrl = process.env.EXPO_PUBLIC_API_URL;
const wsUrl = httpUrl ? httpUrl.replace(/^http/, 'ws') : '';

const wsLink = wsUrl
    ? new GraphQLWsLink(
          createClient({
              url: wsUrl,
              lazy: true,
              retryAttempts: 3,
              shouldRetry: () => true,
              on: {
                  connected: () => console.log('[WS] Connected'),
                  error: (err) => console.error('[WS] Error', err),
              },
          }),
      )
    : null;

const splitLink = wsLink
    ? ApolloLink.split(
          ({ query }) => {
              const definition = getMainDefinition(query);
              return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
          },
          wsLink,
          authLink.concat(httpLink),
      )
    : authLink.concat(httpLink);

export const cache = new InMemoryCache({
    typePolicies: {
        Order:       { keyFields: ['id'], fields: { businesses: { merge: false } } },
        Business:    { keyFields: ['id'], fields: { products:   { merge: false } } },
        Product:     { keyFields: ['id'] },
        User:        { keyFields: ['id'] },
        Driver:      { keyFields: ['id'] },
        Settlement:  { keyFields: ['id'] },
        UserAddress: { keyFields: ['id'] },
        Promotion:   { keyFields: ['id'] },
        Query: {
            fields: {
                order: { read(_, { args, toReference }) {
                    return toReference({ __typename: 'Order', id: args?.id });
                }},
                business: { read(_, { args, toReference }) {
                    return toReference({ __typename: 'Business', id: args?.id });
                }},
                product: { read(_, { args, toReference }) {
                    return toReference({ __typename: 'Product', id: args?.id });
                }},
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
