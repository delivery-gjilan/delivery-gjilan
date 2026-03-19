import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApolloClient, useQuery, useSubscription } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from '@rnmapbox/maps';
import { GET_ORDERS, ALL_ORDERS_SUBSCRIPTION } from '@/graphql/orders';
import { GET_DRIVERS, DRIVERS_UPDATED_SUBSCRIPTION } from '@/graphql/drivers';
import { GJILAN_CENTER, GJILAN_BOUNDS, ORDER_STATUS_COLORS } from '@/utils/constants';
import { getInitials } from '@/utils/helpers';
import { calculateRouteDistance } from '@/utils/mapbox';

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
    geometry: {
        type: 'LineString' as const,
        coordinates: geometry,
    },
});

export default function MapScreen() {
    const apolloClient = useApolloClient();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<Mapbox.Camera>(null);
    const hasMapboxToken = Boolean(process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim());

    const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
    const [trackingDriverId, setTrackingDriverId] = useState<string | null>(null);
    const [orderRoutes, setOrderRoutes] = useState<Record<string, { toPickup?: RouteData; toDropoff?: RouteData; cacheKey: string }>>({});

    const { data: ordersData, loading: ordersLoading, refetch: refetchOrders }: any = useQuery(GET_ORDERS);
    const { data: driversData, refetch: refetchDrivers }: any = useQuery(GET_DRIVERS);

    const ordersRefetchCooldownRef = useRef(0);
    const ordersRefetchInFlightRef = useRef(false);
    const ordersRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const driversRefetchCooldownRef = useRef(0);
    const driversRefetchInFlightRef = useRef(false);
    const driversRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (ordersRefetchTimerRef.current) clearTimeout(ordersRefetchTimerRef.current);
            if (driversRefetchTimerRef.current) clearTimeout(driversRefetchTimerRef.current);
        };
    }, []);

    const scheduleOrdersRefetch = useCallback(() => {
        const now = Date.now();
        const canRunNow = now - ordersRefetchCooldownRef.current >= 1200 && !ordersRefetchInFlightRef.current;
        if (!canRunNow) {
            if (ordersRefetchTimerRef.current) return;
            ordersRefetchTimerRef.current = setTimeout(() => {
                ordersRefetchTimerRef.current = null;
                if (ordersRefetchInFlightRef.current) return;
                ordersRefetchInFlightRef.current = true;
                ordersRefetchCooldownRef.current = Date.now();
                refetchOrders().finally(() => {
                    ordersRefetchInFlightRef.current = false;
                });
            }, 350);
            return;
        }

        ordersRefetchInFlightRef.current = true;
        ordersRefetchCooldownRef.current = now;
        refetchOrders().finally(() => {
            ordersRefetchInFlightRef.current = false;
        });
    }, [refetchOrders]);

    const scheduleDriversRefetch = useCallback(() => {
        const now = Date.now();
        const canRunNow = now - driversRefetchCooldownRef.current >= 1200 && !driversRefetchInFlightRef.current;
        if (!canRunNow) {
            if (driversRefetchTimerRef.current) return;
            driversRefetchTimerRef.current = setTimeout(() => {
                driversRefetchTimerRef.current = null;
                if (driversRefetchInFlightRef.current) return;
                driversRefetchInFlightRef.current = true;
                driversRefetchCooldownRef.current = Date.now();
                refetchDrivers().finally(() => {
                    driversRefetchInFlightRef.current = false;
                });
            }, 350);
            return;
        }

        driversRefetchInFlightRef.current = true;
        driversRefetchCooldownRef.current = now;
        refetchDrivers().finally(() => {
            driversRefetchInFlightRef.current = false;
        });
    }, [refetchDrivers]);

    useSubscription(ALL_ORDERS_SUBSCRIPTION, {
        onData: ({ data: subscriptionData }) => {
            const incomingOrders = subscriptionData.data?.allOrdersUpdated as any[] | undefined;
            if (!incomingOrders || incomingOrders.length === 0) {
                scheduleOrdersRefetch();
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
    useSubscription(DRIVERS_UPDATED_SUBSCRIPTION, { onData: () => scheduleDriversRefetch() });

    const orders = ordersData?.orders || [];
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

    const focusOrder = useCallback((order: any) => {
        setFocusedOrderId(order.id);

        const bizLoc = order.businesses?.[0]?.business?.location;
        const dropLoc = order.dropOffLocation;
        const driverLoc = order.driver ? drivers.find((d: any) => d.id === order.driver.id)?.driverLocation : null;

        const lats: number[] = [];
        const lngs: number[] = [];
        if (bizLoc) {
            lats.push(bizLoc.latitude);
            lngs.push(bizLoc.longitude);
        }
        if (dropLoc) {
            lats.push(dropLoc.latitude);
            lngs.push(dropLoc.longitude);
        }
        if (driverLoc) {
            lats.push(driverLoc.latitude);
            lngs.push(driverLoc.longitude);
        }

        if (lats.length >= 2) {
            const padLat = 0.006;
            const padLng = 0.006;
            const minLat = Math.min(...lats) - padLat;
            const maxLat = Math.max(...lats) + padLat;
            const minLng = Math.min(...lngs) - padLng;
            const maxLng = Math.max(...lngs) + padLng;
            cameraRef.current?.fitBounds([maxLng, maxLat], [minLng, minLat], [80, 60, 180, 60], 800);
        } else if (bizLoc) {
            cameraRef.current?.setCamera({
                centerCoordinate: [bizLoc.longitude, bizLoc.latitude],
                zoomLevel: 15,
                animationDuration: 800,
            });
        }
    }, [drivers]);

    const dismissFocusedOrder = useCallback(() => {
        setFocusedOrderId(null);
    }, []);

    return (
        <View style={styles.container}>
            {hasMapboxToken ? (
                <Mapbox.MapView
                    style={styles.map}
                    styleURL="mapbox://styles/mapbox/streets-v12"
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

                    {activeOrders.map((order: any) => {
                        if (order.id === focusedOrderId) return null;
                        const route = orderRoutes[order.id];
                        if (!route) return null;
                        const color = ORDER_STATUS_COLORS[order.status] || '#6b7280';

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

                    {focusedOrder && focusedRoute?.toDropoff && (
                        <Mapbox.ShapeSource id={`focused-route-${focusedOrder.id}`} shape={toLineFeature(focusedRoute.toDropoff.geometry)}>
                            <Mapbox.LineLayer id={`focused-route-bg-${focusedOrder.id}`} style={{ lineColor: '#ffffff', lineWidth: 7 }} />
                            <Mapbox.LineLayer
                                id={`focused-route-fg-${focusedOrder.id}`}
                                style={{ lineColor: ORDER_STATUS_COLORS[focusedOrder.status] || '#6b7280', lineWidth: 4 }}
                            />
                        </Mapbox.ShapeSource>
                    )}

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
                                        <Text style={styles.driverMapInitial}>{getInitials(`${driver.firstName} ${driver.lastName}`)}</Text>
                                    </View>
                                </View>
                            </Mapbox.PointAnnotation>
                        );
                    })}

                    {activeOrders.map((order: any) => {
                        const statusColor = ORDER_STATUS_COLORS[order.status] || '#6b7280';
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
                <View style={styles.mapsSetupContainer}>
                    <View style={styles.mapsSetupCard}>
                        <Ionicons name="map-outline" size={30} color="#64748b" />
                        <Text style={styles.mapsSetupTitle}>Mapbox Token Required</Text>
                        <Text style={styles.mapsSetupText}>Set EXPO_PUBLIC_MAPBOX_TOKEN to enable the live map.</Text>
                    </View>
                </View>
            )}

            {hasMapboxToken && onlineDrivers.length > 0 && (
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
                                            borderColor: isTracking ? '#3b82f6' : '#22c55e',
                                            borderWidth: isTracking ? 3 : 2,
                                            transform: [{ scale: isTracking ? 1.1 : 1 }],
                                        },
                                    ]}>
                                    <Text style={styles.driverAvatarText}>{getInitials(`${driver.firstName} ${driver.lastName}`)}</Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {hasMapboxToken && activeOrders.length > 0 && !focusedOrder && (
                <View style={[styles.orderStrip, { bottom: insets.bottom + 8 }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}>
                        {activeOrders.map((order: any) => {
                            const statusColor = ORDER_STATUS_COLORS[order.status] || '#6b7280';
                            const iconName = STATUS_ICONS[order.status] ?? 'ellipse-outline';
                            const bizName = order.businesses?.[0]?.business?.name ?? '?';
                            const route = orderRoutes[order.id];

                            return (
                                <Pressable key={order.id} onPress={() => focusOrder(order)} style={[styles.orderCard, { borderLeftColor: statusColor }]}>
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
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {hasMapboxToken && (
                <View style={[styles.recenterBtn, { bottom: focusedOrder ? 140 + insets.bottom : activeOrders.length > 0 ? 100 + insets.bottom : 20 + insets.bottom }]}>
                    <Pressable style={styles.mapBtn} onPress={handleRecenter}>
                        <Ionicons name="locate" size={22} color="#4285F4" />
                    </Pressable>
                </View>
            )}

            {hasMapboxToken && focusedOrder && (() => {
                const statusColor = ORDER_STATUS_COLORS[focusedOrder.status] || '#6b7280';
                const bizName = focusedOrder.businesses?.[0]?.business?.name ?? 'Unknown';
                const customerName = focusedOrder.user ? `${focusedOrder.user.firstName} ${focusedOrder.user.lastName}` : 'Customer';
                const iconName = STATUS_ICONS[focusedOrder.status] ?? 'ellipse-outline';
                const driverName = focusedOrder.driver ? `${focusedOrder.driver.firstName} ${focusedOrder.driver.lastName}` : null;

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
                                router.push(`/order/${focusedOrder.id}`);
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
    mapsSetupContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        backgroundColor: '#f8fafc',
    },
    mapsSetupCard: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingVertical: 20,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    mapsSetupTitle: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    mapsSetupText: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 18,
        textAlign: 'center',
        color: '#475569',
    },
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
    orderCardInfo: { flex: 1 },
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
    focusedViewBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
});
