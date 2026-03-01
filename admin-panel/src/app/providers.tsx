// src/app/providers.tsx
"use client";

import { ApolloProvider } from "@apollo/client/react";
import createApolloClient from "@/lib/graphql/apollo-client";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "sonner";

const client = createApolloClient();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ApolloProvider client={client}>
            <AuthProvider>
                {children}
                <Toaster position="top-right" richColors closeButton />
            </AuthProvider>
        </ApolloProvider>
    );
}
