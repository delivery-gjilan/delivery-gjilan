import React, { useEffect, useState } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import client, { cacheReady } from './apolloClient';
import { ThemeProvider } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';

interface ProvidersProps {
    children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    const theme = useTheme();
    const [cacheRestored, setCacheRestored] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const timeout = setTimeout(() => {
            if (isMounted) {
                console.warn('[ApolloCache] Restore timed out, continuing startup');
                setCacheRestored(true);
            }
        }, 2000);

        cacheReady.finally(() => {
            if (isMounted) {
                clearTimeout(timeout);
                setCacheRestored(true);
            }
        });

        return () => {
            isMounted = false;
            clearTimeout(timeout);
        };
    }, []);

    // Don't render children until the persisted cache is loaded.
    // This ensures the first render has cached data available,
    // eliminating the skeleton flash on cold app starts.
    if (!cacheRestored) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <ApolloProvider client={client}>
            <ThemeProvider value={theme}>
                <SafeAreaProvider>{children}</SafeAreaProvider>
            </ThemeProvider>
        </ApolloProvider>
    );
}

export default Providers;
