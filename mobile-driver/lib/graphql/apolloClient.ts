import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { SetContextLink } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { useAuthStore } from '@/store/authStore';

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

const wsLink = new GraphQLWsLink(
    createClient({
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
        on: {
            connected: () => console.log('[WS] Connected'),
            error: (err) => console.error('[WS] Error', err),
        },
    }),
);

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
