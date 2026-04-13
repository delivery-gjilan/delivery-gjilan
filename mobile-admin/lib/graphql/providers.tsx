import React, { useEffect, useState } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import client, { cacheReady } from './apolloClient';
import { ThemeProvider } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';

interface ProvidersProps {
    children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    const theme = useTheme();
    const [cacheRestored, setCacheRestored] = useState(false);

    useEffect(() => {
        cacheReady
            .then(() => setCacheRestored(true))
            .catch((err) => {
                console.warn('[ApolloCache] Cache restore failed, continuing without cache:', err);
                setCacheRestored(true);
            });
    }, []);

    if (!cacheRestored) return null;

    return (
        <ApolloProvider client={client}>
            <ThemeProvider value={theme}>
                <SafeAreaProvider>{children}</SafeAreaProvider>
            </ThemeProvider>
        </ApolloProvider>
    );
}
