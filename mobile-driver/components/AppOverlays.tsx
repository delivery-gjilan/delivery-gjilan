import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSubscription } from '@apollo/client/react';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useOrderAcceptStore } from '@/store/orderAcceptStore';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { useNavigationStore } from '@/store/navigationStore';
import { useDriverPttReceiver } from '@/hooks/useDriverPttReceiver';
import { useSharedOrderAccept } from '@/hooks/GlobalOrderAcceptContext';
import { DRIVER_MESSAGE_RECEIVED_SUB } from '@/graphql/operations/driverMessages';
import DriverMessageBanner from '@/components/DriverMessageBanner';
import type { AlertType } from '@/components/DriverMessageBanner';
import { OrderAcceptSheet } from '@/components/OrderAcceptSheet';
import { OrderPoolSheet } from '@/components/OrderPoolSheet';

interface IncomingMessage {
    id: string;
    senderRole: string;
    body: string;
    alertType: AlertType;
    adminId: string;
}

/**
 * All app-level floating overlays rendered above the navigation Stack.
 *
 * Extracted from _layout.tsx to keep the root layout thin.
 *
 * Includes:
 * - No-internet banner
 * - Admin talking banner (PTT receive indicator)
 * - Incoming message banner
 * - Accept error toast
 * - OrderAcceptSheet
 * - PTT floating button
 * - Pool FAB + OrderPoolSheet
 * - Startup redirect to drive tab when orders are assigned
 */
