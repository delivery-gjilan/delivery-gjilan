import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapboxNavigationView } from '@badatgil/expo-mapbox-navigation';
import { useApolloClient, useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { GET_ORDERS, ALL_ORDERS_UPDATED, UPDATE_ORDER_STATUS, DRIVER_NOTIFY_CUSTOMER } from '@/graphql/operations/orders';
import { useNavigationStore } from '@/store/navigationStore';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { useAuthStore } from '@/store/authStore';
import { useNavigationLocationStore } from '@/store/navigationLocationStore';
import type { NavigationPhase } from '@/store/navigationStore';

/* ─── Constants ─── */
const STATUS_COLORS: Record<string, string> = {
    PENDING: '#F59E0B',
    PREPARING: '#06B6D4',
    READY: '#3B82F6',
    OUT_FOR_DELIVERY: '#8B5CF6',
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    PREPARING: 'Preparing',
    READY: 'Ready',
    OUT_FOR_DELIVERY: 'Delivering',
};

export default function NavigationScreen() {
    const apolloClient = useApolloClient();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const lastProgressRef = useRef(0);
    const currentDriverId = useAuthStore((state) => state.user?.id);
    const mapViewRef = useRef<any>(null);

    const [showPickupPanel, setShowPickupPanel] = useState(false);
    const [showDeliveryPanel, setShowDeliveryPanel] = useState(false);
    const [newOrderToast, setNewOrderToast] = useState<{ id: string; businessName: string } | null>(null);
    const prevOrderIdsRef = useRef<Set<string>>(new Set());
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Tracks which order IDs have already had ETA_LT_3_MIN fired this session.
    // Backend Redis dedup is the authoritative gate; this ref just avoids firing
    // the mutation on every 2 s progress tick once below the threshold.
    const etaNotificationSentRef = useRef<Set<string>>(new Set());
    const [markingPickedUpIds, setMarkingPickedUpIds] = useState<Set<string>>(new Set());
    const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS);
    const [driverNotifyCustomer] = useMutation(DRIVER_NOTIFY_CUSTOMER);

    /* ── Store ── */
    const {
        order,
        phase,
        destination,
        originLocation,
        distanceRemainingM,
        durationRemainingS,
        advanceToDropoff,
        stopNavigation,
        updateProgress,
        startNavigation,
    } = useNavigationStore();

    /* ── Orders query + real-time subscription ── */
    const { data, refetch } = useQuery(GET_ORDERS, {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    useSubscription(ALL_ORDERS_UPDATED, {
        onData: ({ data }) => {
            const incomingOrders = data.data?.allOrdersUpdated as any[] | undefined;
            if (!incomingOrders || incomingOrders.length === 0) {
                refetch();
                return;
            }

            apolloClient.cache.updateQuery({ query: GET_ORDERS }, (existing: any) => {
                const currentOrders = Array.isArray(existing?.orders) ? existing.orders : [];
                const byId = new Map(currentOrders.map((order: any) => [String(order?.id), order]));

                incomingOrders.forEach((order: any) => {
                    const existingOrder = byId.get(String(order?.id));
                    byId.set(String(order?.id), { ...existingOrder, ...order });
                });

                return {
                    ...(existing ?? {}),
                    orders: Array.from(byId.values()),
                };
            });
        },
    });

    /* ── Filter assigned orders ── */
    const assignedOrders = useMemo(() => {
        const orders = (data as any)?.orders ?? [];
        return orders.filter((o: any) => {
            if (o.status === 'DELIVERED' || o.status === 'CANCELLED') return false;
            return o.driver?.id === currentDriverId;
        });
    }, [data, currentDriverId]);

    /* ── Driver location (for live updates during navigation) ── */
    const { location } = useDriverLocation({
        smoothing: false,
        timeInterval: 2000,
        distanceFilter: 10,
    });

    /* ── Build coordinates for MapboxNavigationView ── */
    // Use stored origin initially, then switch to live GPS updates
    const currentOrigin = location || originLocation;
    const coordinates = useMemo(() => {
        if (!currentOrigin || !destination) return null;
        return [
            { latitude: currentOrigin.latitude, longitude: currentOrigin.longitude },
            { latitude: destination.latitude, longitude: destination.longitude },
        ];
    }, [currentOrigin?.latitude, currentOrigin?.longitude, destination?.latitude, destination?.longitude]);

    /* ── Store for feeding Navigation SDK location to heartbeat ── */
    const setNavigationLocation = useNavigationLocationStore((state) => state.setLocation);
    const clearNavigationLocation = useNavigationLocationStore((state) => state.clearLocation);

    /* ── Cleanup: clear navigation location and toast timer on unmount ── */
    useEffect(() => {
        return () => {
            clearNavigationLocation();
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, [clearNavigationLocation]);

    /* ── Detect newly assigned orders and show toast ── */
    useEffect(() => {
        const currentIds = new Set(assignedOrders.map((o: any) => String(o.id)));
        if (prevOrderIdsRef.current.size > 0) {
            const newOrders = assignedOrders.filter((o: any) => !prevOrderIdsRef.current.has(String(o.id)));
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

    /* ── Auto-notify customer when driver is < 3 min away (to_dropoff only) ── */
    useEffect(() => {
        if (
            phase !== 'to_dropoff' ||
            durationRemainingS == null ||
            durationRemainingS > 180 ||
            !order?.id
        ) return;

        if (etaNotificationSentRef.current.has(order.id)) return;
        etaNotificationSentRef.current.add(order.id);

        driverNotifyCustomer({ variables: { orderId: order.id, kind: 'ETA_LT_3_MIN' } })
            .catch(() => { /* best-effort — backend will retry on next heartbeat window */ });
    }, [durationRemainingS, phase, order?.id, driverNotifyCustomer]);

    /* ── Callbacks ── */
    const handleRouteProgressChanged = useCallback(
        (event: any) => {
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
        clearNavigationLocation(); // Stop providing location to heartbeat
        stopNavigation();
        router.back();
    }, [clearNavigationLocation, stopNavigation, router]);

    const handleWaypointArrival = useCallback(
        (_event: any) => {
            if (phase === 'to_pickup' && order?.dropoff) {
                setShowPickupPanel(true);
            }
        },
        [phase, order],
    );

    const handleFinalDestinationArrival = useCallback(() => {
        setShowDeliveryPanel(true);
        // Notify customer that the driver has arrived and is waiting outside.
        // Backend deduplicates via Redis so this is safe to call unconditionally.
        if (order?.id) {
            driverNotifyCustomer({ variables: { orderId: order.id, kind: 'ARRIVED_WAITING' } })
                .catch(() => { /* best-effort */ });
        }
    }, [order?.id, driverNotifyCustomer]);

    const handleUserOffRoute = useCallback(() => {
        // SDK handles re-routing automatically — just log for analytics
        console.log('[Navigation] Driver went off route — SDK is re-routing');
    }, []);

    /* ── Switch to different order ── */
    const switchToOrder = useCallback((newOrder: any) => {
        if (!currentOrigin) return;
        
        const bizLoc = newOrder.businesses?.[0]?.business?.location;
        const dropLoc = newOrder.dropOffLocation;
        if (!bizLoc) return;

        const pickup = {
            latitude: Number(bizLoc.latitude),
            longitude: Number(bizLoc.longitude),
            label: newOrder.businesses?.[0]?.business?.name ?? 'Pickup',
        };
        const dropoff = dropLoc
            ? {
                latitude: Number(dropLoc.latitude),
                longitude: Number(dropLoc.longitude),
                label: dropLoc.address ?? 'Drop-off',
            }
            : null;
        const customerName = newOrder.user
            ? `${newOrder.user.firstName} ${newOrder.user.lastName}`
            : 'Customer';

        const navOrder = {
            id: newOrder.id,
            status: newOrder.status,
            businessName: newOrder.businesses?.[0]?.business?.name ?? 'Business',
            customerName,
            pickup,
            dropoff,
        };

        const newPhase: NavigationPhase =
            newOrder.status === 'OUT_FOR_DELIVERY' ? 'to_dropoff' : 'to_pickup';

        const origin = { latitude: currentOrigin.latitude, longitude: currentOrigin.longitude };
        startNavigation(navOrder, newPhase, origin);
    }, [currentOrigin, startNavigation]);

    /* ── Mark order as picked up ── */
    const handleMarkPickedUp = useCallback(async (orderId: string) => {
        setMarkingPickedUpIds(prev => new Set(prev).add(orderId));
        try {
            await updateOrderStatus({ variables: { id: orderId, status: 'OUT_FOR_DELIVERY' } });
        } catch { /* ignore */ } finally {
            setMarkingPickedUpIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
        }
    }, [updateOrderStatus]);

    /* ── Recenter map ── */
    const handleRecenter = useCallback(() => {
        mapViewRef.current?.recenterMap?.();
    }, []);

    /* ── Guard: if no destination or location yet, show loading state ── */
    if (!coordinates || !order || !destination) {
        return (
            <View style={[styles.container, { backgroundColor: '#000' }]}>
                <View style={styles.loadingCenter}>
                    <Text style={styles.loadingText}>
                        {!currentOrigin ? 'Waiting for GPS...' : 'Loading navigation...'}
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
            {/* ═══ Full-screen Mapbox Navigation ═══ */}
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

            {/* ═══ Back button ═══ */}
            <Pressable
                style={[styles.backBtn, { top: insets.top + 8 }]}
                onPress={handleCancelNavigation}
                hitSlop={12}
            >
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>

            {/* ═══ Right-side buttons (recenter) ═══ */}
            <View style={[styles.rightButtons, { bottom: 180 + insets.bottom }]}>
                <Pressable
                    style={styles.mapBtn}
                    onPress={handleRecenter}
                >
                    <Ionicons name="locate" size={22} color="#4285F4" />
                </Pressable>
            </View>

            {/* ═══ New order assigned toast ═══ */}
            {newOrderToast && (
                <View style={[styles.newOrderToast, { top: insets.top + 12 }]}>
                    <Ionicons name="bag-add-outline" size={18} color="#fff" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.newOrderToastTitle}>New order assigned</Text>
                        <Text style={styles.newOrderToastSub} numberOfLines={1}>
                            {newOrderToast.businessName}
                        </Text>
                    </View>
                    <Pressable onPress={() => setNewOrderToast(null)} hitSlop={8}>
                        <Ionicons name="close" size={18} color="rgba(255,255,255,0.65)" />
                    </Pressable>
                </View>
            )}

            {/* ═══ Order cards bar (bottom) ═══ */}
            {assignedOrders.length >= 1 && (
                <View style={[styles.bottomBar, { bottom: insets.bottom + 8 }]}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.barContent}
                    >
                        {assignedOrders.map((o: any) => {
                            const statusColor = STATUS_COLORS[o.status] ?? '#6B7280';
                            const isFocused = o.id === order?.id;
                            const bizName = o.businesses?.[0]?.business?.name ?? '?';
                            const initial = bizName.charAt(0).toUpperCase();
                            const earnings = Number(o.deliveryPrice ?? 0).toFixed(2);
                            const dropAddress = o.dropOffLocation?.address ?? '';
                            const shortDrop = dropAddress.split(',')[0] || '';
                            const isReady = o.status === 'READY';
                            const isPickingUp = markingPickedUpIds.has(o.id);

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
                                                {STATUS_LABELS[o.status] ?? o.status}
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
                                                        ? <ActivityIndicator size={10} color="#fff" />
                                                        : <Ionicons name="checkmark-outline" size={13} color="#fff" />
                                                    }
                                                </Pressable>
                                            )}
                                        </View>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* ═══ Pickup arrival panel ═══ */}
            {showPickupPanel && (
                <View style={[styles.arrivalPanel, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.arrivalPanelHandle} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <View style={styles.arrivalIconRing}>
                            <Ionicons name="bag-check-outline" size={22} color="#3b82f6" />
                        </View>
                        <View>
                            <Text style={styles.arrivalTitle}>Arrived at Pickup</Text>
                            <Text style={styles.arrivalSub}>{order?.businessName}</Text>
                        </View>
                    </View>
                    <Pressable
                        style={[styles.arrivalCTA, { backgroundColor: '#3b82f6' }]}
                        onPress={async () => {
                            try {
                                await updateOrderStatus({ variables: { id: order?.id, status: 'OUT_FOR_DELIVERY' } });
                            } catch { /* order status may already be updated */ }
                            setShowPickupPanel(false);
                            advanceToDropoff();
                        }}
                    >
                        <Ionicons name="bicycle-outline" size={18} color="#fff" />
                        <Text style={styles.arrivalCTAText}>Picked Up — Navigate to Dropoff</Text>
                    </Pressable>
                    <Pressable
                        style={styles.arrivalSecondary}
                        onPress={() => {
                            setShowPickupPanel(false);
                            clearNavigationLocation();
                            stopNavigation();
                            router.back();
                        }}
                    >
                        <Text style={styles.arrivalSecondaryText}>End Navigation</Text>
                    </Pressable>
                </View>
            )}

            {/* ═══ Delivery arrival panel ═══ */}
            {showDeliveryPanel && (
                <View style={[styles.arrivalPanel, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.arrivalPanelHandle} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <View style={[styles.arrivalIconRing, { backgroundColor: '#22c55e20' }]}>
                            <Ionicons name="checkmark-circle-outline" size={22} color="#22c55e" />
                        </View>
                        <View>
                            <Text style={styles.arrivalTitle}>Arrived at Dropoff</Text>
                            <Text style={styles.arrivalSub}>{order?.customerName}</Text>
                        </View>
                    </View>
                    <Pressable
                        style={[styles.arrivalCTA, { backgroundColor: '#22c55e' }]}
                        onPress={async () => {
                            try {
                                await updateOrderStatus({ variables: { id: order?.id, status: 'DELIVERED' } });
                                await driverNotifyCustomer({ variables: { orderId: order?.id, event: 'DELIVERED' } });
                            } catch { /* navigate home regardless */ }
                            setShowDeliveryPanel(false);
                            clearNavigationLocation();
                            stopNavigation();
                            router.back();
                        }}
                    >
                        <Ionicons name="checkmark" size={18} color="#fff" />
                        <Text style={styles.arrivalCTAText}>Confirm Delivery</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    navView: {
        flex: 1,
    },

    /* ── Loading state ── */
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

    /* ── Back button ── */
    backBtn: {
        position: 'absolute',
        left: 16,
        zIndex: 100,
        padding: 8,
    },

    /* ── Cancel button (loading state) ── */
    cancelBtn: {
        position: 'absolute',
        left: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* ── Control buttons ── */
    controlBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlBtnExit: {
        backgroundColor: 'rgba(239,68,68,0.7)',
    },

    /* ── Right-side buttons ── */
    rightButtons: {
        position: 'absolute',
        right: 16,
        alignItems: 'center',
        gap: 10,
        zIndex: 50,
    },
    mapBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 5,
    },

    /* ── Order cards bar ── */
    bottomBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 50,
    },
    barContent: {
        paddingHorizontal: 12,
        gap: 10,
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    barCard: {
        width: 215,
        borderRadius: 14,
        backgroundColor: 'rgba(10,12,24,0.88)',
        borderLeftWidth: 3,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.09)',
        padding: 10,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
        elevation: 12,
    },
    barCardFocused: {
        backgroundColor: 'rgba(30,27,75,0.92)',
        borderColor: 'rgba(139,92,246,0.4)',
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
        color: '#64748b',
    },
    barEarnings: {
        backgroundColor: 'rgba(5, 46, 22, 0.9)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        flexShrink: 0,
    },
    barEarningsText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#22c55e',
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
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    barPickupBtn: {
        backgroundColor: '#16a34a',
    },

    /* ── Arrival panels ── */
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

    /* ── New order assigned toast ── */
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
});
