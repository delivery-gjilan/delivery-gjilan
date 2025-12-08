import React from 'react';
import { ApolloProvider } from '@apollo/client';
import client from './apolloClient';
import { ThemeProvider } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const theme = useTheme();

  return (
    <ApolloProvider client={client}>
      <ThemeProvider value={theme}>
        <SafeAreaProvider>
          {children}
        </SafeAreaProvider>
      </ThemeProvider>
    </ApolloProvider>
  );
}

export default Providers;
