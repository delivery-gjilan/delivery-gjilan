import '../global.css';
import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { ApolloProvider, useSubscription } from '@apollo/client/react';
import { apolloClient, initializeCache } from '@/lib/apollo';
import { useAuthStore } from '@/store/authStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useAuthInitialization } from '@/hooks/useAuthInitialization';
import { useNotifications } from '@/hooks/useNotifications';
import { useBusinessDeviceMonitoring } from '@/hooks/useBusinessDeviceMonitoring';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import BusinessMessageBanner from '@/components/BusinessMessageBanner';
import type { AlertType } from '@/components/BusinessMessageBanner';
import StoreClosedOverlay from '@/components/StoreClosedOverlay';
import { BUSINESS_MESSAGE_RECEIVED_SUB } from '@/graphql/messages';

function AppContent() {
    const router = useRouter();
    const segments = useSegments();
    const rootNavigationState = useRootNavigationState();
    const { isAuthenticated, hasHydrated, authInitComplete } = useAuthStore();
    const loadTranslation = useLocaleStore((state) => state.loadTranslation);
    const [incomingMessage, setIncomingMessage] = useState<{
        id: string; body: string; alertType: AlertType; adminId: string;
    } | null>(null);
    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;
    }, []);

    // Subscribe to business messages globally so banner shows even outside messages tab
    useSubscription(BUSINESS_MESSAGE_RECEIVED_SUB, {
        skip: !isAuthenticated,
        onData: ({ data: subData }) => {
            const msg = subData.data?.businessMessageReceived;
            if (!msg || msg.senderRole !== 'ADMIN') return;
            setIncomingMessage({
                id: msg.id,
                body: msg.body,
                alertType: msg.alertType as AlertType,
                adminId: msg.adminId,
            });
        },
    });

    // Initialize authentication
    useAuthInitialization();
    useNotifications();
    useBusinessDeviceMonitoring();

    useEffect(() => {
        loadTranslation();
    }, [loadTranslation]);

    // Navigation guard
    useEffect(() => {
        if (!hasHydrated || !authInitComplete || !isMounted.current || !rootNavigationState?.key) return;

        const currentSegment = segments[0];
        const inTabsGroup = currentSegment === '(tabs)';
        const onLoginRoute = currentSegment === 'login';

        if (!isAuthenticated && inTabsGroup) {
            setTimeout(() => router.replace('/login'), 0);
        } else if (isAuthenticated && onLoginRoute) {
            setTimeout(() => router.replace('/(tabs)'), 0);
        }
    }, [isAuthenticated, segments, hasHydrated, authInitComplete, router]);

    // Show loading screen while hydrating
    if (!hasHydrated || !authInitComplete) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    return (
        <>
            <StatusBar style="light" />
            {incomingMessage && (
                <BusinessMessageBanner
                    senderName="Admin"
                    body={incomingMessage.body}
                    alertType={incomingMessage.alertType}
                    adminId={incomingMessage.adminId}
                    onDismiss={() => setIncomingMessage(null)}
                />
            )}
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" />
                <Stack.Screen name="(tabs)" />
            </Stack>
            {isAuthenticated && <StoreClosedOverlay />}
        </>
    );
}

export default function RootLayout() {
    const [cacheReady, setCacheReady] = useState(false);

    useEffect(() => {
        initializeCache().finally(() => setCacheReady(true));
    }, []);

    if (!cacheReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    return (
        <ApolloProvider client={apolloClient}>
            <AppContent />
        </ApolloProvider>
    );
}
