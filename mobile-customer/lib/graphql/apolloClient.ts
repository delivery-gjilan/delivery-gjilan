import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  Observable,
} from '@apollo/client';
import { API_CONFIG } from '@/utils/environment';

// Custom error handling link
const errorLink = new ApolloLink(
  (operation, forward) => {
    return new Observable((observer) => {
      let subscription: any;

      try {
        subscription = forward(operation).subscribe({
          next: (response: any) => {
            // Log GraphQL errors if present
            if (response.errors) {
              console.error('GraphQL Error:', response.errors);
            }
            observer.next(response);
          },
          error: (error: any) => {
            console.error('Apollo Error:', error);
            observer.error(error);
          },
          complete: () => observer.complete(),
        });
      } catch (error) {
        observer.error(error);
      }

      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    });
  }
);

// HTTP Link for connecting to GraphQL server
const httpLink = new HttpLink({
  uri: API_CONFIG.GRAPHQL_URL,
  credentials: 'include',
});

// Combine error link and http link
const link = errorLink.concat(httpLink);

// Create Apollo Client instance
const client = new ApolloClient({
  link,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          orders: {
            merge(existing: any, incoming: any) {
              return incoming;
            },
          },
          businesses: {
            merge(existing: any, incoming: any) {
              return incoming;
            },
          },
        },
      },
    },
  }),
} as any);

export default client;
