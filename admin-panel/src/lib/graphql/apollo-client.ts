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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/graphql";
const REFRESH_TOKEN_MUTATION = `
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      token
      refreshToken
    }
  }
`;

let refreshPromise: Promise<string | null> | null = null;

const isAuthFailureStatus = (status?: number) => status === 401 || status === 403;

const clearStoredAuth = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("adminData");
};

const parseJwtExpiryMs = (token: string): number | null => {
    try {
        const [, payload] = token.split('.');
        if (!payload) return null;
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const decoded = JSON.parse(atob(padded)) as { exp?: number };
        return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
    } catch {
        return null;
    }
};

const isTokenFresh = (token: string | null, minValidityMs = 60_000) => {
    if (!token) return false;
    const expiryMs = parseJwtExpiryMs(token);
    if (!expiryMs) return false;
    return expiryMs - Date.now() > minValidityMs;
};

const refreshAccessToken = async (): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        const storedRefreshToken = localStorage.getItem("refreshToken");
        if (!storedRefreshToken) return null;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operationName: 'RefreshToken',
                query: REFRESH_TOKEN_MUTATION,
                variables: { refreshToken: storedRefreshToken },
            }),
        });

        const raw = await response.text();
        let payload: any = null;
        try {
            payload = raw ? JSON.parse(raw) : null;
        } catch {
            payload = null;
        }

        const refreshed = payload?.data?.refreshToken;
        if (response.ok && refreshed?.token && refreshed?.refreshToken) {
            localStorage.setItem('authToken', refreshed.token);
            localStorage.setItem('refreshToken', refreshed.refreshToken);
            return refreshed.token as string;
        }

        const gqlCode = payload?.errors?.[0]?.extensions?.code;
        const message = payload?.errors?.[0]?.message || `Refresh failed with status ${response.status}`;

        // Token is invalid/expired for real: clear and force re-login.
        if (isAuthFailureStatus(response.status) || gqlCode === 'UNAUTHENTICATED') {
            clearStoredAuth();
            return null;
        }

        // Transient upstream/proxy errors (e.g. 502) should not wipe local auth.
        console.warn('[Auth] Refresh temporarily unavailable:', message);
        return localStorage.getItem('authToken');
    })()
        .catch((error) => {
            console.error('[Auth] Refresh failed:', error);
            // Keep the current token for transient failures; request-level auth handling can decide next step.
            return localStorage.getItem('authToken');
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
};

const getValidAccessToken = async (): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    const currentToken = localStorage.getItem('authToken');
    if (isTokenFresh(currentToken)) {
        return currentToken;
    }
    return refreshAccessToken();
};

// Exponential backoff for reconnection: 1s -> 2s -> 5s -> 10s
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000];
let reconnectAttempts = 0;

const wsLink = typeof window !== "undefined" ? new GraphQLWsLink(
    createClient({
        url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/graphql',
        lazy: true,
        connectionParams: async () => {
            // Get fresh token for each connection attempt
            const token = await getValidAccessToken();
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
                const normalized = err instanceof Error
                    ? { message: err.message, name: err.name, stack: err.stack }
                    : (() => {
                        try {
                            return JSON.parse(JSON.stringify(err));
                        } catch {
                            return { value: String(err) };
                        }
                    })();

                // graphql-ws may emit empty error payloads ({}) on reconnect cycles.
                // Skip logging those to avoid noisy console spam.
                if (
                    normalized &&
                    typeof normalized === 'object' &&
                    !Array.isArray(normalized) &&
                    Object.keys(normalized).length === 0
                ) {
                    return;
                }

                console.error('[WS] WebSocket error:', normalized);
            },
        },
    })
) : null;

const authLink = setContext((_, { headers }) => {
    return getValidAccessToken().then((token) => ({
        headers: {
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    }));
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
        for (const err of graphQLErrors) {
            const code = err.extensions?.code;
            if (code === "UNAUTHENTICATED") {
                // Invalid or expired auth token — redirect to login.
                if (typeof window !== "undefined") {
                    clearStoredAuth();
                    window.location.href = "/";
                }
                return;
            }
            if (code === "FORBIDDEN") {
                toast.error(err.message || "You do not have permission to perform this action.");
                continue;
            }
            toast.error(err.message || "An error occurred");
        }
    }
    if (networkError) {
        const statusCode = 'statusCode' in networkError ? networkError.statusCode : undefined;
        if (statusCode === 401 && typeof window !== "undefined") {
            clearStoredAuth();
            window.location.href = "/";
            return;
        }
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
