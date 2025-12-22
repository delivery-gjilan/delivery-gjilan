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

// Inner component that uses Apollo Client (must be inside ApolloProvider)
function AppContent() {
    const { loading } = useAuthInitialization();
    const theme = useTheme();

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
                    <Stack.Screen
                        name="create-transaction"
                        options={{
                            headerShown: false,
                            animation: 'slide_from_bottom',
                            gestureDirection: 'vertical',
                        }}
                    />
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
                </Stack>
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
