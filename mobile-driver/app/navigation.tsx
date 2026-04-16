import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Animated, Alert, ScrollView, Linking } from 'react-native';
import { PickupSlider } from '@/components/PickupSlider';
import { DeliverySlider } from '@/components/DeliverySlider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapboxNavigationView } from '@badatgil/expo-mapbox-navigation';
import { useApolloClient, useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { GET_ORDERS, UPDATE_ORDER_STATUS, DRIVER_NOTIFY_CUSTOMER, ORDER_STATUS_UPDATED } from '@/graphql/operations/orders';
import { buildNavOrder, orderToPhase } from '@/utils/orderToNavOrder';
import { GET_MY_DRIVER_METRICS } from '@/graphql/operations/driver';
import { useNavigationStore } from '@/store/navigationStore';
import { useAuthStore } from '@/store/authStore';
import { useNavigationLocationStore } from '@/store/navigationLocationStore';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import DriverMessageBanner from '@/components/DriverMessageBanner';
import type { AlertType } from '@/components/DriverMessageBanner';
import { DRIVER_MESSAGE_RECEIVED_SUB } from '@/graphql/operations/driverMessages';
import { useTranslations } from '@/hooks/useTranslations';
import type { DriverOrder } from '@/utils/types';
import { normalizeCoordinate } from '@/utils/locationValidation';
import * as Haptics from 'expo-haptics';
import { NavigationOrderCard } from '@/components/NavigationOrderCard';

/* â”€â”€â”€ Screen constants â”€â”€â”€ */
const STATUS_COLORS: Record<string, string> = {
    PENDING: '#F59E0B',
    PREPARING: '#F97316',
    READY: '#3B82F6',
    OUT_FOR_DELIVERY: '#22C55E',
};

export default function NavigationScreen() {
    const { t } = useTranslations();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const lastProgressRef = useRef(0);
    const currentDriverId = useAuthStore((state) => state.user?.id);
    const mapViewRef = useRef<any>(null);
    const mapDimOpacity      = useRef(new Animated.Value(0)).current;
    const successCardOpacity = useRef(new Animated.Value(0)).current;
    const successCardY       = useRef(new Animated.Value(320)).current;  // spring-in only
    const successCardHoverY  = useRef(new Animated.Value(0)).current;    // hover loop only
    const successCardYTotal  = useRef(Animated.add(successCardY, successCardHoverY)).current;
    const successCardScale   = useRef(new Animated.Value(0.72)).current;
    const successCardStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const confettiTimerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
    const successAnimationActiveRef = useRef(false);
    const confettiData = useRef(
        Array.from({ length: 60 }, (_, i) => ({
            anim:     new Animated.Value(0),
            x:        (Math.random() - 0.5) * 520,
            vy:       Math.random() * 480 + 180,
            color:    (['#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#a855f7', '#f97316', '#06b6d4', '#eab308', '#ef4444'] as const)[i % 9],
            size:     Math.random() * 11 + 6,
            rotation: Math.random() * 900 - 450,
            // alternate between rectangles and squares for visual variety
            aspect:   Math.random() > 0.5 ? 0.44 : 0.9,
        }))
    ).current;
    const [showSuccessCard, setShowSuccessCard] = useState(false);
    const [successCardPrice, setSuccessCardPrice] = useState(0);

    const [showPickupPanel, setShowPickupPanel] = useState(false);
    const [showDeliveryPanel, setShowDeliveryPanel] = useState(false);
    const [showNearEndBar, setShowNearEndBar] = useState(false);
    const [notifManualSent, setNotifManualSent] = useState(false);
    const [arrivedNotifSent, setArrivedNotifSent] = useState(false);
    const [arrivedAt, setArrivedAt] = useState<number>(0);
    const [notifiedAt, setNotifiedAt] = useState<number | null>(null);
    const [newOrderToast, setNewOrderToast] = useState<{ id: string; businessName: string } | null>(null);
    const [navIncomingMessage, setNavIncomingMessage] = useState<{ id: string; body: string; alertType: AlertType; adminId: string } | null>(null);

    useSubscription(DRIVER_MESSAGE_RECEIVED_SUB, {
        onData: ({ data: subData }) => {
            const msg = subData.data?.driverMessageReceived;
            if (!msg || msg.senderRole !== 'ADMIN') return;
            setNavIncomingMessage({ id: msg.id, body: msg.body, alertType: msg.alertType as AlertType, adminId: msg.adminId });
        },
    });
    const prevOrderIdsRef = useRef<Set<string>>(new Set());
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Tracks which order IDs have already had ETA_LT_3_MIN fired this session.
    // Backend Redis dedup is the authoritative gate; this ref just avoids firing
    // the mutation on every 2 s progress tick once below the threshold.
    const etaNotificationSentRef = useRef<Set<string>>(new Set());
    const [markingPickedUpIds, setMarkingPickedUpIds] = useState<Set<string>>(new Set());
    const [nowTs, setNowTs] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNowTs(Date.now()), 10_000);
        return () => clearInterval(id);
    }, []);
    const apolloClient = useApolloClient();
    const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS);
    const [driverNotifyCustomer] = useMutation(DRIVER_NOTIFY_CUSTOMER);

    const resetSuccessAnimation = useCallback(() => {
        successAnimationActiveRef.current = false;
        if (successCardStartTimerRef.current) {
            clearTimeout(successCardStartTimerRef.current);
            successCardStartTimerRef.current = null;
        }
        confettiTimerRefs.current.forEach(clearTimeout);
        confettiTimerRefs.current = [];
        mapDimOpacity.stopAnimation();
        successCardOpacity.stopAnimation();
        successCardY.stopAnimation();
        successCardHoverY.stopAnimation();
        successCardScale.stopAnimation();
        confettiData.forEach((particle) => particle.anim.stopAnimation());
        setShowSuccessCard(false);
        mapDimOpacity.setValue(0);
        successCardOpacity.setValue(0);
        successCardY.setValue(320);
        successCardHoverY.setValue(0);
        successCardScale.setValue(0.72);
    }, [confettiData, mapDimOpacity, successCardOpacity, successCardScale, successCardHoverY, successCardY]);

    /* â”€â”€ Store â”€â”€ */
    const {
        order,
        phase,
        destination,
        originLocation,
        distanceRemainingM,
        durationRemainingS,
        advanceToDropoff,
        minimizeNavigation,
        stopNavigation,
        updateProgress,
        startNavigation,
        isNavigating,
    } = useNavigationStore();
    const isOnline = useAuthStore((state) => state.isOnline);
    const { dispatchModeEnabled } = useStoreStatus();

    /* â”€â”€ Driver metrics â”€â”€ */
    const { data: metricsData } = useQuery(GET_MY_DRIVER_METRICS, {
        fetchPolicy: 'cache-and-network',
        pollInterval: 60_000,
    });
    const commissionPct = Number(metricsData?.myDriverMetrics?.commissionPercentage ?? 0);
    const getDriverTakeHome = useCallback((driverOrder: DriverOrder | null | undefined) => {
        if (!driverOrder) return 0;
        if (driverOrder.driverTakeHomePreview != null) return Number(driverOrder.driverTakeHomePreview);

        const deliveryFeeAmount = Number(driverOrder.deliveryPrice ?? 0);
        const commissionAmount = deliveryFeeAmount * (Math.max(0, commissionPct) / 100);
        return Math.max(0, deliveryFeeAmount - commissionAmount);
    }, [commissionPct]);

    /* â”€â”€ Orders query â€” updated via subscription; initial load via query â”€â”€ */
    const { data } = useQuery(GET_ORDERS, {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    useSubscription(ORDER_STATUS_UPDATED, {
        skip: !order?.id,
        variables: { orderId: order?.id },
        onData: ({ data: subData }) => {
            const updatedOrder = subData.data?.orderStatusUpdated;
            if (!updatedOrder?.id) return;

            apolloClient.cache.updateQuery({ query: GET_ORDERS }, (existing) => {
                const prev = existing?.orders?.orders;
                if (!Array.isArray(prev)) return existing;

                if (updatedOrder.status === 'DELIVERED' || updatedOrder.status === 'CANCELLED') {
                    return { ...existing, orders: { ...existing.orders, orders: prev.filter((o) => o.id !== updatedOrder.id) } };
                }

                return {
                    ...existing,
                    orders: { ...existing.orders, orders: prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o)) },
                };
            });

            const wasReassigned = updatedOrder.driver?.id && updatedOrder.driver.id !== currentDriverId;
            const isClosed = updatedOrder.status === 'DELIVERED' || updatedOrder.status === 'CANCELLED';
            if (isClosed || wasReassigned) {
                resetSuccessAnimation();
                setShowDeliveryPanel(false);
                setShowPickupPanel(false);
                clearNavigationLocation();
                stopNavigation();
                router.replace('/(tabs)/drive' as any);
            }
        },
    });

    /* â”€â”€ Filter assigned orders â”€â”€ */
    const assignedOrders = useMemo(() => {
        const orders = data?.orders?.orders ?? [];
        return orders.filter((o) => {
            if (o.status === 'DELIVERED' || o.status === 'CANCELLED') return false;
            return o.driver?.id === currentDriverId;
        });
    }, [data, currentDriverId]);

    /* â”€â”€ Guard: if the active order was externally completed/cancelled (admin), exit navigation â”€â”€ */
    useEffect(() => {
        const orders = data?.orders?.orders;
        if (!orders) return; // query not yet resolved
        if (!order) return;
        const liveOrder = orders.find((o) => o.id === order.id);
        if (!liveOrder || liveOrder.status === 'DELIVERED' || liveOrder.status === 'CANCELLED') {
            resetSuccessAnimation();
            stopNavigation();
            router.replace('/(tabs)/drive' as any);
        }
    }, [data, order?.id, resetSuccessAnimation, stopNavigation, router]);

    /* â”€â”€ Build coordinates for MapboxNavigationView â”€â”€ */
    // Use the stored origin only â€” the Navigation SDK tracks GPS internally.
    // Feeding live GPS updates into coordinates causes the SDK to restart routing.
    const currentOrigin = normalizeCoordinate(originLocation);
    const normalizedDestination = normalizeCoordinate(destination);
    const coordinates = useMemo(() => {
        if (!currentOrigin || !normalizedDestination) return null;
        return [
            { latitude: currentOrigin.latitude, longitude: currentOrigin.longitude },
            { latitude: normalizedDestination.latitude, longitude: normalizedDestination.longitude },
        ];
    }, [currentOrigin?.latitude, currentOrigin?.longitude, normalizedDestination?.latitude, normalizedDestination?.longitude]);

    /* ── Safety guard: clear invalid persisted or runtime navigation state before the native SDK mounts ── */
    const hasInvalidNavigationState = (!!originLocation && !currentOrigin) || (!!destination && !normalizedDestination);
    useEffect(() => {
        if (!hasInvalidNavigationState) return;
        stopNavigation();
        router.replace('/(tabs)/drive' as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasInvalidNavigationState]);

    /* â”€â”€ Store for feeding Navigation SDK location to heartbeat â”€â”€ */
    const setNavigationLocation = useNavigationLocationStore((state) => state.setLocation);
    const clearNavigationLocation = useNavigationLocationStore((state) => state.clearLocation);

    /* â”€â”€ Cleanup: clear navigation location and toast timer on unmount â”€â”€ */
    useEffect(() => {
        return () => {
            clearNavigationLocation();
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            resetSuccessAnimation();
        };
    }, [clearNavigationLocation, resetSuccessAnimation]);

    /* â”€â”€ Detect newly assigned orders and show toast â”€â”€ */
    useEffect(() => {
        const currentIds = new Set(assignedOrders.map((o) => String(o.id)));
        if (prevOrderIdsRef.current.size > 0) {
            const newOrders = assignedOrders.filter((o) => !prevOrderIdsRef.current.has(String(o.id)));
            if (newOrders.length > 0) {
                const newest = newOrders[0];
                const bizName = newest.businesses?.[0]?.business?.name ?? 'New order';
                setNewOrderToast({ id: newest.id, businessName: bizName });
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                toastTimerRef.current = setTimeout(() => setNewOrderToast(null), 6000);
            }
        }
        prevOrderIdsRef.current = currentIds;
    }, [assignedOrders]);

    /* â”€â”€ Reset near-end bar when order changes â”€â”€ */
    useEffect(() => {
        setShowNearEndBar(false);
        setNotifManualSent(false);
        setArrivedNotifSent(false);
        setArrivedAt(0);
        setNotifiedAt(null);
    }, [order?.id]);

    /* â”€â”€ Show near-end bar when < 5 min from dropoff â”€â”€ */
    useEffect(() => {
        if (
            phase === 'to_dropoff' &&
            durationRemainingS != null &&
            durationRemainingS <= 300 &&
            !showDeliveryPanel
        ) {
            setShowNearEndBar(true);
        }
    }, [durationRemainingS, phase, showDeliveryPanel]);

    /* â”€â”€ Detect when admin reassigns the active navigation order away â”€â”€ */
    const reassignedAlertShownRef = useRef(false);
    useEffect(() => {
        if (!order?.id || !isNavigating) return;
        const allOrders = data?.orders?.orders ?? [];
        const rawOrder = allOrders.find((o) => o.id === order.id);
        // If the order is DELIVERED or CANCELLED by us, don't show the alert â€”
        // the onConfirm / onCancel handlers already call stopNavigation and navigate away.
        if (!rawOrder) return; // not yet in cache â€” wait
        if (rawOrder.status === 'DELIVERED' || rawOrder.status === 'CANCELLED') return;
        // Only alert if the order was genuinely re-assigned to a different driver
        const reassignedAway = rawOrder.driver?.id && rawOrder.driver.id !== currentDriverId;
        if (reassignedAway && !reassignedAlertShownRef.current) {
            reassignedAlertShownRef.current = true;
            Alert.alert(
                t.navigation.order_reassigned,
                t.navigation.order_reassigned_msg,
                [{ text: t.common.ok, onPress: () => {
                    resetSuccessAnimation();
                    setShowDeliveryPanel(false);
                    setShowPickupPanel(false);
                    clearNavigationLocation();
                    stopNavigation();
                    router.back();
                }}],
                { cancelable: false },
            );
        }
    }, [data, order?.id, isNavigating, currentDriverId, clearNavigationLocation, resetSuccessAnimation, stopNavigation, router]);

    /* â”€â”€ Auto-notify customer when driver is < 3 min away (to_dropoff only) â”€â”€ */
    useEffect(() => {        if (
            phase !== 'to_dropoff' ||
            durationRemainingS == null ||
            durationRemainingS > 180 ||
            !order?.id
        ) return;

        if (etaNotificationSentRef.current.has(order.id)) return;
        etaNotificationSentRef.current.add(order.id);

        driverNotifyCustomer({ variables: { orderId: order.id, kind: 'ETA_LT_3_MIN' } })
            .catch(() => { /* best-effort â€” backend will retry on next heartbeat window */ });
    }, [durationRemainingS, phase, order?.id, driverNotifyCustomer]);

    /* â”€â”€ Callbacks â”€â”€ */
    const handleRouteProgressChanged = useCallback(
        (event: { nativeEvent?: { distanceRemaining?: number; durationRemaining?: number; fractionTraveled?: number; location?: { latitude: number; longitude: number } } }) => {
            const eventData = event?.nativeEvent ?? event ?? {};
            const { distanceRemaining, durationRemaining, fractionTraveled, location } = eventData;
            
            // Update navigation progress
            if (distanceRemaining != null) {
                updateProgress(distanceRemaining, durationRemaining ?? 0, fractionTraveled ?? 0);
            }

            // Feed location to heartbeat system (avoids duplicate GPS polling)
            if (location?.latitude != null && location?.longitude != null) {
                setNavigationLocation({
                    latitude: location.latitude,
                    longitude: location.longitude,
                });
            }
        },
        [updateProgress, setNavigationLocation],
    );

    const handleCancelNavigation = useCallback(() => {
        resetSuccessAnimation();
        clearNavigationLocation(); // Stop providing location to heartbeat
        stopNavigation();
        router.replace('/(tabs)/drive' as any);
    }, [clearNavigationLocation, resetSuccessAnimation, stopNavigation, router]);

    const handleWaypointArrival = useCallback(
        (_event: unknown) => {
            if (phase === 'to_pickup' && order?.dropoff) {
                setShowPickupPanel(true);
            }
        },
        [phase, order],
    );

    const handleFinalDestinationArrival = useCallback(() => {
        setShowDeliveryPanel(true);
        setArrivedAt(Date.now());
        // Notify customer that the driver has arrived and is waiting outside.
        // Backend deduplicates via Redis so this is safe to call unconditionally.
        if (order?.id) {
            driverNotifyCustomer({ variables: { orderId: order.id, kind: 'ARRIVED_WAITING' } })
                .catch(() => { /* best-effort */ });
        }
    }, [order?.id, driverNotifyCustomer]);

    const handleUserOffRoute = useCallback(() => {
        // SDK handles re-routing automatically â€” just log for analytics
        console.log('[Navigation] Driver went off route â€” SDK is re-routing');
    }, []);

    /* â”€â”€ Switch to different order â”€â”€ */
    const switchToOrder = useCallback((newOrder: DriverOrder) => {
        if (!currentOrigin) return;
        const navOrder = buildNavOrder(newOrder);
        if (!navOrder) return;
        const origin = { latitude: currentOrigin.latitude, longitude: currentOrigin.longitude };
        startNavigation(navOrder, orderToPhase(newOrder.status), origin);
    }, [currentOrigin, startNavigation]);

    /* â”€â”€ Mark order as picked up â”€â”€ */
    const handleMarkPickedUp = useCallback(async (orderId: string) => {
        setMarkingPickedUpIds(prev => new Set(prev).add(orderId));
        try {
            await updateOrderStatus({ variables: { id: orderId, status: 'OUT_FOR_DELIVERY' } });
        } catch {
            Alert.alert(t.common.error, t.navigation.status_update_failed);
        } finally {
            setMarkingPickedUpIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
        }
    }, [updateOrderStatus]);

    /* â”€â”€ Recenter map â”€â”€ */
    const handleRecenter = useCallback(() => {
        mapViewRef.current?.recenterMap?.();
    }, []);

    /* â”€â”€ Guard: if no destination or location yet, show loading state â”€â”€ */
    if (!coordinates || !order || !destination) {
        console.log('[Navigation] guard hit â€” coordinates:', !!coordinates, 'order:', !!order, 'destination:', !!destination, 'originLocation:', !!originLocation);
        return (
            <View style={[styles.container, { backgroundColor: '#000' }]}>
                <View style={styles.loadingCenter}>
                    <Text style={styles.loadingText}>
                        {!originLocation ? 'Waiting for GPS...' : !order ? 'No active order â€” go back' : 'Loading navigation...'}
                    </Text>
                </View>
                <Pressable
                    style={[styles.cancelBtn, { top: insets.top + 12 }]}
                    onPress={handleCancelNavigation}
                >
                    <Ionicons name="close" size={24} color="#fff" />
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Order details card (collapsible) */}
            {order && (
                <View style={[styles.orderCardContainer, { top: insets.top + 12 }]}>
                    <NavigationOrderCard
                        order={order}
                        isDirectDispatch={order.channel === 'DIRECT_DISPATCH'}
                        etaMins={durationRemainingS != null ? Math.ceil(durationRemainingS / 60) : null}
                        phase={phase}
                    />
                </View>
            )}

            {/* â•â•â• Full-screen Mapbox Navigation â•â•â• */}
            <MapboxNavigationView
                ref={mapViewRef}
                style={styles.navView}
                coordinates={coordinates}
                waypointIndices={[0, coordinates.length - 1]}
                routeProfile="driving-traffic"
                locale="en"
                mute={true}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                disableAlternativeRoutes={true}
                followingZoom={16}
                initialLocation={{
                    latitude: currentOrigin.latitude,
                    longitude: currentOrigin.longitude,
                    zoom: 15,
                }}
                onRouteProgressChanged={handleRouteProgressChanged}
                onCancelNavigation={handleCancelNavigation}
                onWaypointArrival={handleWaypointArrival}
                onFinalDestinationArrival={handleFinalDestinationArrival}
                onUserOffRoute={handleUserOffRoute}
                onRouteChanged={() => console.log('[Navigation] Route changed (re-routed)')}
                onRoutesLoaded={() => console.log('[Navigation] Routes loaded')}
            />

            {/* â•â•â• Back button â€” returns to map without stopping navigation â•â•â• */}
            <Pressable
                style={[styles.backBtn, { top: insets.top + 8 }]}
                onPress={() => {
                    resetSuccessAnimation();
                    minimizeNavigation();
                    router.replace('/(tabs)/drive' as any);
                }}
                hitSlop={12}
            >
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>

            {/* â•â•â• Right-side buttons (recenter) â•â•â• */}
            <View style={[styles.rightButtons, { bottom: 180 + insets.bottom }]}>
                <Pressable
                    style={styles.mapBtn}
                    onPress={handleRecenter}
                >
                    <Ionicons name="locate" size={22} color="#4285F4" />
                </Pressable>
                {/* DEV: mock arrival */}
                <Pressable
                    style={[styles.mapBtn, { borderWidth: 1, borderColor: '#f59e0b' }]}
                    onPress={handleFinalDestinationArrival}
                >
                    <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '800' }}>ARR</Text>
                </Pressable>
                {/* DEV: mock pickup arrival */}
                <Pressable
                    style={[styles.mapBtn, { borderWidth: 1, borderColor: '#3b82f6' }]}
                    onPress={handleWaypointArrival}
                >
                    <Text style={{ color: '#3b82f6', fontSize: 10, fontWeight: '800' }}>PKP</Text>
                </Pressable>
            </View>

            {/* â•â•â• Driver message banner â•â•â• */}
            {navIncomingMessage && (
                <DriverMessageBanner
                    key={navIncomingMessage.id}
                    senderName={t.navigation.dispatcher}
                    body={navIncomingMessage.body}
                    alertType={navIncomingMessage.alertType}
                    adminId={navIncomingMessage.adminId}
                    onDismiss={() => setNavIncomingMessage(null)}
                />
            )}

            {/* â•â•â• New order assigned toast â•â•â• */}
            {newOrderToast && (
                <View style={[styles.newOrderToast, { top: insets.top + 12 }]}>
                    <Ionicons name="bag-add-outline" size={18} color="#fff" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.newOrderToastTitle}>{t.navigation.new_order_assigned}</Text>
                        <Text style={styles.newOrderToastSub} numberOfLines={1}>
                            {newOrderToast.businessName}
                        </Text>
                    </View>
                    <Pressable onPress={() => setNewOrderToast(null)} hitSlop={8}>
                        <Ionicons name="close" size={18} color="rgba(255,255,255,0.65)" />
                    </Pressable>
                </View>
            )}

            {/* ETA and phase are shown in the top NavigationOrderCard to avoid overlay collisions */}

            {/* â•â•â• Order cards bar (bottom) â•â•â• */}
            {assignedOrders.length >= 1 && (
                <View style={[styles.bottomBar, { bottom: insets.bottom + 8 }]}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.barContent}
                        snapToInterval={250}
                        snapToAlignment="start"
                        decelerationRate="fast"
                    >
                        {assignedOrders.map((o) => {
                            const statusColor = STATUS_COLORS[o.status] ?? '#6B7280';
                            const isFocused = o.id === order?.id;
                            const bizName = o.businesses?.[0]?.business?.name ?? '?';
                            const initial = bizName.charAt(0).toUpperCase();
                            const earnings = getDriverTakeHome(o).toFixed(2);
                            const dropAddress = o.dropOffLocation?.address ?? '';
                            const shortDrop = dropAddress.split(',')[0] || '';
                            const isReady = o.status === 'READY';
                            const isPreparing = o.status === 'PREPARING';
                            const isPickingUp = markingPickedUpIds.has(o.id);
                            const prepMinsLeft = (() => {
                                if (!isPreparing || !o.estimatedReadyAt) return null;
                                const diff = Math.ceil((new Date(o.estimatedReadyAt).getTime() - nowTs) / 60000);
                                return diff > 0 ? diff : 0;
                            })();

                            return (
                                <Pressable
                                    key={o.id}
                                    style={[
                                        styles.barCard,
                                        { borderLeftColor: statusColor },
                                        isFocused && styles.barCardFocused,
                                    ]}
                                    onPress={() => switchToOrder(o)}
                                >
                                    {/* Row 1: avatar + name/address + earnings */}
                                    <View style={styles.barCardTop}>
                                        <View style={[styles.barAvatar, { backgroundColor: statusColor }]}>
                                            <Text style={styles.barAvatarText}>{initial}</Text>
                                        </View>
                                        <View style={styles.barCardInfo}>
                                            <Text style={styles.barBizName} numberOfLines={1}>{bizName}</Text>
                                            {shortDrop ? (
                                                <Text style={styles.barDropAddress} numberOfLines={1}>{shortDrop}</Text>
                                            ) : null}
                                        </View>
                                        <View style={styles.barEarnings}>
                                            <Text style={styles.barEarningsText}>€{earnings}</Text>
                                        </View>
                                    </View>

                                    {/* Row 2: status badge + action buttons */}
                                    <View style={styles.barCardBottom}>
                                        <View style={[styles.barStatusBadge, { backgroundColor: statusColor + '22' }]}>
                                            <View style={[styles.barStatusDot, { backgroundColor: statusColor }]} />
                                            <Text style={[styles.barStatusText, { color: statusColor }]}>
                                                {({ PENDING: t.map.status_pending, PREPARING: t.map.status_preparing, READY: t.map.status_ready, OUT_FOR_DELIVERY: t.map.status_delivering } as Record<string, string>)[o.status] ?? o.status}
                                            </Text>
                                        </View>
                                        <View style={styles.barActions}>
                                            {isReady && (
                                                <Pressable
                                                    style={[styles.barActionBtn, styles.barPickupBtn]}
                                                    onPress={() => handleMarkPickedUp(o.id)}
                                                    disabled={isPickingUp}
                                                >
                                                    {isPickingUp
                                                        ? <ActivityIndicator size={12} color="#fff" />
                                                        : <Ionicons name="checkmark-outline" size={16} color="#fff" />
                                                    }
                                                </Pressable>
                                            )}
                                        </View>
                                    </View>

                                    {/* Row 3: preparing countdown */}
                                    {isPreparing && (
                                        <View style={styles.prepRow}>
                                            <Ionicons name="restaurant-outline" size={11} color="#06b6d4" />
                                            <Text style={styles.prepText}>
                                                {prepMinsLeft === null
                                                    ? t.navigation.preparing_ellipsis
                                                    : prepMinsLeft === 0
                                                    ? t.navigation.almost_ready
                                                    : t.navigation.ready_in.replace('{{min}}', String(prepMinsLeft))}
                                            </Text>
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* â•â•â• Near-end action bar â•â•â• */}
            {showNearEndBar && !showPickupPanel && !showDeliveryPanel && (
                <View style={[styles.nearEndBar, { bottom: (assignedOrders.length > 1 ? 160 : 80) + insets.bottom }]}>
                    {/* Call customer */}
                    {!!order?.customerPhone && (
                        <Pressable
                            style={styles.nearEndBtn}
                            onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
                        >
                            <Ionicons name="call-outline" size={18} color="#22d3ee" />
                            <Text style={styles.nearEndBtnText}>{t.navigation.call_customer}</Text>
                        </Pressable>
                    )}
                </View>
            )}

            {/* â•â•â• Pickup arrival panel â•â•â• */}
            {showPickupPanel && (() => {
                // durationRemainingS is ~0 at waypoint arrival (we just arrived at pickup).
                // The dropoff ETA will come from the nav SDK once the next leg loads — pass null for now.
                // Look up live order data to get prep ETA
                const liveOrder = assignedOrders.find((o) => o.id === order?.id);
                const pickupPrepMins = (() => {
                    if (liveOrder?.status !== 'PREPARING' || !liveOrder?.estimatedReadyAt) return null;
                    const diff = Math.ceil((new Date(liveOrder.estimatedReadyAt).getTime() - nowTs) / 60_000);
                    return diff > 0 ? diff : 0;
                })();
                return (
                    <PickupSlider
                        businessName={order?.businessName ?? ''}
                        etaMins={null}
                        prepMinsLeft={pickupPrepMins}
                        disabled={liveOrder?.status === 'PREPARING'}
                        insetBottom={insets.bottom}
                        onConfirm={async () => {
                            try {
                                await updateOrderStatus({ variables: { id: order?.id, status: 'OUT_FOR_DELIVERY' } });
                            } catch {
                                Alert.alert(t.common.error, t.navigation.status_update_failed);
                            }
                            advanceToDropoff();
                            setShowPickupPanel(false);
                        }}
                        onCancel={() => {
                            setShowPickupPanel(false);
                            clearNavigationLocation();
                            stopNavigation();
                            router.replace('/(tabs)/drive' as any);
                        }}
                    />
                );
            })()}

            {/* â•â•â• Full-screen dim veil shown during delivery success animation â•â•â• */}
            {showDeliveryPanel && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        StyleSheet.absoluteFillObject,
                        {
                            backgroundColor: 'rgba(6, 9, 20, 0.82)',
                            opacity: mapDimOpacity,
                            zIndex: 105,
                        },
                    ]}
                />
            )}

            {/* â•â•â• Success card + confetti â•â•â• */}
            {showSuccessCard && (
                <View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFillObject, { zIndex: 115, alignItems: 'center', justifyContent: 'center' }]}
                >
                    {/* Confetti particles â€” explode from card centre */}
                    {confettiData.map((p, i) => {
                        const cY = p.anim.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, -p.vy, -(p.vy * 0.72)] });
                        const cX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] });
                        const cOpacity = p.anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] });
                        const cRotate  = p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rotation}deg`] });
                        return (
                            <Animated.View
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: p.size,
                                    height: p.size * p.aspect,
                                    backgroundColor: p.color,
                                    borderRadius: 2,
                                    opacity: cOpacity,
                                    transform: [{ translateX: cX }, { translateY: cY }, { rotate: cRotate }],
                                }}
                            />
                        );
                    })}

                    {/* The success card */}
                    <Animated.View
                        style={[
                            styles.successCard,
                            {
                                opacity: successCardOpacity,
                                transform: [{ translateY: successCardYTotal }, { scale: successCardScale }],
                            },
                        ]}
                    >
                        <View style={styles.successCardCircle}>
                            <Ionicons name="checkmark" size={52} color="#fff" />
                        </View>
                        <Text style={styles.successCardTitle}>{t.navigation.delivered}</Text>
                        <View style={styles.successCardBadge}>
                            <Ionicons name="cash" size={26} color="#78350f" />
                            <Text style={styles.successCardAmount}>+€{successCardPrice.toFixed(2)}</Text>
                            <Text style={styles.successCardLabel}>{t.navigation.delivery_earned}</Text>
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* â•â•â• Delivery arrival panel â•â•â• */}
            {showDeliveryPanel && (() => {
                const fo = assignedOrders.find((o) => o.id === order?.id);
                return (
                <DeliverySlider
                    customerName={order?.customerName ?? ''}
                    customerPhone={order?.customerPhone ?? null}
                    arrivedNotifSent={arrivedNotifSent}
                    arrivedAt={arrivedAt}
                    notifiedAt={notifiedAt}
                    customerPaymentAmount={
                        fo?.channel === 'DIRECT_DISPATCH'
                            ? Number(fo?.cashToCollect ?? 0)
                            : Number(fo?.totalPrice ?? 0)
                    }
                    insetBottom={insets.bottom}
                    onNotify={() => {
                        if (!order?.id || arrivedNotifSent) return;
                        setArrivedNotifSent(true);
                        setNotifiedAt(Date.now());
                        driverNotifyCustomer({ variables: { orderId: order.id, kind: 'ARRIVED_WAITING' } })
                            .catch(() => {});
                    }}
                    onPingAgain={() => {
                        if (!order?.id) return;
                        setNotifiedAt(Date.now());
                        driverNotifyCustomer({ variables: { orderId: order.id, kind: 'ARRIVED_WAITING' } })
                            .catch(() => {});
                    }}
                    onDismiss={() => setShowDeliveryPanel(false)}
                    onConfirm={async () => {
                        const deliveredId = order?.id;
                        try {
                            await updateOrderStatus({ variables: { id: deliveredId, status: 'DELIVERED' } });
                            driverNotifyCustomer({ variables: { orderId: deliveredId, kind: 'DELIVERED' } })
                                .catch(() => {});
                        } catch {
                            Alert.alert(t.common.error, t.navigation.status_update_failed);
                        }
                        // Eagerly remove the delivered order from Apollo cache so the
                        // drive tab doesn't wait for a subscription round-trip to clear it.
                        if (deliveredId) {
                            apolloClient.cache.updateQuery({ query: GET_ORDERS }, (existing) => {
                                const prev = existing?.orders?.orders;
                                if (!Array.isArray(prev)) return existing;
                                return { ...existing, orders: { ...existing.orders, orders: prev.filter((o) => o.id !== deliveredId) } };
                            });
                        }
                        resetSuccessAnimation();
                        setShowDeliveryPanel(false);
                        clearNavigationLocation();
                        stopNavigation();
                        // If there's another active order, switch to it instead of going back
                        const remaining = assignedOrders.filter((o) => o.id !== order?.id);
                        if (remaining.length > 0) {
                            switchToOrder(remaining[0]);
                        } else {
                            router.replace('/(tabs)/drive' as any);
                        }
                    }}
                    onSuccessAnimStart={() => {
                        resetSuccessAnimation();
                        successAnimationActiveRef.current = true;
                        // Dim the map behind everything
                        Animated.timing(mapDimOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();

                        // Spring the success card up from the panel area to screen centre
                        const fo2 = assignedOrders.find((o) => o.id === order?.id);
                        setSuccessCardPrice(getDriverTakeHome(fo2));
                        successCardStartTimerRef.current = setTimeout(() => {
                            if (!successAnimationActiveRef.current) return;
                            successCardY.setValue(320);
                            successCardHoverY.setValue(0);
                            successCardScale.setValue(0.72);
                            successCardOpacity.setValue(0);
                            setShowSuccessCard(true);
                            Animated.parallel([
                                Animated.timing(successCardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                                Animated.spring(successCardY,       { toValue: 0, tension: 46, friction: 8, useNativeDriver: true }),
                                Animated.spring(successCardScale,   { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
                            ]).start(() => {
                                // Hover loop on its own value â€” never touches successCardY so no reset flicker
                                Animated.loop(
                                    Animated.sequence([
                                        Animated.timing(successCardHoverY, { toValue: -14, duration: 700, useNativeDriver: true }),
                                        Animated.timing(successCardHoverY, { toValue: 0,   duration: 700, useNativeDriver: true }),
                                    ]),
                                ).start();
                            });
                            // Confetti burst (staggered, JS driver)
                            confettiData.forEach((p, i) => {
                                p.anim.setValue(0);
                                const confettiTimer = setTimeout(() => {
                                    if (!successAnimationActiveRef.current) return;
                                    Animated.timing(p.anim, { toValue: 1, duration: 1200 + i * 10, useNativeDriver: false }).start();
                                }, i * 18);
                                confettiTimerRefs.current.push(confettiTimer);
                            });
                            successCardStartTimerRef.current = null;
                        }, 280);
                    }}
                    onCancel={async (reason) => {
                        try {
                            await updateOrderStatus({ variables: { id: order?.id, status: 'CANCELLED' } });
                        } catch {
                            Alert.alert(t.common.error, t.navigation.status_update_failed);
                        }
                        resetSuccessAnimation();
                        setShowDeliveryPanel(false);
                        clearNavigationLocation();
                        stopNavigation();
                        // If there's another active order, switch to it instead of going back
                        const remaining = assignedOrders.filter((o) => o.id !== order?.id);
                        if (remaining.length > 0) {
                            switchToOrder(remaining[0]);
                        } else {
                            router.replace('/(tabs)/drive' as any);
                        }
                    }}
                />
                );
            })()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    orderCardContainer: {
        position: 'absolute',
        left: 12,
        right: 12,
        zIndex: 50,
        maxWidth: '100%',
    },
    navView: {
        flex: 1,
    },
    successCard: {
        backgroundColor: '#0f172a',
        borderRadius: 28,
        paddingHorizontal: 38,
        paddingVertical: 30,
        alignItems: 'center',
        gap: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.55,
        shadowRadius: 40,
        elevation: 30,
    },
    successCardCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#22c55e',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.55,
        shadowRadius: 20,
        elevation: 20,
    },
    successCardTitle: {
        color: '#f1f5f9',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    successCardBadge: {
        backgroundColor: '#f59e0b',
        borderRadius: 20,
        paddingHorizontal: 28,
        paddingVertical: 14,
        alignItems: 'center',
        gap: 3,
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.75,
        shadowRadius: 18,
        elevation: 18,
    },
    successCardAmount: {
        color: '#0c0a00',
        fontSize: 34,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    successCardLabel: {
        color: 'rgba(0,0,0,0.50)',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.9,
    },

    /* â”€â”€ Loading state â”€â”€ */
    loadingCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    /* â”€â”€ Near-end action bar â”€â”€ */
    nearEndBar: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        gap: 10,
        zIndex: 90,
    },
    nearEndBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: 'rgba(10,15,26,0.88)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 10,
    },
    nearEndBtnSent: {
        borderColor: 'rgba(34,197,94,0.3)',
        backgroundColor: 'rgba(34,197,94,0.08)',
    },
    nearEndBtnText: {
        color: '#f1f5f9',
        fontSize: 13,
        fontWeight: '700',
    },

    /* â”€â”€ Arrived notify button (inside delivery panel header) â”€â”€ */
    arrivedNotifBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    arrivedNotifBtnSent: {
        borderColor: 'rgba(34,197,94,0.3)',
        backgroundColor: 'rgba(34,197,94,0.08)',
    },
    arrivedNotifText: {
        color: '#f1f5f9',
        fontSize: 12,
        fontWeight: '700',
    },
    backBtn: {
        position: 'absolute',
        left: 16,
        zIndex: 100,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(15,23,42,0.86)',
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.32)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    rightButtons: {
        position: 'absolute',
        right: 16,
        alignItems: 'center',
        gap: 10,
        zIndex: 90,
    },
    mapBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(15,23,42,0.92)',
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 5,
    },

    bottomBar: {
        position: 'absolute',
        left: 12,
        right: 12,
        zIndex: 90,
    },
    barContent: {
        paddingRight: 8,
        gap: 8,
    },
    barCard: {
        width: 242,
        borderLeftWidth: 3,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.25)',
        backgroundColor: 'rgba(15,23,42,0.86)',
        padding: 10,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
        elevation: 12,
    },

    barCardFocused: {
        backgroundColor: 'rgba(15,52,96,0.9)',
        borderColor: 'rgba(0,157,224,0.45)',
    },
    barCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    barAvatar: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    barAvatarText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#fff',
    },
    barCardInfo: {
        flex: 1,
        gap: 2,
    },
    barBizName: {
        fontSize: 12,
        fontWeight: '700',
        color: '#e2e8f0',
    },
    barDropAddress: {
        fontSize: 10,
        color: '#94A3B8',
    },
    barEarnings: {
        backgroundColor: 'rgba(0,109,163,0.36)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        flexShrink: 0,
    },
    barEarningsText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#67e8f9',
    },
    barCardBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    barStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    barStatusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    barStatusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    barActions: {
        flexDirection: 'row',
        gap: 5,
    },
    barActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    barPickupBtn: {
        backgroundColor: '#16a34a',
    },

    prepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(6,182,212,0.1)',
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 4,
        alignSelf: 'flex-start',
    },
    prepText: {
        color: '#06b6d4',
        fontSize: 10,
        fontWeight: '700',
    },
    arrivalPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 18,
        zIndex: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.55,
        shadowRadius: 18,
        elevation: 28,
    },
    arrivalPanelHandle: {
        width: 36,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    arrivalIconRing: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#3b82f620',
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrivalTitle: {
        color: '#f1f5f9',
        fontSize: 18,
        fontWeight: '800',
    },
    arrivalSub: {
        color: '#64748b',
        fontSize: 13,
        marginTop: 2,
    },
    arrivalCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 17,
        borderRadius: 16,
        marginTop: 4,
    },
    arrivalCTAText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    arrivalSecondary: {
        alignItems: 'center',
        paddingVertical: 12,
        marginTop: 2,
    },
    arrivalSecondaryText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '600',
    },

    /* â”€â”€ New order assigned toast â”€â”€ */
    newOrderToast: {
        position: 'absolute',
        left: 16,
        right: 16,
        backgroundColor: '#1e293b',
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 10,
        zIndex: 150,
        borderLeftWidth: 3,
        borderLeftColor: '#6366f1',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 12,
    },
    newOrderToastTitle: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    newOrderToastSub: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 1,
    },

    /* â”€â”€ Earnings floating pill â”€â”€ */
    earningsPill: {
        position: 'absolute',
        right: 16,
        zIndex: 60,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(10,12,24,0.88)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.09)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 10,
    },
    earningsPillAmount: {
        color: '#22c55e',
        fontSize: 13,
        fontWeight: '800',
    },
    earningsPillDivider: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginHorizontal: 2,
    },
    earningsPillCount: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '700',
    },

    /* â”€â”€ ETA floating pill â”€â”€ */
    etaPill: {
        position: 'absolute',
        left: 16,
        zIndex: 60,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(10,12,24,0.88)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: 'rgba(56,189,248,0.25)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 10,
    },
    etaPillText: {
        color: '#38bdf8',
        fontSize: 13,
        fontWeight: '800',
    },
    etaPillLabel: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 11,
        fontWeight: '600',
    },
});
