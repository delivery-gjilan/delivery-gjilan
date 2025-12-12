import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';

const logLink = new ApolloLink((operation, forward) => {
    console.log('Request', {
        name: operation.operationName,
        vars: operation.variables,
        query: operation.query?.loc?.source?.body,
    });
    return forward(operation);
});

const httpLink = new HttpLink({
    uri: process.env.EXPO_PUBLIC_API_URL,
});

const client = new ApolloClient({
    link: ApolloLink.from([logLink, httpLink]),
    cache: new InMemoryCache(),
});

export default client;
