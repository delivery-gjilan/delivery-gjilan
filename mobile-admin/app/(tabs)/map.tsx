import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useSubscription } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useTheme } from '@/hooks/useTheme';
import { GET_ORDERS, ALL_ORDERS_SUBSCRIPTION } from '@/graphql/orders';
import { GET_DRIVERS, DRIVERS_UPDATED_SUBSCRIPTION } from '@/graphql/drivers';
import { GJILAN_CENTER, GJILAN_BOUNDS, ORDER_STATUS_COLORS } from '@/utils/constants';
import { getInitials } from '@/utils/helpers';
import { calculateRouteDistance, toLatLng } from '@/utils/mapbox';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Constants ───
const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    PENDING: 'time-outline',
    PREPARING: 'restaurant-outline',
    READY: 'bag-check-outline',
    OUT_FOR_DELIVERY: 'bicycle-outline',
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    PREPARING: 'Preparing',
    READY: 'Ready',
    OUT_FOR_DELIVERY: 'Delivering',
};

// Helper to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ─── Main Map Screen ───
export default function MapScreen() {
    const theme = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);

    const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
    const [trackingDriverId, setTrackingDriverId] = useState<string | null>(null);
    const [orderRoutes, setOrderRoutes] = useState<Record<string, any>>({});

    // ─── Data Fetching ───
    const { data: ordersData, loading: ordersLoading, refetch: refetchOrders }: any = useQuery(GET_ORDERS, {
        pollInterval: 30000,
    });
    const { data: driversData }: any = useQuery(GET_DRIVERS, { pollInterval: 15000 });

    useSubscription(ALL_ORDERS_SUBSCRIPTION, { onData: () => refetchOrders() });
    useSubscription(DRIVERS_UPDATED_SUBSCRIPTION);

    const orders = ordersData?.orders || [];
    const drivers = driversData?.drivers || [];

    // ─── Filtered Data ───
    const activeOrders = useMemo(() => {
        return orders.filter((o: any) =>
            ['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status),
        );
    }, [orders]);

    const onlineDrivers = useMemo(
        () => drivers.filter((d: any) => d.driverConnection?.connectionStatus === 'CONNECTED'),
        [drivers],
    );

    const focusedOrder = useMemo(
        () => activeOrders.find((o: any) => o.id === focusedOrderId) ?? null,
        [activeOrders, focusedOrderId],
    );

    const focusedRoute = focusedOrder ? orderRoutes[focusedOrder.id] : null;

    // ─── Route Calculation (Mapbox Directions API) ───
    useEffect(() => {
        const calcRoutes = async () => {
            for (const order of activeOrders) {
                const cacheKey = `${order.id}-${order.driver?.id || 'none'}-${order.status}`;
                if (orderRoutes[order.id]?.cacheKey === cacheKey) continue;

                const firstBusiness = order.businesses?.[0]?.business;
                if (!firstBusiness?.location || !order.dropOffLocation) continue;

                const pickup = { longitude: firstBusiness.location.longitude, latitude: firstBusiness.location.latitude };
                const dropoff = { longitude: order.dropOffLocation.longitude, latitude: order.dropOffLocation.latitude };

                try {
                    if ((order.status === 'READY' || order.status === 'PENDING') && order.driver) {
                        const driver = drivers.find((d: any) => d.id === order.driver.id);
                        const driverLocation = driver?.driverLocation || order.driver?.driverLocation;
                        if (!driverLocation) continue;
                        const driverPos = { longitude: driverLocation.longitude, latitude: driverLocation.latitude };

                        const [toPickup, toDropoff] = await Promise.all([
                            calculateRouteDistance(driverPos, pickup),
                            calculateRouteDistance(pickup, dropoff),
                        ]);
                        if (toPickup && toDropoff) {
                            setOrderRoutes((prev) => ({ ...prev, [order.id]: { toPickup, toDropoff, cacheKey } }));
                        }
                    } else if (order.status === 'OUT_FOR_DELIVERY' && order.driver) {
                        const driver = drivers.find((d: any) => d.id === order.driver.id);
                        const driverLocation = driver?.driverLocation || order.driver?.driverLocation;
                        if (!driverLocation) continue;
                        const driverPos = { longitude: driverLocation.longitude, latitude: driverLocation.latitude };
                        const toDropoff = await calculateRouteDistance(driverPos, dropoff);
                        if (toDropoff) {
                            setOrderRoutes((prev) => ({ ...prev, [order.id]: { toDropoff, cacheKey } }));
                        }
                    } else if (!order.driver) {
                        const toDropoff = await calculateRouteDistance(pickup, dropoff);
                        if (toDropoff) {
                            setOrderRoutes((prev) => ({ ...prev, [order.id]: { toDropoff, cacheKey } }));
                        }
                    }
                } catch (err) {
                    console.error('Route calc error:', order.id, err);
                }
            }
        };
        calcRoutes();
    }, [activeOrders.map((o: any) => `${o.id}-${o.driver?.id || 'none'}-${o.status}`).join(','), drivers]);

    // ─── Track driver location ───
    useEffect(() => {
        if (!trackingDriverId || !mapRef.current) return;
        const trackedDriver = drivers.find((d: any) => d.id === trackingDriverId);
        const loc = trackedDriver?.driverLocation;
        if (loc?.latitude && loc?.longitude) {
            mapRef.current.animateToRegion({
                latitude: loc.latitude,
                longitude: loc.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 500);
        }
    }, [trackingDriverId, drivers]);

    // ─── Handlers ───
    const handleRecenter = useCallback(() => {
        mapRef.current?.animateToRegion({
            latitude: GJILAN_CENTER.latitude,
            longitude: GJILAN_CENTER.longitude,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
        }, 600);
        setTrackingDriverId(null);
    }, []);

    const focusOrder = useCallback((order: any) => {
        setFocusedOrderId(order.id);

        const bizLoc = order.businesses?.[0]?.business?.location;
        const dropLoc = order.dropOffLocation;
        const driverLoc = order.driver ? drivers.find((d: any) => d.id === order.driver.id)?.driverLocation : null;

        const lats: number[] = [];
        const lngs: number[] = [];
        if (bizLoc) { lats.push(bizLoc.latitude); lngs.push(bizLoc.longitude); }
        if (dropLoc) { lats.push(dropLoc.latitude); lngs.push(dropLoc.longitude); }
        if (driverLoc) { lats.push(driverLoc.latitude); lngs.push(driverLoc.longitude); }

        if (lats.length >= 2 && mapRef.current) {
            const padLat = 0.006;
            const padLng = 0.006;
            const minLat = Math.min(...lats) - padLat;
            const maxLat = Math.max(...lats) + padLat;
            const minLng = Math.min(...lngs) - padLng;
            const maxLng = Math.max(...lngs) + padLng;
            mapRef.current.animateToRegion({
                latitude: (minLat + maxLat) / 2,
                longitude: (minLng + maxLng) / 2,
                latitudeDelta: maxLat - minLat,
                longitudeDelta: maxLng - minLng,
            }, 800);
        } else if (bizLoc && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: bizLoc.latitude,
                longitude: bizLoc.longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
            }, 800);
        }
    }, [drivers]);

    const dismissFocusedOrder = useCallback(() => {
        setFocusedOrderId(null);
    }, []);

    const clampToBounds = useCallback((region: Region) => {
        if (!mapRef.current) return;
        const { northEast, southWest } = GJILAN_BOUNDS;
        let lat = region.latitude;
        let lng = region.longitude;
        let clamped = false;
        const latD2 = region.latitudeDelta / 2;
        const lngD2 = region.longitudeDelta / 2;
        if (lat - latD2 < southWest.latitude) { lat = southWest.latitude + latD2; clamped = true; }
        if (lat + latD2 > northEast.latitude) { lat = northEast.latitude - latD2; clamped = true; }
        if (lng - lngD2 < southWest.longitude) { lng = southWest.longitude + lngD2; clamped = true; }
        if (lng + lngD2 > northEast.longitude) { lng = northEast.longitude - lngD2; clamped = true; }
        if (clamped) {
            mapRef.current.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: region.latitudeDelta, longitudeDelta: region.longitudeDelta }, 200);
        }
    }, []);

    // ─── Render ───
    return (
        <View style={styles.container}>
            {/* Map */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                    latitude: GJILAN_CENTER.latitude,
                    longitude: GJILAN_CENTER.longitude,
                    latitudeDelta: 0.06,
                    longitudeDelta: 0.06,
                }}
                minZoomLevel={12}
                maxZoomLevel={18}
                showsUserLocation={false}
                showsMyLocationButton={false}
                showsCompass={false}
                onRegionChangeComplete={clampToBounds}
                onPress={dismissFocusedOrder}>

                {/* ── Route polylines (non-focused orders: subtle) ── */}
                {activeOrders.map((order: any) => {
                    if (order.id === focusedOrderId) return null;
                    const route = orderRoutes[order.id];
                    if (!route) return null;
                    const color = ORDER_STATUS_COLORS[order.status] || '#6b7280';

                    if (route.toPickup && route.toDropoff) {
                        return (
                            <React.Fragment key={`route-${order.id}`}>
                                <Polyline coordinates={toLatLng(route.toPickup.geometry)} strokeColor={color} strokeWidth={2} lineDashPattern={[6, 4]} />
                                <Polyline coordinates={toLatLng(route.toDropoff.geometry)} strokeColor={color} strokeWidth={2} lineDashPattern={[6, 4]} />
                            </React.Fragment>
                        );
                    } else if (route.toDropoff) {
                        return (
                            <Polyline key={`route-${order.id}`} coordinates={toLatLng(route.toDropoff.geometry)} strokeColor={color} strokeWidth={2} lineDashPattern={[6, 4]} />
                        );
                    }
                    return null;
                })}

                {/* ── Focused order route (prominent with casing) ── */}
                {focusedOrder && focusedRoute && (() => {
                    const statusColor = ORDER_STATUS_COLORS[focusedOrder.status] || '#6b7280';

                    if (focusedRoute.toPickup && focusedRoute.toDropoff) {
                        return (
                            <>
                                <Polyline coordinates={toLatLng(focusedRoute.toPickup.geometry)} strokeColor="#ffffff" strokeWidth={7} />
                                <Polyline coordinates={toLatLng(focusedRoute.toPickup.geometry)} strokeColor="#4285F4" strokeWidth={4} />
                                <Polyline coordinates={toLatLng(focusedRoute.toDropoff.geometry)} strokeColor="#F59E0B" strokeWidth={3} lineDashPattern={[8, 6]} />
                            </>
                        );
                    } else if (focusedRoute.toDropoff) {
                        const routeColor = focusedOrder.status === 'OUT_FOR_DELIVERY' ? '#8B5CF6' : statusColor;
                        return (
                            <>
                                <Polyline coordinates={toLatLng(focusedRoute.toDropoff.geometry)} strokeColor="#ffffff" strokeWidth={7} />
                                <Polyline coordinates={toLatLng(focusedRoute.toDropoff.geometry)} strokeColor={routeColor} strokeWidth={4} />
                            </>
                        );
                    }
                    return null;
                })()}

                {/* ── Driver Markers on map ── */}
                {drivers.map((driver: any) => {
                    const loc = driver.driverLocation;
                    if (!loc?.latitude || !loc?.longitude) return null;
                    const isOnline = driver.driverConnection?.connectionStatus === 'CONNECTED';
                    const isTracking = trackingDriverId === driver.id;
                    const bgColor = isOnline ? '#22c55e' : '#94a3b8';

                    return (
                        <Marker
                            key={`driver-${driver.id}`}
                            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                            tracksViewChanges={false}
                            onPress={() => {
                                setFocusedOrderId(null);
                                if (isTracking) {
                                    setTrackingDriverId(null);
                                } else {
                                    setTrackingDriverId(driver.id);
                                    mapRef.current?.animateToRegion({
                                        latitude: loc.latitude,
                                        longitude: loc.longitude,
                                        latitudeDelta: 0.01,
                                        longitudeDelta: 0.01,
                                    }, 600);
                                }
                            }}>
                            <View style={styles.markerContainer}>
                                {isTracking && (
                                    <View style={[styles.trackingRing, { borderColor: '#3b82f6' }]} />
                                )}
                                <View style={[styles.driverMapMarker, { backgroundColor: bgColor, borderColor: isTracking ? '#3b82f6' : '#fff' }]}>
                                    <Text style={styles.driverMapInitial}>
                                        {getInitials(`${driver.firstName} ${driver.lastName}`)}
                                    </Text>
                                </View>
                            </View>
                        </Marker>
                    );
                })}

                {/* ── Order Markers (dropoff only, matching admin-panel style) ── */}
                {activeOrders.map((order: any) => {
                    const statusColor = ORDER_STATUS_COLORS[order.status] || '#6b7280';
                    const isFocused = order.id === focusedOrderId;
                    const isPending = order.status === 'PENDING';
                    const dropLoc = order.dropOffLocation;

                    if (!dropLoc?.latitude || !dropLoc?.longitude) return null;

                    return (
                        <Marker
                            key={`order-${order.id}`}
                            coordinate={{ latitude: dropLoc.latitude, longitude: dropLoc.longitude }}
                            anchor={{ x: 0.5, y: 0.5 }}
                            tracksViewChanges={false}
                            onPress={() => focusOrder(order)}>
                            <View style={styles.orderMarkerContainer}>
                                {/* Pending pulse ring */}
                                {isPending && (
                                    <View style={styles.pendingPulseRing} />
                                )}
                                {/* Main marker circle */}
                                <View style={[styles.orderMarker, {
                                    backgroundColor: hexToRgba(statusColor, 0.08),
                                    borderColor: hexToRgba(statusColor, 0.5),
                                    borderWidth: isFocused ? 3 : 2,
                                    transform: [{ scale: isFocused ? 1.15 : 1 }],
                                }]}>
                                    <Ionicons name="cube" size={16} color={statusColor} />
                                </View>
                            </View>
                        </Marker>
                    );
                })}
            </MapView>

            {/* ═══ Driver overlay – right sidebar ═══ */}
            {onlineDrivers.length > 0 && (
                <View style={[styles.driverSidebar, { top: insets.top + 16 }]}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                        {onlineDrivers.slice(0, 10).map((driver: any) => {
                            const isTracking = trackingDriverId === driver.id;
                            const loc = driver.driverLocation;

                            return (
                                <Pressable
                                    key={driver.id}
                                    onPress={() => {
                                        setFocusedOrderId(null);
                                        if (isTracking) {
                                            setTrackingDriverId(null);
                                        } else {
                                            setTrackingDriverId(driver.id);
                                            if (loc?.latitude && loc?.longitude) {
                                                mapRef.current?.animateToRegion({
                                                    latitude: loc.latitude,
                                                    longitude: loc.longitude,
                                                    latitudeDelta: 0.01,
                                                    longitudeDelta: 0.01,
                                                }, 600);
                                            }
                                        }
                                    }}
                                    style={[styles.driverAvatar, {
                                        borderColor: isTracking ? '#3b82f6' : '#22c55e',
                                        borderWidth: isTracking ? 3 : 2,
                                        transform: [{ scale: isTracking ? 1.1 : 1 }],
                                    }]}>
                                    <Text style={styles.driverAvatarText}>
                                        {getInitials(`${driver.firstName} ${driver.lastName}`)}
                                    </Text>
                                    {isTracking && (
                                        <View style={styles.trackBadge}>
                                            <Ionicons name="eye" size={9} color="#fff" />
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* ═══ Order overlay – bottom strip ═══ */}
            {activeOrders.length > 0 && !focusedOrder && (
                <View style={[styles.orderStrip, { bottom: insets.bottom + 8 }]}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}>
                        {activeOrders.map((order: any) => {
                            const statusColor = ORDER_STATUS_COLORS[order.status] || '#6b7280';
                            const iconName = STATUS_ICONS[order.status] ?? 'ellipse-outline';
                            const bizName = order.businesses?.[0]?.business?.name ?? '?';
                            const route = orderRoutes[order.id];

                            return (
                                <Pressable
                                    key={order.id}
                                    onPress={() => focusOrder(order)}
                                    style={[styles.orderCard, { borderLeftColor: statusColor }]}>
                                    <View style={[styles.orderCardIcon, { backgroundColor: statusColor }]}>
                                        <Ionicons name={iconName as any} size={14} color="#fff" />
                                    </View>
                                    <View style={styles.orderCardInfo}>
                                        <Text style={styles.orderCardBiz} numberOfLines={1}>{bizName}</Text>
                                        <Text style={[styles.orderCardStatus, { color: statusColor }]}>
                                            {STATUS_LABELS[order.status]}
                                            {route?.toDropoff ? ` · ${route.toDropoff.distanceKm.toFixed(1)}km` : ''}
                                        </Text>
                                    </View>
                                    {!order.driver && (
                                        <View style={styles.unassignedDot} />
                                    )}
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* ═══ Recenter button ═══ */}
            <View style={[styles.recenterBtn, { bottom: focusedOrder ? 140 + insets.bottom : (activeOrders.length > 0 ? 100 + insets.bottom : 20 + insets.bottom) }]}>
                <Pressable style={styles.mapBtn} onPress={handleRecenter}>
                    <Ionicons name="locate" size={22} color="#4285F4" />
                </Pressable>
            </View>

            {/* ═══ Focused order bottom bar ═══ */}
            {focusedOrder && (() => {
                const statusColor = ORDER_STATUS_COLORS[focusedOrder.status] || '#6b7280';
                const bizName = focusedOrder.businesses?.[0]?.business?.name ?? 'Unknown';
                const customerName = focusedOrder.user
                    ? `${focusedOrder.user.firstName} ${focusedOrder.user.lastName}`
                    : 'Customer';
                const iconName = STATUS_ICONS[focusedOrder.status] ?? 'ellipse-outline';
                const isAssigned = !!focusedOrder.driver;
                const driverName = isAssigned ? `${focusedOrder.driver.firstName} ${focusedOrder.driver.lastName}` : null;

                return (
                    <View style={[styles.focusedBar, { paddingBottom: insets.bottom + 8, backgroundColor: statusColor }]}>
                        <View style={styles.focusedStatusDot}>
                            <Ionicons name={iconName as any} size={16} color="#fff" />
                        </View>
                        <View style={styles.focusedInfo}>
                            <Text style={styles.focusedBiz} numberOfLines={1}>{bizName}</Text>
                            <Text style={styles.focusedMeta} numberOfLines={1}>
                                {STATUS_LABELS[focusedOrder.status]} · {customerName}
                                {driverName ? ` · ${driverName}` : ' · Unassigned'}
                            </Text>
                            {focusedRoute && (
                                <View style={styles.focusedRouteRows}>
                                    {focusedRoute.toPickup && (
                                        <View style={styles.focusedRouteRow}>
                                            <Ionicons name="restaurant" size={12} color="rgba(255,255,255,0.85)" />
                                            <Text style={styles.focusedRouteText}>
                                                {focusedRoute.toPickup.distanceKm.toFixed(1)} km · {Math.ceil(focusedRoute.toPickup.durationMin)} min
                                            </Text>
                                            <Text style={styles.focusedRouteLabel}>→ Pickup</Text>
                                        </View>
                                    )}
                                    <View style={styles.focusedRouteRow}>
                                        <Ionicons name="flag" size={12} color={focusedRoute.toPickup ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.85)'} />
                                        <Text style={focusedRoute.toPickup ? styles.focusedRouteTextSm : styles.focusedRouteText}>
                                            {focusedRoute.toDropoff.distanceKm.toFixed(1)} km · {Math.ceil(focusedRoute.toDropoff.durationMin)} min
                                        </Text>
                                        <Text style={styles.focusedRouteLabel}>→ Dropoff</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                        <Pressable
                            style={styles.focusedViewBtn}
                            onPress={() => {
                                setFocusedOrderId(null);
                                router.push(`/order/${focusedOrder.id}`);
                            }}
                            hitSlop={8}>
                            <Ionicons name="open-outline" size={20} color="#fff" />
                        </Pressable>
                        <Pressable style={styles.focusedCloseBtn} onPress={dismissFocusedOrder} hitSlop={8}>
                            <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
                        </Pressable>
                    </View>
                );
            })()}

            {/* Loading */}
            {ordersLoading && !ordersData && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },

    /* ── Map Markers ── */
    markerContainer: { alignItems: 'center' },
    driverMapMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    driverMapInitial: {
        fontSize: 11,
        fontWeight: '800',
        color: '#fff',
    },
    trackingRing: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        top: -6,
    },
    orderMarkerContainer: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orderMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    pendingPulseRing: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ef4444',
        opacity: 0.4,
    },

    /* ── Driver sidebar (right) ── */
    driverSidebar: {
        position: 'absolute',
        right: 12,
        zIndex: 10,
        maxHeight: 400,
    },
    driverAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1e293b',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    driverAvatarText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#fff',
    },
    trackBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },

    /* ── Order strip (bottom) ── */
    orderStrip: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 10,
    },
    orderCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderLeftWidth: 4,
        minWidth: 160,
        maxWidth: 220,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    orderCardIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    orderCardInfo: {
        flex: 1,
    },
    orderCardBiz: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1e293b',
    },
    orderCardStatus: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    unassignedDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
        marginLeft: 6,
    },

    /* ── Recenter ── */
    recenterBtn: {
        position: 'absolute',
        right: 16,
        zIndex: 10,
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

    /* ── Focused order bar ── */
    focusedBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 14,
        paddingHorizontal: 16,
        gap: 10,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    focusedStatusDot: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    focusedInfo: { flex: 1 },
    focusedBiz: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    focusedMeta: {
        fontSize: 12,
        marginTop: 2,
        color: 'rgba(255,255,255,0.75)',
    },
    focusedRouteRows: {
        marginTop: 4,
        gap: 2,
    },
    focusedRouteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    focusedRouteText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },
    focusedRouteTextSm: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
    },
    focusedRouteLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.6)',
    },
    focusedViewBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    focusedCloseBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* ── Loading ── */
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
});
