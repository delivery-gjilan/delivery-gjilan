// src/app/providers.tsx
"use client";

import { ApolloProvider } from "@apollo/client/react";
import createApolloClient from "@/lib/graphql/apollo-client";
import { AuthProvider } from "@/lib/auth-context";

const client = createApolloClient();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ApolloProvider client={client}>
            <AuthProvider>{children}</AuthProvider>
        </ApolloProvider>
    );
}
