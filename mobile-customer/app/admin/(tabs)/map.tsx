import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from '@rnmapbox/maps';
import { ADMIN_GET_ORDERS } from '@/graphql/operations/admin/orders';
import { ADMIN_GET_DRIVERS } from '@/graphql/operations/admin/drivers';
import { GJILAN_CENTER, GJILAN_BOUNDS, ADMIN_ORDER_STATUS_COLORS, adminGetInitials } from '@/utils/adminHelpers';
import { calculateRouteDistance } from '@/utils/mapbox';
import { useTheme } from '@/hooks/useTheme';

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

type RouteData = {
    distanceKm: number;
    durationMin: number;
    geometry: Array<[number, number]>;
};

const toLineFeature = (geometry: Array<[number, number]>) => ({
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates: geometry },
});

export default function AdminMapScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const isDark = theme.dark;
    const cameraRef = useRef<Mapbox.Camera>(null);
    const hasMapboxToken = Boolean(process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim());

    const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
    const [trackingDriverId, setTrackingDriverId] = useState<string | null>(null);
    const [orderRoutes, setOrderRoutes] = useState<
        Record<string, { toPickup?: RouteData; toDropoff?: RouteData; cacheKey: string }>
    >({});

    const { data: ordersData, loading: ordersLoading, refetch: refetchOrders }: any = useQuery(ADMIN_GET_ORDERS);
    const { data: driversData, refetch: refetchDrivers }: any = useQuery(ADMIN_GET_DRIVERS);

    const orders = ordersData?.orders?.orders || [];
    const drivers = driversData?.drivers || [];

    const activeOrders = useMemo(
        () => orders.filter((o: any) => ['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status)),
        [orders],
    );
    const onlineDrivers = useMemo(
        () => drivers.filter((d: any) => d.driverConnection?.connectionStatus === 'CONNECTED'),
        [drivers],
    );
    const focusedOrder = useMemo(
        () => activeOrders.find((o: any) => o.id === focusedOrderId) ?? null,
        [activeOrders, focusedOrderId],
    );
    const focusedRoute = focusedOrder ? orderRoutes[focusedOrder.id] : null;

    // Route calculation
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

    // Track driver camera
    useEffect(() => {
        if (!trackingDriverId) return;
        const trackedDriver = drivers.find((d: any) => d.id === trackingDriverId);
        const loc = trackedDriver?.driverLocation;
        if (loc?.latitude && loc?.longitude) {
            cameraRef.current?.setCamera({
                centerCoordinate: [loc.longitude, loc.latitude],
                zoomLevel: 15,
                animationDuration: 500,
            });
        }
    }, [trackingDriverId, drivers]);

    const handleRecenter = useCallback(() => {
        cameraRef.current?.setCamera({
            centerCoordinate: [GJILAN_CENTER.longitude, GJILAN_CENTER.latitude],
            zoomLevel: 12,
            animationDuration: 600,
        });
        setTrackingDriverId(null);
    }, []);

    const focusOrder = useCallback(
        (order: any) => {
            setFocusedOrderId(order.id);
            const bizLoc = order.businesses?.[0]?.business?.location;
            const dropLoc = order.dropOffLocation;
            const driverLoc = order.driver
                ? drivers.find((d: any) => d.id === order.driver.id)?.driverLocation
                : null;
            const lats: number[] = [];
            const lngs: number[] = [];
            if (bizLoc) { lats.push(bizLoc.latitude); lngs.push(bizLoc.longitude); }
            if (dropLoc) { lats.push(dropLoc.latitude); lngs.push(dropLoc.longitude); }
            if (driverLoc) { lats.push(driverLoc.latitude); lngs.push(driverLoc.longitude); }
            if (lats.length >= 2) {
                const pad = 0.006;
                cameraRef.current?.fitBounds(
                    [Math.max(...lngs) + pad, Math.max(...lats) + pad],
                    [Math.min(...lngs) - pad, Math.min(...lats) - pad],
                    [80, 60, 180, 60],
                    800,
                );
            } else if (bizLoc) {
                cameraRef.current?.setCamera({
                    centerCoordinate: [bizLoc.longitude, bizLoc.latitude],
                    zoomLevel: 15,
                    animationDuration: 800,
                });
            }
        },
        [drivers],
    );

    const dismissFocusedOrder = useCallback(() => setFocusedOrderId(null), []);

    return (
        <View style={styles.container}>
            {hasMapboxToken ? (
                <Mapbox.MapView
                    style={styles.map}
                    styleURL={isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12'}
                    logoEnabled={false}
                    compassEnabled={false}
                    scaleBarEnabled={false}
                    rotateEnabled={false}
                    onPress={dismissFocusedOrder}>
                    <Mapbox.Camera
                        ref={cameraRef}
                        defaultSettings={{
                            centerCoordinate: [GJILAN_CENTER.longitude, GJILAN_CENTER.latitude],
                            zoomLevel: 12,
                        }}
                        bounds={{
                            ne: [GJILAN_BOUNDS.northEast.longitude, GJILAN_BOUNDS.northEast.latitude],
                            sw: [GJILAN_BOUNDS.southWest.longitude, GJILAN_BOUNDS.southWest.latitude],
                        }}
                    />

                    {/* Background routes (non-focused) */}
                    {activeOrders.map((order: any) => {
                        if (order.id === focusedOrderId) return null;
                        const route = orderRoutes[order.id];
                        if (!route) return null;
                        const color = ADMIN_ORDER_STATUS_COLORS[order.status] || '#6b7280';
                        return (
                            <React.Fragment key={`route-${order.id}`}>
                                {route.toPickup && (
                                    <Mapbox.ShapeSource id={`route-pickup-${order.id}`} shape={toLineFeature(route.toPickup.geometry)}>
                                        <Mapbox.LineLayer id={`route-pickup-layer-${order.id}`} style={{ lineColor: color, lineWidth: 2, lineDasharray: [2, 2] }} />
                                    </Mapbox.ShapeSource>
                                )}
                                {route.toDropoff && (
                                    <Mapbox.ShapeSource id={`route-dropoff-${order.id}`} shape={toLineFeature(route.toDropoff.geometry)}>
                                        <Mapbox.LineLayer id={`route-dropoff-layer-${order.id}`} style={{ lineColor: color, lineWidth: 2, lineDasharray: [2, 2] }} />
                                    </Mapbox.ShapeSource>
                                )}
                            </React.Fragment>
                        );
                    })}

                    {/* Focused order route */}
                    {focusedOrder && focusedRoute?.toDropoff && (
                        <Mapbox.ShapeSource id={`focused-route-${focusedOrder.id}`} shape={toLineFeature(focusedRoute.toDropoff.geometry)}>
                            <Mapbox.LineLayer id={`focused-route-bg-${focusedOrder.id}`} style={{ lineColor: '#ffffff', lineWidth: 7 }} />
                            <Mapbox.LineLayer
                                id={`focused-route-fg-${focusedOrder.id}`}
                                style={{ lineColor: ADMIN_ORDER_STATUS_COLORS[focusedOrder.status] || '#6b7280', lineWidth: 4 }}
                            />
                        </Mapbox.ShapeSource>
                    )}

                    {/* Driver markers */}
                    {drivers.map((driver: any) => {
                        const loc = driver.driverLocation;
                        if (!loc?.latitude || !loc?.longitude) return null;
                        const isOnline = driver.driverConnection?.connectionStatus === 'CONNECTED';
                        const isTracking = trackingDriverId === driver.id;
                        const bgColor = isOnline ? '#22c55e' : '#94a3b8';
                        return (
                            <Mapbox.PointAnnotation
                                key={`driver-${driver.id}`}
                                id={`driver-${driver.id}`}
                                coordinate={[loc.longitude, loc.latitude]}
                                onSelected={() => {
                                    setFocusedOrderId(null);
                                    if (isTracking) {
                                        setTrackingDriverId(null);
                                    } else {
                                        setTrackingDriverId(driver.id);
                                        cameraRef.current?.setCamera({
                                            centerCoordinate: [loc.longitude, loc.latitude],
                                            zoomLevel: 15,
                                            animationDuration: 600,
                                        });
                                    }
                                }}>
                                <View style={styles.markerContainer}>
                                    {isTracking && <View style={[styles.trackingRing, { borderColor: '#3b82f6' }]} />}
                                    <View style={[styles.driverMapMarker, { backgroundColor: bgColor, borderColor: isTracking ? '#3b82f6' : '#fff' }]}>
                                        <Text style={styles.driverMapInitial}>
                                            {adminGetInitials(driver.firstName, driver.lastName)}
                                        </Text>
                                    </View>
                                </View>
                            </Mapbox.PointAnnotation>
                        );
                    })}

                    {/* Order markers */}
                    {activeOrders.map((order: any) => {
                        const statusColor = ADMIN_ORDER_STATUS_COLORS[order.status] || '#6b7280';
                        const isFocused = order.id === focusedOrderId;
                        const dropLoc = order.dropOffLocation;
                        if (!dropLoc?.latitude || !dropLoc?.longitude) return null;
                        return (
                            <Mapbox.PointAnnotation
                                key={`order-${order.id}`}
                                id={`order-${order.id}`}
                                coordinate={[dropLoc.longitude, dropLoc.latitude]}
                                onSelected={() => focusOrder(order)}>
                                <View style={styles.orderMarkerContainer}>
                                    <View
                                        style={[
                                            styles.orderMarker,
                                            {
                                                backgroundColor: 'rgba(255,255,255,0.96)',
                                                borderColor: statusColor,
                                                borderWidth: isFocused ? 3 : 2,
                                                transform: [{ scale: isFocused ? 1.15 : 1 }],
                                            },
                                        ]}>
                                        <Ionicons name="cube" size={16} color={statusColor} />
                                    </View>
                                </View>
                            </Mapbox.PointAnnotation>
                        );
                    })}
                </Mapbox.MapView>
            ) : (
                <View style={[styles.mapsSetupContainer, { backgroundColor: theme.colors.background }]}>
                    <View style={[styles.mapsSetupCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <Ionicons name="map-outline" size={30} color={theme.colors.subtext} />
                        <Text style={[styles.mapsSetupTitle, { color: theme.colors.text }]}>Mapbox Token Required</Text>
                        <Text style={[styles.mapsSetupText, { color: theme.colors.subtext }]}>Set EXPO_PUBLIC_MAPBOX_TOKEN to enable the live map.</Text>
                    </View>
                </View>
            )}

            {/* Online driver sidebar */}
            {hasMapboxToken && onlineDrivers.length > 0 && (
                <View style={[styles.driverSidebar, { top: insets.top + 12 }]}>
                    {/* Header badge */}
                    <View style={[styles.driverSidebarBadge, { backgroundColor: '#22c55e' }]}>
                        <Text style={styles.driverSidebarBadgeText}>{onlineDrivers.length}</Text>
                    </View>
                    <View style={[styles.driverSidebarPanel, {
                        backgroundColor: isDark ? 'rgba(26,26,26,0.88)' : 'rgba(255,255,255,0.88)',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    }]}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                            {onlineDrivers.slice(0, 8).map((driver: any) => {
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
                                                    cameraRef.current?.setCamera({
                                                        centerCoordinate: [loc.longitude, loc.latitude],
                                                        zoomLevel: 15,
                                                        animationDuration: 600,
                                                    });
                                                }
                                            }
                                        }}
                                        style={[
                                            styles.driverAvatar,
                                            {
                                                backgroundColor: isTracking ? '#3b82f6' : '#22c55e',
                                                borderColor: isTracking ? '#93c5fd' : '#86efac',
                                                borderWidth: 2,
                                                transform: [{ scale: isTracking ? 1.08 : 1 }],
                                            },
                                        ]}>
                                        {isTracking && <View style={styles.trackingPulse} />}
                                        <Text style={styles.driverAvatarText}>
                                            {adminGetInitials(driver.firstName, driver.lastName)}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            )}

            {/* Active orders strip */}
            {hasMapboxToken && activeOrders.length > 0 && !focusedOrder && (
                <View style={[styles.orderStripWrapper, { bottom: insets.bottom + 8 }]}>
                    {/* mini stat pill */}
                    <View style={[styles.orderStripHeader, {
                        backgroundColor: isDark ? 'rgba(26,26,26,0.85)' : 'rgba(255,255,255,0.85)',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    }]}>
                        <View style={[styles.hudDot, { backgroundColor: '#f59e0b' }]} />
                        <Text style={[styles.orderStripHeaderText, { color: theme.colors.text }]}>
                            {activeOrders.length} active order{activeOrders.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, gap: 8, paddingBottom: 2 }}>
                        {activeOrders.map((order: any) => {
                            const statusColor = ADMIN_ORDER_STATUS_COLORS[order.status] || '#6b7280';
                            const iconName = STATUS_ICONS[order.status] ?? 'ellipse-outline';
                            const bizName = order.businesses?.[0]?.business?.name ?? '?';
                            const route = orderRoutes[order.id];
                            return (
                                <Pressable key={order.id} onPress={() => focusOrder(order)} style={[styles.orderCard, { borderLeftColor: statusColor, backgroundColor: isDark ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.97)' }]}>
                                    <View style={[styles.orderCardIcon, { backgroundColor: statusColor }]}>
                                        <Ionicons name={iconName as any} size={13} color="#fff" />
                                    </View>
                                    <View style={styles.orderCardInfo}>
                                        <Text style={[styles.orderCardBiz, { color: theme.colors.text }]} numberOfLines={1}>{bizName}</Text>
                                        <Text style={[styles.orderCardStatus, { color: statusColor }]}>
                                            {STATUS_LABELS[order.status]}
                                            {route?.toDropoff ? ` · ${route.toDropoff.distanceKm.toFixed(1)}km` : ''}
                                        </Text>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Recenter button */}
            {hasMapboxToken && (
                <View style={[styles.recenterBtn, {
                    bottom: focusedOrder
                        ? 150 + insets.bottom
                        : activeOrders.length > 0
                        ? 118 + insets.bottom
                        : 24 + insets.bottom,
                }]}>
                    <Pressable style={[styles.mapBtn, { backgroundColor: isDark ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderWidth: 1 }]} onPress={handleRecenter}>
                        <Ionicons name="locate" size={21} color={theme.colors.primary} />
                    </Pressable>
                </View>
            )}

            {/* Focused order bar */}
            {hasMapboxToken && focusedOrder && (() => {
                const statusColor = ADMIN_ORDER_STATUS_COLORS[focusedOrder.status] || '#6b7280';
                const bizName = focusedOrder.businesses?.[0]?.business?.name ?? 'Unknown';
                const customerName = focusedOrder.user
                    ? `${focusedOrder.user.firstName} ${focusedOrder.user.lastName}`
                    : 'Customer';
                const iconName = STATUS_ICONS[focusedOrder.status] ?? 'ellipse-outline';
                const driverName = focusedOrder.driver
                    ? `${focusedOrder.driver.firstName} ${focusedOrder.driver.lastName}`
                    : null;

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
                            {focusedRoute?.toDropoff && (
                                <View style={styles.focusedRouteRows}>
                                    <View style={styles.focusedRouteRow}>
                                        <Ionicons name="flag" size={12} color="rgba(255,255,255,0.85)" />
                                        <Text style={styles.focusedRouteText}>
                                            {focusedRoute.toDropoff.distanceKm.toFixed(1)} km · {Math.ceil(focusedRoute.toDropoff.durationMin)} min
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                        <Pressable
                            style={styles.focusedViewBtn}
                            onPress={() => {
                                setFocusedOrderId(null);
                                router.push(`/admin/order/${focusedOrder.id}` as any);
                            }}>
                            <Ionicons name="open-outline" size={20} color="#fff" />
                        </Pressable>
                    </View>
                );
            })()}

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
    mapsSetupContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#f8fafc' },
    mapsSetupCard: { width: '100%', maxWidth: 360, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center' },
    mapsSetupTitle: { marginTop: 10, fontSize: 16, fontWeight: '700', color: '#0f172a' },
    mapsSetupText: { marginTop: 8, fontSize: 13, lineHeight: 18, textAlign: 'center', color: '#475569' },
    markerContainer: { alignItems: 'center' },
    driverMapMarker: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
    driverMapInitial: { fontSize: 11, fontWeight: '800', color: '#fff' },
    trackingRing: { position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 2, top: -6 },
    orderMarkerContainer: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    orderMarker: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
    focusedBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', paddingTop: 14, paddingHorizontal: 16, gap: 10, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    focusedStatusDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    focusedInfo: { flex: 1 },
    focusedBiz: { fontSize: 15, fontWeight: '700', color: '#fff' },
    focusedMeta: { fontSize: 12, marginTop: 2, color: 'rgba(255,255,255,0.75)' },
    focusedRouteRows: { marginTop: 4, gap: 2 },
    focusedRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    focusedRouteText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    focusedViewBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
    // Driver sidebar
    driverSidebar: { position: 'absolute', right: 10, zIndex: 10 },
    driverSidebarBadge: { position: 'absolute', top: -6, right: -4, zIndex: 20, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    driverSidebarBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
    driverSidebarPanel: { borderRadius: 16, paddingVertical: 8, paddingHorizontal: 6, maxHeight: 320, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 8 },
    driverAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    driverAvatarText: { fontSize: 12, fontWeight: '800', color: '#fff', zIndex: 2 },
    trackingPulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', zIndex: 1 },
    // Order strip
    orderStripWrapper: { position: 'absolute', left: 0, right: 0, zIndex: 10 },
    orderStripHeader: { alignSelf: 'flex-start', marginLeft: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    hudDot: { width: 7, height: 7, borderRadius: 3.5 },
    orderStripHeaderText: { fontSize: 12, fontWeight: '700' },
    orderCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingVertical: 9, paddingHorizontal: 11, borderLeftWidth: 3.5, minWidth: 155, maxWidth: 210, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
    orderCardIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
    orderCardInfo: { flex: 1 },
    orderCardBiz: { fontSize: 13, fontWeight: '700' },
    orderCardStatus: { fontSize: 11, fontWeight: '600', marginTop: 1 },
    // Recenter
    recenterBtn: { position: 'absolute', right: 14, zIndex: 10 },
    mapBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5 },
});
