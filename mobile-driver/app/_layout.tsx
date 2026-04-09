import { Stack, useRouter } from 'expo-router';
import '../global.css';
import { useAppSetup } from '@/hooks/useAppSetup';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Providers from '@/lib/graphql/providers';
import { useDriverTracking } from '@/hooks/useDriverTracking';
import { useNotifications } from '@/hooks/useNotifications';
import { useDriverPttReceiver } from '@/hooks/useDriverPttReceiver';
import DriverMessageBanner from '@/components/DriverMessageBanner';
import type { AlertType } from '@/components/DriverMessageBanner';
import { useSubscription } from '@apollo/client/react';
import { DRIVER_MESSAGE_RECEIVED_SUB } from '@/graphql/operations/driverMessages';
import { useGlobalOrderAccept } from '@/hooks/useGlobalOrderAccept';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { OrderAcceptSheet } from '@/components/OrderAcceptSheet';
import { OrderPoolSheet } from '@/components/OrderPoolSheet';
import { useOrderAcceptStore } from '@/store/orderAcceptStore';
import { useAuthStore } from '@/store/authStore';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_TOKEN } from '@/utils/mapbox';
import { useNavigationStore } from '@/store/navigationStore';

function AppContent() {
    const router = useRouter();
    // Start heartbeat as soon as auth is established
    useDriverTracking();
    useNotifications();
    useNetworkStatus();
    const isNetworkConnected = useAuthStore((s) => s.isNetworkConnected);
    const { isAdminTalking, isTalking, pttError, startTalking, stopTalking } = useDriverPttReceiver();
    const { pendingOrder, autoCountdown, accepting, acceptError, takenByOther, networkReady, assignedOrders, availableOrders, poolOrders, handleAcceptOrder, handleSkipOrder, handleAcceptAndNavigate } =
        useGlobalOrderAccept();

    const isOnline = useAuthStore((s) => s.isOnline);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isNavigationActive = useNavigationStore((s) => s.isNavigating);
    const { dispatchModeEnabled } = useStoreStatus();
    const [poolOpen, setPoolOpen] = useState(false);
    const didStartupAssignedRedirectRef = useRef(false);

    const showPoolFab = isAuthenticated && !dispatchModeEnabled && isOnline && poolOrders.length > 0;

    // Vibrate when a new order pops up for the driver
    useEffect(() => {
        if (!pendingOrder) return;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [pendingOrder?.id]);

    // Auto-dismiss accept error after 4 seconds
    useEffect(() => {
        if (!acceptError) return;
        const t = setTimeout(() => useOrderAcceptStore.getState().setAcceptError(null), 4000);
        return () => clearTimeout(t);
    }, [acceptError]);

    // Auto-dismiss "taken by other" overlay after 2 seconds, then let the next order surface
    useEffect(() => {
        if (!takenByOther) return;
        const t = setTimeout(() => {
            useOrderAcceptStore.getState().setTakenByOther(false);
            useOrderAcceptStore.getState().setPendingOrder(null);
        }, 2000);
        return () => clearTimeout(t);
    }, [takenByOther]);

    interface IncomingMessage {
        id: string;
        senderRole: string;
        body: string;
        alertType: AlertType;
        adminId: string;
    }
    const [incomingMessage, setIncomingMessage] = useState<IncomingMessage | null>(null);

    useSubscription(DRIVER_MESSAGE_RECEIVED_SUB, {
        onData: ({ data: subData }) => {
            const msg = subData.data?.driverMessageReceived as IncomingMessage | undefined;
            if (!msg || msg.senderRole !== 'ADMIN') return;
            setIncomingMessage(msg);
        },
    });

    useEffect(() => {
        if (!isAuthenticated || isNavigationActive || !networkReady) return;
        if (didStartupAssignedRedirectRef.current) return;
        if (assignedOrders.length === 0) return;

        didStartupAssignedRedirectRef.current = true;
        router.replace('/(tabs)/drive' as any);
    }, [assignedOrders.length, isAuthenticated, isNavigationActive, networkReady, router]);

    return (
        <>
            {!isNetworkConnected && (
                <View className="absolute top-12 left-4 right-4 z-50 rounded-xl border border-yellow-500/40 bg-yellow-900/80 px-4 py-3 flex-row items-center gap-3">
                    <Ionicons name="cloud-offline-outline" size={18} color="#fbbf24" />
                    <Text className="text-yellow-200 text-sm font-semibold flex-1">
                        No internet connection
                    </Text>
                </View>
            )}
            {isAdminTalking && (
                <View className="absolute top-12 left-4 right-4 z-50 rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-3 flex-row items-center gap-3">
                    <ActivityIndicator color="#fca5a5" size="small" />
                    <Text className="text-red-200 text-sm font-semibold">
                        Admin is talking
                    </Text>
                </View>
            )}
            {incomingMessage && (
                <DriverMessageBanner
                    key={incomingMessage.id}
                    senderName="Dispatcher"
                    body={incomingMessage.body}
                    alertType={incomingMessage.alertType}
                    adminId={incomingMessage.adminId}
                    onDismiss={() => setIncomingMessage(null)}
                />
            )}
            {isAuthenticated && acceptError && (
                <View style={{
                    position: 'absolute',
                    bottom: 170,
                    left: 16,
                    right: 16,
                    zIndex: 70,
                    backgroundColor: '#7f1d1d',
                    borderRadius: 12,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                }}>
                    <Ionicons name="alert-circle-outline" size={20} color="#fca5a5" />
                    <Text style={{ color: '#fca5a5', flex: 1, fontSize: 14 }}>{acceptError}</Text>
                    <Pressable onPress={() => useOrderAcceptStore.getState().setAcceptError(null)}>
                        <Ionicons name="close" size={18} color="#fca5a5" />
                    </Pressable>
                </View>
            )}
            {isAuthenticated && pendingOrder && (
                <OrderAcceptSheet
                    order={pendingOrder}
                    onAccept={handleAcceptOrder}
                    onAcceptAndNavigate={handleAcceptAndNavigate}
                    onSkip={handleSkipOrder}
                    accepting={accepting}
                    autoCountdown={autoCountdown}
                    takenByOther={takenByOther}
                />
            )}
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                    name="navigation"
                    options={{
                        presentation: 'fullScreenModal',
                        headerShown: false,
                        gestureEnabled: false,
                        animation: 'fade',
                    }}
                />
            </Stack>
            {/* Driver PTT (talk to dispatch) floating button */}
            {isAuthenticated && isOnline && (
                <View style={{
                    position: 'absolute',
                    bottom: showPoolFab ? 230 : 160,
                    left: 16,
                    zIndex: 60,
                    alignItems: 'center',
                    gap: 4,
                }}>
                    {isTalking && (
                        <View style={{
                            backgroundColor: 'rgba(239,68,68,0.9)',
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                        }}>
                            <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>🔴 Live</Text>
                        </View>
                    )}
                    {!!pttError && !isTalking && (
                        <View style={{
                            backgroundColor: 'rgba(127,29,29,0.9)',
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            maxWidth: 140,
                        }}>
                            <Text style={{ color: '#fca5a5', fontSize: 9, fontWeight: '600' }} numberOfLines={2}>{pttError}</Text>
                        </View>
                    )}
                    <Pressable
                        onPressIn={startTalking}
                        onPressOut={stopTalking}
                        style={{
                            backgroundColor: isTalking ? '#dc2626' : '#0b1120',
                            borderRadius: 18,
                            width: 58,
                            height: 58,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: isTalking ? 'rgba(248,113,113,0.5)' : 'rgba(139,92,246,0.25)',
                            shadowColor: isTalking ? '#ef4444' : '#8b5cf6',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.25,
                            shadowRadius: 12,
                            elevation: 12,
                        }}
                    >
                        <Ionicons name="mic" size={24} color={isTalking ? 'white' : '#a78bfa'} />
                    </Pressable>
                </View>
            )}
            {showPoolFab && (
                <Pressable
                    onPress={() => setPoolOpen(true)}
                    style={{
                        position: 'absolute',
                        bottom: 100,
                        right: 16,
                        zIndex: 60,
                        backgroundColor: '#0b1120',
                        borderRadius: 18,
                        width: 58,
                        height: 58,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(34,211,238,0.25)',
                        shadowColor: '#22d3ee',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.25,
                        shadowRadius: 12,
                        elevation: 12,
                    }}
                >
                    <Ionicons name="layers" size={22} color="#22d3ee" />
                    <View style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        backgroundColor: '#f97316',
                        borderRadius: 10,
                        minWidth: 18,
                        height: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 4,
                        borderWidth: 2,
                        borderColor: '#0b1120',
                    }}>
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>
                            {poolOrders.length}
                        </Text>
                    </View>
                </Pressable>
            )}
            {isAuthenticated && poolOpen && (
                <OrderPoolSheet
                    orders={poolOrders}
                    accepting={accepting}
                    onAccept={(order) => {
                        setPoolOpen(false);
                        handleAcceptOrder(order.id);
                    }}
                    onAcceptAndNavigate={(order) => {
                        setPoolOpen(false);
                        useOrderAcceptStore.getState().setPendingOrder(order, false);
                        handleAcceptAndNavigate(order.id);
                    }}
                    onClose={() => setPoolOpen(false)}
                />
            )}
        </>
    );
}

export default function RootLayout() {
    const { ready } = useAppSetup();
    const hasHydrated = useAuthStore((s) => s.hasHydrated);

    useEffect(() => {
        if (MAPBOX_TOKEN) {
            Mapbox.setAccessToken(MAPBOX_TOKEN);
        }
    }, []);

    if (!ready || !hasHydrated) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" className="text-blue-600" />
            </View>
        );
    }

    return (
        <Providers>
            <AppContent />
        </Providers>
    );
}
