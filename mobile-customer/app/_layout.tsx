import { useTheme } from '@/hooks/useTheme';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import '../global.css';
import { useAppSetup } from '@/hooks/useAppSetup';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApolloProvider } from '@apollo/client/react';
import client from '@/lib/graphql/apolloClient';
import LoadingScreen from '@/components/LoadingScreen';
import { FloatingBars } from '@/components/FloatingBars';
import { useActiveOrdersTracking } from '@/hooks/useActiveOrdersTracking';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { useNotifications } from '@/hooks/useNotifications';
import StoreClosedScreen from '@/components/StoreClosedScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastContainer } from '@/components/Toast';
import InfoBanner from '@/components/InfoBanner';
import type { InfoBannerType } from '@/components/InfoBanner';
import { initSentry } from '@/lib/sentry';
import { useState } from 'react';

// ── Initialise Sentry before anything else renders ──
initSentry();

// Inner component that uses Apollo Client (must be inside ApolloProvider)
function AppContent() {
    const theme = useTheme();
    const { isStoreClosed, closedMessage, loading: storeStatusLoading, bannerEnabled, bannerMessage, bannerType } = useStoreStatus();
    const [bannerDismissed, setBannerDismissed] = useState(false);

    // Initialize push notifications
    useNotifications();

    // Track active orders (query + subscription)
    useActiveOrdersTracking();

    // Show store closed screen if store is closed
    if (storeStatusLoading) {
        return <LoadingScreen />;
    }

    if (isStoreClosed) {
        return <StoreClosedScreen message={closedMessage} />;
    }

    const showBanner = bannerEnabled && !!bannerMessage && !bannerDismissed;

    return (
        <ThemeProvider value={theme}>
            <SafeAreaProvider>
                {showBanner && (
                    <InfoBanner
                        message={bannerMessage}
                        type={(bannerType as InfoBannerType) ?? 'INFO'}
                        onDismiss={() => setBannerDismissed(true)}
                    />
                )}
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="auth-selection" options={{ headerShown: false }} />
                    <Stack.Screen name="signup" options={{ headerShown: false }} />
                    <Stack.Screen name="login" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="business/[businessId]" options={{ headerShown: false }} />
                    <Stack.Screen name="product/[productId]" options={{ headerShown: false }} />
                    <Stack.Screen
                        name="cart"
                        options={{
                            presentation: 'modal',
                            animation: 'slide_from_bottom',
                            gestureDirection: 'vertical',
                            gestureEnabled: true,
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="orders/active"
                        options={{
                            presentation: 'modal',
                            animation: 'slide_from_bottom',
                            gestureDirection: 'vertical',
                            gestureEnabled: true,
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="orders/[orderId]"
                        options={{
                            presentation: 'modal',
                            animation: 'slide_from_bottom',
                            gestureDirection: 'vertical',
                            gestureEnabled: true,
                            headerShown: false,
                        }}
                    />
                </Stack>
                <FloatingBars />
                <ToastContainer />
            </SafeAreaProvider>
        </ThemeProvider>
    );
}

export default function RootLayout() {
    const { ready } = useAppSetup();

    // Show loading screen during app setup
    if (!ready) {
        return <LoadingScreen />;
    }

    return (
        <ErrorBoundary>
            <ApolloProvider client={client}>
                <AppContent />
            </ApolloProvider>
        </ErrorBoundary>
    );
}
