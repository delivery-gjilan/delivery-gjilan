"use client";

import { ApolloProvider } from "@apollo/client/react";
import createApolloClient from "@/lib/graphql/apollo-client";
import { AuthProvider } from "@/lib/auth-context";
import { I18nProvider } from "@/localization";

const client = createApolloClient();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ApolloProvider client={client}>
            <AuthProvider>
                <I18nProvider>
                    {children}
                </I18nProvider>
            </AuthProvider>
        </ApolloProvider>
    );
}
