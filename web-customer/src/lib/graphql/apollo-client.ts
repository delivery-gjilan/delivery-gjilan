import { ApolloClient, InMemoryCache, HttpLink, from, split } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/graphql";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/graphql";

const httpLink = new HttpLink({ uri: API_URL });

const REFRESH_TOKEN_MUTATION = `
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      token
      refreshToken
    }
  }
`;

let refreshPromise: Promise<string | null> | null = null;

const clearStoredAuth = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userData");
};

const parseJwtExpiryMs = (token: string): number | null => {
    try {
        const [, payload] = token.split(".");
        if (!payload) return null;
        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
        const decoded = JSON.parse(atob(padded)) as { exp?: number };
        return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
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
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                operationName: "RefreshToken",
                query: REFRESH_TOKEN_MUTATION,
                variables: { refreshToken: storedRefreshToken },
            }),
        });

        const raw = await response.text();
        let payload: Record<string, unknown> | null = null;
        try {
            payload = raw ? JSON.parse(raw) : null;
        } catch {
            payload = null;
        }

        const data = payload?.data as Record<string, unknown> | undefined;
        const refreshed = data?.refreshToken as { token?: string; refreshToken?: string } | undefined;

        if (response.ok && refreshed?.token && refreshed?.refreshToken) {
            localStorage.setItem("authToken", refreshed.token);
            localStorage.setItem("refreshToken", refreshed.refreshToken);
            return refreshed.token;
        }

        const errors = payload?.errors as Array<{ extensions?: { code?: string }; message?: string }> | undefined;
        const gqlCode = errors?.[0]?.extensions?.code;

        if (response.status === 401 || response.status === 403 || gqlCode === "UNAUTHENTICATED") {
            clearStoredAuth();
            return null;
        }

        return localStorage.getItem("authToken");
    })()
        .catch(() => localStorage.getItem("authToken"))
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
};

const getValidAccessToken = async (): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    const currentToken = localStorage.getItem("authToken");
    if (isTokenFresh(currentToken)) return currentToken;
    return refreshAccessToken();
};

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000];

const wsLink =
    typeof window !== "undefined"
        ? new GraphQLWsLink(
              createClient({
                  url: WS_URL,
                  lazy: true,
                  connectionParams: async () => {
                      const token = await getValidAccessToken();
                      return { authorization: token ? `Bearer ${token}` : "" };
                  },
                  retryAttempts: Infinity,
                  shouldRetry: () => true,
                  retryWait: async (retries) => {
                      const delay = RECONNECT_DELAYS[Math.min(retries, RECONNECT_DELAYS.length - 1)];
                      await new Promise((resolve) => setTimeout(resolve, delay));
                  },
                  keepAlive: 30000,
              })
          )
        : null;

const authLink = setContext((_, { headers }) => {
    return getValidAccessToken().then((token) => ({
        headers: {
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    }));
});

const errorLink = onError(({ error, operation }) => {
    // On auth errors, clear stored credentials but do NOT redirect.
    // Individual pages that require auth handle redirecting to /login themselves.
    if (error && "errors" in error && Array.isArray((error as any).errors)) {
        for (const err of (error as any).errors) {
            // Only clear auth for explicit UNAUTHENTICATED errors, not all errors
            if (err.extensions?.code === "UNAUTHENTICATED" && typeof window !== "undefined") {
                clearStoredAuth();
                return;
            }
        }
    }
    if (error && "statusCode" in error) {
        const statusCode = (error as any).statusCode;
        // Only clear auth for 401/403, not other errors
        if ((statusCode === 401 || statusCode === 403) && typeof window !== "undefined") {
            clearStoredAuth();
        }
    }
});

const splitLink =
    typeof window !== "undefined" && wsLink
        ? split(
              ({ query }) => {
                  const definition = getMainDefinition(query);
                  return definition.kind === "OperationDefinition" && definition.operation === "subscription";
              },
              wsLink,
              from([errorLink, authLink, httpLink])
          )
        : from([errorLink, authLink, httpLink]);

const createApolloClient = () => {
    return new ApolloClient({
        link: splitLink,
        cache: new InMemoryCache({
            typePolicies: {
                Query: {
                    fields: {
                        // List queries — merge by identity, don't re-fetch if cached
                        businesses: { merge: false },
                        products: { merge: false },
                        productCategories: { merge: false },
                        productSubcategoriesByBusiness: { merge: false },
                        banners: { merge: false },
                        orders: { merge: false },
                    },
                },
                // Normalize by id so all queries pointing to same entity share cache
                Business: { keyFields: ["id"] },
                Product: { keyFields: ["id"] },
                ProductCategory: { keyFields: ["id"] },
                ProductSubcategory: { keyFields: ["id"] },
                OptionGroup: { keyFields: ["id"] },
                Option: { keyFields: ["id"] },
                Banner: { keyFields: ["id"] },
                Promotion: { keyFields: ["id"] },
            },
        }),
        defaultOptions: {
            watchQuery: {
                // Serve from cache instantly, refresh in background only if stale
                fetchPolicy: "cache-first",
                // Don't hammer the network on window re-focus
                notifyOnNetworkStatusChange: false,
            },
            query: {
                fetchPolicy: "cache-first",
            },
        },
    });
};

export default createApolloClient;
