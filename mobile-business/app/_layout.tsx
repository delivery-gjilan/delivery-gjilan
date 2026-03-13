import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ApolloProvider, useQuery } from '@apollo/client/react';
import { apolloClient } from '@/lib/apollo';
import { useAuthStore } from '@/store/authStore';
import { useAuthInitialization } from '@/hooks/useAuthInitialization';
import { useNotifications } from '@/hooks/useNotifications';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import InfoBanner from '@/components/InfoBanner';
import type { InfoBannerType } from '@/components/InfoBanner';
import { GET_STORE_STATUS } from '@/graphql/store';

function AppContent() {
    const router = useRouter();
    const segments = useSegments();
    const { isAuthenticated, hasHydrated } = useAuthStore();
    const [bannerDismissed, setBannerDismissed] = useState(false);

    const { data: storeData } = useQuery(GET_STORE_STATUS, { pollInterval: 30_000 });
    const bannerEnabled = storeData?.getStoreStatus?.bannerEnabled ?? false;
    const bannerMessage = storeData?.getStoreStatus?.bannerMessage ?? null;
    const bannerType = (storeData?.getStoreStatus?.bannerType as InfoBannerType) ?? 'INFO';
    const showBanner = bannerEnabled && !!bannerMessage && !bannerDismissed;

    // Initialize authentication
    useAuthInitialization();
    useNotifications();

    // Navigation guard
    useEffect(() => {
        if (!hasHydrated) return;

        const currentSegment = segments[0];
        const inTabsGroup = currentSegment === 'dashboard' || currentSegment === 'products' || currentSegment === 'settings';
        
        if (!isAuthenticated && inTabsGroup) {
            router.replace('/login');
        } else if (isAuthenticated && !inTabsGroup) {
            router.replace('/(tabs)');
        }
    }, [isAuthenticated, segments, hasHydrated, router]);

    // Show loading screen while hydrating
    if (!hasHydrated) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <ActivityIndicator size="large" color="#0b89a9" />
            </View>
        );
    }

    return (
        <>
            <StatusBar style="light" />
            {showBanner && (
                <InfoBanner
                    message={bannerMessage}
                    type={bannerType}
                    onDismiss={() => setBannerDismissed(true)}
                />
            )}
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" />
                <Stack.Screen name="(tabs)" />
            </Stack>
        </>
    );
}

export default function RootLayout() {
    return (
        <ApolloProvider client={apolloClient}>
            <AppContent />
        </ApolloProvider>
    );
}
