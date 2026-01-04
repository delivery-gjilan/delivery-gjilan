import { useTheme } from '@/hooks/useTheme';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import '../global.css';
import { useAppSetup } from '@/hooks/useAppSetup';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApolloProvider } from '@apollo/client/react';
import client from '@/lib/graphql/apolloClient';
import { useAuthInitialization } from '@/hooks/useAuthInitialization';
import LoadingScreen from '@/components/LoadingScreen';
import { FloatingBars } from '@/components/FloatingBars';
import { useActiveOrdersTracking } from '@/hooks/useActiveOrdersTracking';

// Inner component that uses Apollo Client (must be inside ApolloProvider)
function AppContent() {
    const { loading } = useAuthInitialization();
    const theme = useTheme();

    // Track active orders (query + subscription)
    useActiveOrdersTracking();

    // Show loading screen during auth initialization
    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <ThemeProvider value={theme}>
            <SafeAreaProvider>
                <Stack screenOptions={{ headerShown: false }}>
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
        <ApolloProvider client={client}>
            <AppContent />
        </ApolloProvider>
    );
}
