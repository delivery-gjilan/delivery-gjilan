import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapboxNavigationView } from '@badatgil/expo-mapbox-navigation';
import { useQuery, useSubscription } from '@apollo/client/react';
import { GET_ORDERS, ALL_ORDERS_UPDATED } from '@/graphql/operations/orders';
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

const STATUS_ICONS: Record<string, string> = {
    PENDING: 'time-outline',
    PREPARING: 'restaurant-outline',
    READY: 'bag-check-outline',
    OUT_FOR_DELIVERY: 'bicycle-outline',
};

export default function NavigationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const lastProgressRef = useRef(0);
    const currentDriverId = useAuthStore((state) => state.user?.id);
    const mapViewRef = useRef<any>(null);

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
        onData: () => { refetch(); },
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

    /* ── Cleanup: clear navigation location on unmount ── */
    useEffect(() => {
        return () => {
            clearNavigationLocation();
        };
    }, [clearNavigationLocation]);

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
            // With sequential navigation, waypoint arrival = arrived at pickup
            if (phase === 'to_pickup' && order?.dropoff) {
                Alert.alert(
                    'Arrived at Pickup',
                    `You've arrived at ${order.businessName}. Navigate to the drop-off?`,
                    [
                        {
                            text: 'End Navigation',
                            style: 'cancel',
                            onPress: () => {
                                clearNavigationLocation(); // Stop providing location to heartbeat
                                stopNavigation();
                                router.back();
                            },
                        },
                        {
                            text: 'Navigate to Drop-off',
                            style: 'default',
                            onPress: () => advanceToDropoff(),
                        },
                    ],
                );
            }
        },
        [phase, order, clearNavigationLocation, advanceToDropoff, stopNavigation, router],
    );

    const handleFinalDestinationArrival = useCallback(() => {
        const label = phase === 'to_dropoff' ? 'drop-off' : 'destination';
        Alert.alert('Arrived!', `You've reached the ${label}.`, [
            {
                text: 'OK',
                onPress: () => {
                    clearNavigationLocation(); // Stop providing location to heartbeat
                    stopNavigation();
                    router.back();
                },
            },
        ]);
    }, [phase, clearNavigationLocation, stopNavigation, router]);

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

    /* ── Recenter map ── */
    const handleRecenter = useCallback(() => {
        mapViewRef.current?.recenterMap?.();
    }, []);

    /* ── Display values ── */
    const statusColor = order ? (STATUS_COLORS[order.status] ?? '#6B7280') : '#6B7280';
    const phaseLabel = phase === 'to_dropoff' ? '→ Drop-off' : '→ Pickup';
    const distanceText = distanceRemainingM != null
        ? distanceRemainingM >= 1000
            ? `${(distanceRemainingM / 1000).toFixed(1)} km`
            : `${Math.round(distanceRemainingM)} m`
        : null;
    const durationText = durationRemainingS != null
        ? `${Math.ceil(durationRemainingS / 60)} min`
        : null;

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
                mapStyle="mapbox://styles/mapbox/navigation-night-v1"
                disableAlternativeRoutes={true}
                onRouteProgressChanged={handleRouteProgressChanged}
                onCancelNavigation={handleCancelNavigation}
                onWaypointArrival={handleWaypointArrival}
                onFinalDestinationArrival={handleFinalDestinationArrival}
                onUserOffRoute={handleUserOffRoute}
                onRouteChanged={() => console.log('[Navigation] Route changed (re-routed)')}
                onRoutesLoaded={() => console.log('[Navigation] Routes loaded')}
            />

            {/* ═══ Custom floating bar (covers native controls) ═══ */}
            <View style={styles.floatingBar}>
                <View style={[styles.floatingBarInner, { backgroundColor: statusColor, paddingBottom: insets.bottom + 30 }]}>
                    <View style={styles.floatingBarLeft}>
                        <Text style={styles.floatingBizName} numberOfLines={1}>
                            {order.businessName}
                        </Text>
                        <Text style={styles.floatingPhase}>
                            {phaseLabel}
                            {phase === 'to_dropoff' ? ` · ${order.customerName}` : ''}
                        </Text>
                    </View>
                    {distanceText && (
                        <View style={styles.floatingBarRight}>
                            <Text style={styles.floatingEta}>{distanceText}</Text>
                            {durationText && <Text style={styles.floatingEtaSub}>{durationText}</Text>}
                        </View>
                    )}
                    {/* Exit button */}
                    <Pressable
                        style={[styles.controlBtn, styles.controlBtnExit]}
                        onPress={handleCancelNavigation}
                        hitSlop={8}
                    >
                        <Ionicons name="close" size={20} color="#fff" />
                    </Pressable>
                </View>
            </View>

            {/* ═══ Right-side buttons (recenter) ═══ */}
            <View style={[styles.rightButtons, { bottom: 180 + insets.bottom }]}>
                <Pressable
                    style={styles.mapBtn}
                    onPress={handleRecenter}
                >
                    <Ionicons name="locate" size={22} color="#4285F4" />
                </Pressable>
            </View>

            {/* ═══ Discord-style order avatars (right side) ═══ */}
            {assignedOrders.length > 1 && (
                <View style={[styles.avatarSidebar, { bottom: 240 + insets.bottom }]}>
                    {assignedOrders.map((o: any) => {
                        const statusColor = STATUS_COLORS[o.status] ?? '#6B7280';
                        const isFocused = o.id === order?.id;
                        const iconName = STATUS_ICONS[o.status] ?? 'ellipse-outline';
                        const bizName = o.businesses?.[0]?.business?.name ?? '?';
                        const initial = bizName.charAt(0).toUpperCase();

                        return (
                            <Pressable
                                key={o.id}
                                onPress={() => switchToOrder(o)}
                                style={[
                                    styles.avatarBtn,
                                    {
                                        backgroundColor: statusColor,
                                        borderColor: isFocused ? '#fff' : 'transparent',
                                        borderWidth: isFocused ? 2.5 : 0,
                                        transform: [{ scale: isFocused ? 1.15 : 1 }],
                                    },
                                ]}
                            >
                                <Text style={styles.avatarInitial}>{initial}</Text>
                                <View style={styles.avatarStatusBadge}>
                                    <Ionicons name={iconName as any} size={10} color={statusColor} />
                                </View>
                            </Pressable>
                        );
                    })}
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

    /* ── Floating bar (covers native controls) ── */
    floatingBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 0,
        margin: 0,
        zIndex: 100,
    },
    floatingBarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        paddingTop: 30,
        borderRadius: 0,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    floatingBarLeft: {
        flex: 1,
    },
    floatingBizName: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    floatingPhase: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    floatingBarRight: {
        alignItems: 'flex-end',
        marginRight: 4,
    },
    floatingEta: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    floatingEtaSub: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '600',
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

    /* ── Discord-style avatar sidebar ── */
    avatarSidebar: {
        position: 'absolute',
        right: 12,
        alignItems: 'center',
        gap: 10,
        zIndex: 50,
    },
    avatarBtn: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 5,
    },
    avatarInitial: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
    },
    avatarStatusBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
});