export function AppOverlays() {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { height: viewportHeight } = useWindowDimensions();
    const isNetworkConnected = useAuthStore((s) => s.isNetworkConnected);
    const isOnline = useAuthStore((s) => s.isOnline);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isNavigationActive = useNavigationStore((s) => s.isNavigating);
    const { dispatchModeEnabled } = useStoreStatus();
    const { isAdminTalking, isTalking, pttError, startTalking, stopTalking } = useDriverPttReceiver();
    const {
        pendingOrder,
        autoCountdown,
        accepting,
        acceptError,
        takenByOther,
        networkReady,
        assignedOrders,
        availableOrders,
        poolOrders,
        handleAcceptOrder,
        handleSkipOrder,
        handleAcceptAndNavigate,
    } = useSharedOrderAccept();

    const [poolOpen, setPoolOpen] = useState(false);
    const didStartupAssignedRedirectRef = useRef(false);
    const isDriveTab = pathname === '/(tabs)/drive' || pathname === '/drive';
    const isNavigationScreen = pathname === '/navigation';
    const isCompactHeight = viewportHeight < 760;
    const driveFloatingTopBase = insets.top + (isCompactHeight ? 240 : 272);

    // Vibrate when a new order pops up
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

    // Auto-dismiss "taken by other" after a visible dwell and surface the next best order.
    useEffect(() => {
        if (!takenByOther) return;
        const takenOrderId = useOrderAcceptStore.getState().pendingOrder?.id ?? null;
        const t = setTimeout(() => {
            const store = useOrderAcceptStore.getState();
            if (!store.takenByOther) return;

            // If the pending order changed meanwhile, do not override user/app flow.
            if ((store.pendingOrder?.id ?? null) !== takenOrderId) {
                store.setTakenByOther(false);
                return;
            }

            store.setTakenByOther(false);

            const nextOrder = availableOrders.find((o) => o.id !== takenOrderId) ?? null;
            if (isOnline && nextOrder && !store.accepting) {
                store.setPendingOrder(nextOrder, true);
                return;
            }

            store.setPendingOrder(null);
        }, 6000);
        return () => clearTimeout(t);
    }, [takenByOther, availableOrders, isOnline]);

    const [incomingMessage, setIncomingMessage] = useState<IncomingMessage | null>(null);
    useSubscription(DRIVER_MESSAGE_RECEIVED_SUB, {
        onData: ({ data: subData }) => {
            const msg = subData.data?.driverMessageReceived as IncomingMessage | undefined;
            if (!msg || msg.senderRole !== 'ADMIN') return;
            setIncomingMessage(msg);
        },
    });

    // Startup redirect: once networkReady + auth, go to drive tab if orders are assigned
    useEffect(() => {
        if (!isAuthenticated || isNavigationActive || !networkReady) return;
        if (didStartupAssignedRedirectRef.current) return;
        if (assignedOrders.length === 0) return;
        didStartupAssignedRedirectRef.current = true;
        router.replace('/(tabs)/drive' as any);
    }, [assignedOrders.length, isAuthenticated, isNavigationActive, networkReady, router]);

    const showPoolFab = isAuthenticated && !dispatchModeEnabled && isOnline && poolOrders.length > 0;

    return (
        <>
            {/* Network offline banner */}
            {!isNetworkConnected && (
                <View className="absolute top-12 left-4 right-4 z-50 rounded-xl border border-yellow-500/40 bg-yellow-900/80 px-4 py-3 flex-row items-center gap-3">
                    <Ionicons name="cloud-offline-outline" size={18} color="#fbbf24" />
                    <Text className="text-yellow-200 text-sm font-semibold flex-1">
                        No internet connection
                    </Text>
                </View>
            )}

            {/* Admin PTT receive indicator */}
            {isAdminTalking && (
                <View className="absolute top-12 left-4 right-4 z-50 rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-3 flex-row items-center gap-3">
                    <ActivityIndicator color="#fca5a5" size="small" />
                    <Text className="text-red-200 text-sm font-semibold">Admin is talking</Text>
                </View>
            )}

            {/* Incoming message banner */}
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

            {/* Accept error toast */}
            {isAuthenticated && acceptError && (
                <View style={{
                    position: 'absolute', bottom: 170, left: 16, right: 16, zIndex: 70,
                    backgroundColor: '#7f1d1d', borderRadius: 12, padding: 14,
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                }}>
                    <Ionicons name="alert-circle-outline" size={20} color="#fca5a5" />
                    <Text style={{ color: '#fca5a5', flex: 1, fontSize: 14 }}>{acceptError}</Text>
                    <Pressable onPress={() => useOrderAcceptStore.getState().setAcceptError(null)}>
                        <Ionicons name="close" size={18} color="#fca5a5" />
                    </Pressable>
                </View>
            )}

            {/* Taken by another driver toast */}
            {isAuthenticated && takenByOther && (
                <View style={{
                    position: 'absolute', bottom: 118, left: 16, right: 16, zIndex: 71,
                    backgroundColor: '#111827', borderRadius: 12, padding: 14,
                    borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)',
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                }}>
                    <Ionicons name="flash" size={18} color="#fbbf24" />
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fde68a', fontSize: 13, fontWeight: '700' }}>Order was accepted by another driver</Text>
                        <Text style={{ color: '#fef3c7', fontSize: 12 }} numberOfLines={1}>
                            {pendingOrder?.orderNumber ? `Order #${pendingOrder.orderNumber}. Checking next available order.` : 'Checking next available order.'}
                        </Text>
                    </View>
                </View>
            )}

            {/* Order accept sheet + dismiss backdrop */}
            {isAuthenticated && pendingOrder && (
                <>
                    {!isDriveTab && !isNavigationScreen && (
                        <Pressable
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 299 }}
                            onPress={() => !accepting && handleSkipOrder()}
                        />
                    )}
                    <OrderAcceptSheet
                        order={pendingOrder}
                        onAccept={handleAcceptOrder}
                        onAcceptAndNavigate={handleAcceptAndNavigate}
                        onSkip={handleSkipOrder}
                        accepting={accepting}
                        autoCountdown={autoCountdown}
                        takenByOther={takenByOther}
                    />
                </>
            )}

            {/* PTT floating button */}
            {isAuthenticated && isOnline && (
                <View style={{
                    position: 'absolute', right: 16, zIndex: 60,
                    ...(isDriveTab
                        ? { top: driveFloatingTopBase }
                        : { bottom: 120 }),
                    alignItems: 'flex-end', gap: 4,
                }}>
                    {isTalking && (
                        <View style={{ backgroundColor: 'rgba(239,68,68,0.9)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>🔴 Live</Text>
                        </View>
                    )}
                    {!!pttError && !isTalking && (
                        <View style={{ backgroundColor: 'rgba(127,29,29,0.9)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 140 }}>
                            <Text style={{ color: '#fca5a5', fontSize: 9, fontWeight: '600' }} numberOfLines={2}>{pttError}</Text>
                        </View>
                    )}
                    <Pressable
                        onPressIn={startTalking}
                        onPressOut={stopTalking}
                        style={{
                            backgroundColor: isTalking ? '#dc2626' : '#0b1120',
                            borderRadius: 18, width: 58, height: 58,
                            alignItems: 'center', justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: isTalking ? 'rgba(248,113,113,0.5)' : 'rgba(139,92,246,0.25)',
                            shadowColor: isTalking ? '#ef4444' : '#8b5cf6',
                            shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 12,
                        }}
                    >
                        <Ionicons name="mic" size={24} color={isTalking ? 'white' : '#a78bfa'} />
                    </Pressable>
                </View>
            )}

            {/* Pool FAB */}
            {showPoolFab && (
                <Pressable
                    onPress={() => setPoolOpen(true)}
                    style={{
                        position: 'absolute', right: 16, zIndex: 60,
                        ...(isDriveTab
                            ? { top: driveFloatingTopBase + 70 }
                            : { bottom: 100 }),
                        backgroundColor: '#0b1120', borderRadius: 18, width: 58, height: 58,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 1, borderColor: 'rgba(34,211,238,0.25)',
                        shadowColor: '#22d3ee', shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.25, shadowRadius: 12, elevation: 12,
                    }}
                >
                    <Ionicons name="layers" size={22} color="#22d3ee" />
                    <View style={{
                        position: 'absolute', top: -4, right: -4,
                        backgroundColor: '#f97316', borderRadius: 10,
                        minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
                        paddingHorizontal: 4, borderWidth: 2, borderColor: '#0b1120',
                    }}>
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>{poolOrders.length}</Text>
                    </View>
                </Pressable>
            )}

            {/* Order pool sheet */}
            {isAuthenticated && poolOpen && (
                <OrderPoolSheet
                    orders={poolOrders}
                    accepting={accepting}
                    onViewDetails={(order) => {
                        setPoolOpen(false);
                        useOrderAcceptStore.getState().setPendingOrder(order, false);
                    }}
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
