import { ApolloClient, InMemoryCache, HttpLink, split, from, ApolloLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:4000';

// HTTP Link
const httpLink = new HttpLink({
    uri: `${API_URL}/graphql`,
});

// WebSocket Link for subscriptions
const wsLink = new GraphQLWsLink(
    createClient({
        url: `${WS_URL}/graphql`,
        connectionParams: () => {
            const token = useAuthStore.getState().token;
            return token ? { authorization: `Bearer ${token}` } : {};
        },
    })
);

// Auth Link
const authLink = setContext((_, { headers }) => {
    const token = useAuthStore.getState().token;
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
