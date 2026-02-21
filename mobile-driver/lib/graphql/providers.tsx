import React, { useEffect, useState } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import client, { cacheReady } from './apolloClient';
import { ThemeProvider } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';

interface ProvidersProps {
    children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    const theme = useTheme();
    const [cacheRestored, setCacheRestored] = useState(false);

    useEffect(() => {
        cacheReady.then(() => setCacheRestored(true));
    }, []);

    // Don't render children until the persisted cache is loaded.
    // This ensures the first render has cached data available,
    // eliminating the skeleton flash on cold app starts.
    if (!cacheRestored) return null;

    return (
        <ApolloProvider client={client}>
            <ThemeProvider value={theme}>
                <SafeAreaProvider>{children}</SafeAreaProvider>
            </ThemeProvider>
        </ApolloProvider>
    );
}

export default Providers;
