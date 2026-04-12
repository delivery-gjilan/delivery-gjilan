import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, Observable } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { getMainDefinition } from '@apollo/client/utilities';
import { SetContextLink } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { persistCache, AsyncStorageWrapper } from 'apollo3-cache-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { getValidAccessToken, refreshAccessToken } from './authSession';

// Operations that never need an auth token — skip getValidAccessToken() entirely
// so they are never blocked by a slow or failing token refresh.
const AUTH_SKIP_OPERATIONS = new Set([
    'Login',
    'InitiateSignup',
    'VerifyEmail',
    'ResendEmailVerification',
]);

const logLink = new ApolloLink((operation, forward) => {
    console.log('Request', {
        name: operation.operationName,
        vars: operation.variables,
    });
    return forward(operation);
});

const errorLink = onError(({ error, operation, forward }) => {
    if (CombinedGraphQLErrors.is(error)) {
        for (const err of error.errors) {
            if (err.extensions?.code === 'UNAUTHENTICATED' || err.message === 'Unauthorized' || err.message === 'Authentication failed') {
                const def = getMainDefinition(operation.query);
                const isSubscription =
                    def.kind === 'OperationDefinition' && def.operation === 'subscription';

                if (isSubscription) {
                    // WS subscriptions authenticate at connection time via connectionParams.
                    // Retrying forward() with updated headers won't help — we must force a
                    // full WS reconnect so connectionParams() runs again with a fresh token.
                    void refreshAccessToken().then(() => closeAndReconnectWs());
                    return;
                }

                const alreadyRetried = operation.getContext().alreadyRetriedAuth === true;
                if (alreadyRetried || !forward) {
                    console.warn('[Apollo] Auth refresh failed or already retried; logging out');
                    void useAuthStore.getState().logout().then(() => {
                        router.replace('/auth-selection');
                    });
                    return;
                }

                return new Observable((observer) => {
                    refreshAccessToken()
                        .then((token) => {
                            if (!token) {
                                console.warn('[Apollo] Token refresh returned null; logging out');
                                void useAuthStore.getState().logout().then(() => {
                                    router.replace('/auth-selection');
                                });
                                observer.error(error);
                                return;
                            }

                            operation.setContext(({ headers = {} }) => ({
                                alreadyRetriedAuth: true,
                                headers: {
                                    ...headers,
                                    authorization: `Bearer ${token}`,
                                },
                            }));

                            const subscription = forward(operation).subscribe({
                                next: (value) => observer.next(value),
                                error: (networkError) => observer.error(networkError),
                                complete: () => observer.complete(),
                            });

                            return () => subscription.unsubscribe();
                        })
                        .catch((refreshError) => {
                            console.warn('[Apollo] Token refresh failed:', refreshError);
                            void useAuthStore.getState().logout().then(() => {
                                router.replace('/auth-selection');
                            });
                            observer.error(error);
                        });
                });
            }
        }
        // Show first non-auth GraphQL error as toast (skip operations marked as silent)
        const firstError = error.errors[0];
        if (firstError && !operation.getContext().silentErrors) {
            console.error(`[Apollo] GraphQL error in ${operation.operationName}:`, firstError.message);
            if (__DEV__) {
                toast.error(firstError.message);
            }
        } else if (firstError) {
            console.warn(`[Apollo] Silent GraphQL error in ${operation.operationName}:`, firstError.message);
        }
    } else {
        // Network or other error
        const statusCode = 'statusCode' in error ? (error as any).statusCode : undefined;
        if (statusCode === 401) {
            console.warn('[Apollo] 401 received; preserving session until manual logout');
            return;
        }
        const opName = operation.operationName || 'unknown';
        const detail = statusCode ? ` (HTTP ${statusCode})` : '';
        console.error(`[Apollo] Network error in ${opName}${detail}:`, error.message);
        toast.error('Network Error', `Request failed${detail}. Please check your connection.`);
    }
});

const authLink = new SetContextLink(async ({ headers }, operation) => {
    const opName = operation.operationName ?? '';
    // Auth operations (login, signup, etc.) never need a token.
    // Skipping getValidAccessToken() avoids blocking these requests
    // behind a slow or failing token refresh on cold start.
    const token = AUTH_SKIP_OPERATIONS.has(opName)
        ? null
        : await getValidAccessToken();

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

// Exponential backoff for reconnection: 1s -> 2s -> 5s -> 10s
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000];
let reconnectAttempts = 0;
let hasConnectedBefore = false;
const wsReconnectListeners = new Set<() => void>();
let activeWsSocket: { close: (code?: number, reason?: string) => void } | null = null;

export function addWsReconnectListener(listener: () => void): () => void {
    wsReconnectListeners.add(listener);
    return () => {
        wsReconnectListeners.delete(listener);
    };
}

/** Force the WebSocket to close; graphql-ws will reconnect and re-run connectionParams() with a fresh token. */
export function closeAndReconnectWs(): void {
    try {
        activeWsSocket?.close(4000, 'Token refresh');
    } catch {
        // ignore
    }
}

const wsLink = wsUrl
    ? new GraphQLWsLink(
          createClient({
              url: wsUrl,
              lazy: true,
              connectionParams: async () => {
                  const token = await getValidAccessToken();
                  return {
                      authorization: token ? `Bearer ${token}` : '',
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
                  connected: (socket) => {
                      activeWsSocket = socket as typeof activeWsSocket;
                      console.log('[WS] Connected');
                      if (hasConnectedBefore) {
                          console.log(`[WS] Reconnected after ${reconnectAttempts} attempt(s)`);
                          toast.success('Connected', 'Real-time updates restored.');
                          wsReconnectListeners.forEach((listener) => {
                              try {
                                  listener();
                              } catch (error) {
                                  console.warn('[WS] Reconnect listener failed', error);
                              }
                          });
                      }
                      hasConnectedBefore = true;
                      reconnectAttempts = 0;
                  },
                  closed: (event) => {
                      activeWsSocket = null;
                      console.log('[WS] Connection closed', event);
                  },
                  error: (err) => {
                      console.error('[WS] Error', err);
                      // Only show toast if user is authenticated — no point
                      // alerting about WS failures on the login screen.
                      if (reconnectAttempts === 0 && useAuthStore.getState().isAuthenticated) {
                          toast.error('Connection Error', 'Reconnecting...');
                      }
                  },
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
                product: {
                    read(_, { args, toReference }) {
                        return toReference({ __typename: 'Product', id: args?.id });
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
}).catch(async (err) => {
    console.warn('[ApolloCache] Failed to persist/restore cache, purging:', err);
    try {
        await AsyncStorage.removeItem('apollo-cache-persist');
        cache.reset();
    } catch { /* ignore */ }
});

const client = new ApolloClient({
    link: ApolloLink.from([logLink, errorLink, splitLink]),
    cache,
    defaultOptions: {
        watchQuery: {
            fetchPolicy: 'cache-and-network',
            nextFetchPolicy: 'cache-first',
        },
    },
});

export default client;
