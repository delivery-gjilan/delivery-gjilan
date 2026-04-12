"use client";

import { ApolloProvider } from "@apollo/client/react";
import createApolloClient from "@/lib/graphql/apollo-client";
import { AuthProvider } from "@/lib/auth-context";
// import { LocationProvider } from "@/lib/location-context"; // Temporarily disabled
import { I18nProvider } from "@/localization";
import { ActiveOrderBanner } from "@/components/layout/ActiveOrderBanner";
import { CartFloatingBar } from "@/components/layout/CartFloatingBar";
import { CartDrawer } from "@/components/checkout/CartDrawer";
import { OrderSuccessModal } from "@/components/orders/OrderSuccessModal";
import { AwaitingApprovalModal } from "@/components/orders/AwaitingApprovalModal";

const client = createApolloClient();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ApolloProvider client={client}>
            <AuthProvider>
                {/* <LocationProvider> - Temporarily disabled to fix login issues */}
                <I18nProvider>
                    {children}
                    <CartFloatingBar />
                    <CartDrawer />
                    <ActiveOrderBanner />
                    <OrderSuccessModal />
                    <AwaitingApprovalModal />
                </I18nProvider>
                {/* </LocationProvider> */}
            </AuthProvider>
        </ApolloProvider>
    );
}
