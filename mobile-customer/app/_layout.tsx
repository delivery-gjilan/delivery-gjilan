import { useTheme } from '@/hooks/useTheme';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import '../global.css';
import { loadDevMessages, loadErrorMessages } from '@apollo/client/dev';
import { useAppSetup } from '@/hooks/useAppSetup';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ApolloProvider } from '@apollo/client/react';
import client from '@/lib/graphql/apolloClient';
import LoadingScreen from '@/components/LoadingScreen';

loadDevMessages();
loadErrorMessages();
import { FloatingBars } from '@/components/FloatingBars';
import { useActiveOrdersTracking } from '@/hooks/useActiveOrdersTracking';
import { useStoreStatusInit, useStoreStatus } from '@/hooks/useStoreStatus';
import { useNotifications } from '@/hooks/useNotifications';
import StoreClosedScreen from '@/components/StoreClosedScreen';
import SuspendedAccountScreen from '@/components/SuspendedAccountScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastContainer } from '@/components/Toast';
import SuccessModalContainer from '@/components/SuccessModalContainer';
import AwaitingApprovalModalContainer from '@/components/AwaitingApprovalModalContainer';
import OrderReviewModalContainer from '@/components/OrderReviewModalContainer';
import { useBackgroundLiveActivity } from '@/hooks/useBackgroundLiveActivity';
import { useEffect } from 'react';
import Mapbox from '@rnmapbox/maps';
import { useActiveOrdersStore } from '@/modules/orders/store/activeOrdersStore';
import { useAuthStore } from '@/store/authStore';

// Inner component that uses Apollo Client (must be inside ApolloProvider)
function AppContent() {
    const theme = useTheme();
    useStoreStatusInit();
    const { isStoreClosed, closedMessage, wasOpenOnEntry, loading: storeStatusLoading } = useStoreStatus();
    const hasActiveOrders = useActiveOrdersStore((state) => state.hasActiveOrders);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);

    // Initialize push notifications
    useNotifications();

    // Track active orders (query + subscription)
    const { loading: activeOrdersLoading } = useActiveOrdersTracking();

    // Start/update Live Activity from anywhere in the app when it moves to background.
    useBackgroundLiveActivity();

    // Block app access for suspended accounts.
    if (user?.isBanned) {
        return <SuspendedAccountScreen />;
    }

    // Show store closed screen if store is closed
    if (storeStatusLoading) {
        return <LoadingScreen />;
    }

    // When the app opens during a closed window, allow authenticated users with
    // in-flight orders to enter so they can continue tracking/completing the order.
    const needsActiveOrderExemptionCheck = isStoreClosed && !wasOpenOnEntry && isAuthenticated;
    if (needsActiveOrderExemptionCheck && activeOrdersLoading) {
        return <LoadingScreen />;
    }

    // Only block users who opened the app while the store was already closed.
    // Users already in the app continue browsing; users with active orders are also
    // allowed through so they can monitor active deliveries while the store is closed.
    if (isStoreClosed && !wasOpenOnEntry && !(isAuthenticated && hasActiveOrders)) {
        return <StoreClosedScreen message={closedMessage} />;
    }

    return (
        <ThemeProvider value={theme}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" options={{ headerShown: false }} />
                        <Stack.Screen name="auth-selection" options={{ headerShown: false }} />
                        <Stack.Screen name="signup" options={{ headerShown: false }} />
                        <Stack.Screen name="login" options={{ headerShown: false }} />
                        <Stack.Screen name="brand-splash" options={{ headerShown: false, animation: 'fade' }} />
                        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none', gestureEnabled: false }} />
                        <Stack.Screen 
                            name="business/[businessId]" 
                            options={{ 
                                headerShown: false,
                                presentation: 'card',
                                animation: 'slide_from_right',
                                gestureEnabled: false,
                            }} 
                        />

                        <Stack.Screen
                            name="cart"
                            options={{
                                presentation: 'card',
                                animation: 'slide_from_bottom',
                                gestureEnabled: false,
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="orders"
                            options={{
                                presentation: 'card',
                                animation: 'slide_from_right',
                                gestureEnabled: false,
                                headerShown: false,
                            }}
                        />

                    </Stack>
                    <FloatingBars />
                    <ToastContainer />
                    <SuccessModalContainer />
                    <OrderReviewModalContainer />
                    <AwaitingApprovalModalContainer />
                </SafeAreaProvider>
            </GestureHandlerRootView>
        </ThemeProvider>
    );
}

export default function RootLayout() {
    const { ready } = useAppSetup();

    // Initialize Mapbox
    useEffect(() => {
        const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
        if (MAPBOX_TOKEN) {
            Mapbox.setAccessToken(MAPBOX_TOKEN);
        }
    }, []);

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
