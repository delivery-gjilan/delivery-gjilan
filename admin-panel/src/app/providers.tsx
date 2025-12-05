// src/app/providers.tsx
"use client";

import { ApolloProvider } from "@apollo/client/react";
import { apolloClient } from "@/lib/graphql/apollo-client";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
