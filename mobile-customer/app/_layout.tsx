import { useTheme } from '@/hooks/useTheme';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import '../global.css';
import { useAppSetup } from '@/hooks/useAppSetup';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import SuccessModalContainer from '@/components/SuccessModalContainer';

import { initSentry } from '@/lib/sentry';
import { useEffect } from 'react';
import Mapbox from '@rnmapbox/maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCartDataStore } from '@/modules/cart/store/cartDataStore';

// ── Initialise Sentry before anything else renders ──
initSentry();

// Inner component that uses Apollo Client (must be inside ApolloProvider)
function AppContent() {
    const theme = useTheme();
    const { isStoreClosed, closedMessage, loading: storeStatusLoading } = useStoreStatus();

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

    return (
        <ThemeProvider value={theme}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" options={{ headerShown: false }} />
                        <Stack.Screen name="auth-selection" options={{ headerShown: false }} />
                        <Stack.Screen name="signup" options={{ headerShown: false }} />
                        <Stack.Screen name="login" options={{ headerShown: false }} />
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen 
                            name="business/[businessId]" 
                            options={{ 
                                headerShown: false,
                                presentation: 'card',
                                animation: 'slide_from_right',
                                gestureEnabled: false,
                            }} 
                        />
                        <Stack.Screen name="product/[productId]" options={{ headerShown: false }} />
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
                </SafeAreaProvider>
            </GestureHandlerRootView>
        </ThemeProvider>
    );
}

export default function RootLayout() {
    const { ready } = useAppSetup();

    // TEMP DEBUG: force-clear cart on every app start.
    useEffect(() => {
        useCartDataStore.setState({ items: [] });
        void AsyncStorage.removeItem('cart-storage');
    }, []);

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
