import { useTheme } from '@/hooks/useTheme';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import '../global.css';
import { useAppSetup } from '@/hooks/useAppSetup';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApolloProvider } from '@apollo/client/react';
import client from '@/lib/graphql/apolloClient';

export default function RootLayout() {
    const { ready } = useAppSetup();
    const theme = useTheme();

    if (!ready) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" className="text-blue-600" />
            </View>
        );
    }

    return (
        <ApolloProvider client={client}>
            <ThemeProvider value={theme}>
                <SafeAreaProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen
                            name="create-transaction"
                            options={{
                                headerShown: false,
                                animation: 'slide_from_bottom',
                                gestureDirection: 'vertical',
                            }}
                        />
                    </Stack>
                </SafeAreaProvider>
            </ThemeProvider>
        </ApolloProvider>
    );
}
