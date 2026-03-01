import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from '@/lib/apollo';
import { useAuthStore } from '@/store/authStore';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
    const router = useRouter();
    const segments = useSegments();
    const { isAuthenticated, login, logout } = useAuthStore();
    const [isReady, setIsReady] = useState(false);

    // Restore authentication state
    useEffect(() => {
        const restoreAuth = async () => {
            try {
                const token = await SecureStore.getItemAsync('auth_token');
                const userJson = await SecureStore.getItemAsync('auth_user');
                
                if (token && userJson) {
                    const user = JSON.parse(userJson);
                    // Validate business user roles
                    if (user.role === 'BUSINESS_OWNER' || user.role === 'BUSINESS_EMPLOYEE') {
                        login(user, token);
                    } else {
                        await SecureStore.deleteItemAsync('auth_token');
                        await SecureStore.deleteItemAsync('auth_user');
                    }
                }
            } catch (error) {
                console.error('Failed to restore auth:', error);
            } finally {
                setIsReady(true);
            }
        };
        restoreAuth();
    }, []);

    // Navigation guard
    useEffect(() => {
        if (!isReady) return;

        const inTabsGroup = segments[0] === '(tabs)';
        
        if (!isAuthenticated && inTabsGroup) {
            router.replace('/login');
        } else if (isAuthenticated && !inTabsGroup && segments[0] !== '(tabs)') {
            router.replace('/(tabs)');
        }
    }, [isAuthenticated, segments, isReady]);

    if (!isReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <ActivityIndicator size="large" color="#0b89a9" />
            </View>
        );
    }

    return (
        <ApolloProvider client={apolloClient}>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" />
                <Stack.Screen name="(tabs)" />
            </Stack>
        </ApolloProvider>
    );
}
