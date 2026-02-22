import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Mapbox from '@rnmapbox/maps';
import { useQuery, useSubscription } from '@apollo/client/react';
import { GET_ORDERS, ALL_ORDERS_UPDATED } from '@/graphql/operations/orders';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { useNavigationStore } from '@/store/navigationStore';
import type { NavigationPhase } from '@/store/navigationStore';
import { Ionicons } from '@expo/vector-icons';
import { fetchRouteGeometry } from '@/utils/mapbox';
import type { Feature, LineString } from 'geojson';

/* ─── Constants ─── */
const GJILAN_CENTER: [number, number] = [21.4694, 42.4635];
const GJILAN_NE: [number, number] = [21.51, 42.50];
const GJILAN_SW: [number, number] = [21.42, 42.43];
const MAP_STYLE = 'mapbox://styles/artshabani2002/cmls0528e002701p93dejgdri';

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

const STATUS_ICONS: Record<string, string> = {
    PENDING: 'time-outline',
    PREPARING: 'restaurant-outline',
    READY: 'bag-check-outline',
    OUT_FOR_DELIVERY: 'bicycle-outline',
};

export default function MapScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const currentDriverId = useAuthStore((state) => state.user?.id);
    const startNavigation = useNavigationStore((s) => s.startNavigation);
    const cameraRef = useRef<Mapbox.Camera>(null);

    const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);

    // ── Route state ──
    const [routeCoords, setRouteCoords] = useState<Array<[number, number]> | null>(null);
    const [previewRouteCoords, setPreviewRouteCoords] = useState<Array<[number, number]> | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
    const [previewRouteInfo, setPreviewRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

    // ── Orders query + real-time subscription ──
    const { data, loading } = useQuery(GET_ORDERS, {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    useSubscription(ALL_ORDERS_UPDATED, {
        onData: ({ client, data: subData }) => {
            const payload = (subData as any)?.data?.allOrdersUpdated as any[] | undefined;
            if (payload) {
                client.writeQuery({
                    query: GET_ORDERS,
                    data: { orders: payload },
                });
            }
        },
    });

    // ── Filter orders ──
    const assignedOrders = useMemo(() => {
        const orders = (data as any)?.orders ?? [];
        return orders.filter((order: any) => {
            if (order.status === 'DELIVERED' || order.status === 'CANCELLED') return false;
            return order.driver?.id === currentDriverId;
        });
    }, [data, currentDriverId]);

    // ── Adaptive GPS interval based on activity ──
    const hasActiveNavigation = useMemo(() => {
        return assignedOrders.some((order: any) =>
            order.status === 'READY' || order.status === 'OUT_FOR_DELIVERY'
        );
    }, [assignedOrders]);

    const gpsInterval = hasActiveNavigation ? 1000 : 5000;

    // ── Driver location ──
    const { location, permissionGranted } = useDriverLocation({
        smoothing: true,
        timeInterval: gpsInterval,
        distanceFilter: hasActiveNavigation ? 5 : 10,
    });

    // ── Camera follow ──
    const [followDriver, setFollowDriver] = useState(false);

    const recenterOnDriver = useCallback(() => {
        if (location) {
            cameraRef.current?.setCamera({
                centerCoordinate: [location.longitude, location.latitude],
                animationDuration: 300,
                animationMode: 'easeTo',
            });
        }
    }, [location]);

    const handleMapTouchEnd = useCallback(() => {
        if (!followDriver || !location) return;
        cameraRef.current?.setCamera({
            centerCoordinate: [location.longitude, location.latitude],
            animationDuration: 300,
            animationMode: 'easeTo',
        });
    }, [followDriver, location]);

    const availableOrders = useMemo(() => {
        const orders = (data as any)?.orders ?? [];
        return orders.filter((order: any) => {
            if (order.status !== 'READY') return false;
            return !order.driver?.id;
        });
    }, [data]);

    const allMapOrders = useMemo(
        () => [...assignedOrders, ...availableOrders],
        [assignedOrders, availableOrders],
    );

    // ── Focused order object ──
    const focusedOrder = useMemo(
        () => allMapOrders.find((o: any) => o.id === focusedOrderId) ?? null,
        [allMapOrders, focusedOrderId],
    );

    // ── Fetch route when focused order changes ──
    const locationRef = useRef(location);
    locationRef.current = location;
    const hasLocation = Boolean(location);

    useEffect(() => {
        let cancelled = false;

        const fetchRoutes = async () => {
            const loc = locationRef.current;
            if (!focusedOrder || !loc) {
                if (!focusedOrder) {
                    setRouteCoords(null);
                    setPreviewRouteCoords(null);
                    setRouteInfo(null);
                    setPreviewRouteInfo(null);
                }
                return;
            }

            const bizLoc = focusedOrder.businesses?.[0]?.business?.location;
            const dropLoc = focusedOrder.dropOffLocation;
            if (!bizLoc) return;

            const driverCoord = { latitude: loc.latitude, longitude: loc.longitude };
            const pickupCoord = { latitude: Number(bizLoc.latitude), longitude: Number(bizLoc.longitude) };
            const dropoffCoord = dropLoc
                ? { latitude: Number(dropLoc.latitude), longitude: Number(dropLoc.longitude) }
                : null;

            if (focusedOrder.status === 'OUT_FOR_DELIVERY' && dropoffCoord) {
                const result = await fetchRouteGeometry(driverCoord, dropoffCoord);
                if (!cancelled && result) {
                    setRouteCoords(result.coordinates);
                    setRouteInfo({ distanceKm: result.distanceKm, durationMin: result.durationMin });
                }
            } else {
                const result = await fetchRouteGeometry(driverCoord, pickupCoord);
                if (!cancelled && result) {
                    setRouteCoords(result.coordinates);
                    setRouteInfo({ distanceKm: result.distanceKm, durationMin: result.durationMin });
                }
                if (dropoffCoord) {
                    const preview = await fetchRouteGeometry(pickupCoord, dropoffCoord);
                    if (!cancelled && preview) {
                        setPreviewRouteCoords(preview.coordinates);
                        setPreviewRouteInfo({ distanceKm: preview.distanceKm, durationMin: preview.durationMin });
                    }
                }
            }
        };

        fetchRoutes();
        return () => { cancelled = true; };
    }, [focusedOrder?.id, focusedOrder?.status, hasLocation]);

    // ── GeoJSON shapes for route lines ──
    const routeShape = useMemo<Feature<LineString> | null>(() => {
        const coords = routeCoords;
        if (!coords || coords.length < 2) return null;
        return {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: coords },
        };
    }, [routeCoords]);

    const previewRouteShape = useMemo<Feature<LineString> | null>(() => {
        if (!previewRouteCoords || previewRouteCoords.length < 2) return null;
        return {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: previewRouteCoords },
        };
    }, [previewRouteCoords]);

    // ── Focus on an order: fly camera to its pickup location ──
    const focusOrder = useCallback((order: any) => {
        const bizLoc = order.businesses?.[0]?.business?.location;
        const dropLoc = order.dropOffLocation;

        setFocusedOrderId(order.id);

        // OUT_FOR_DELIVERY: show driver + dropoff only
        if (order.status === 'OUT_FOR_DELIVERY' && dropLoc && location) {
            const lats = [Number(dropLoc.latitude), location.latitude];
            const lngs = [Number(dropLoc.longitude), location.longitude];
            const ne: [number, number] = [Math.max(...lngs) + 0.005, Math.max(...lats) + 0.005];
            const sw: [number, number] = [Math.min(...lngs) - 0.005, Math.min(...lats) - 0.005];

            cameraRef.current?.fitBounds(ne, sw, [60, 60, 120, 60], 1200);
        } else if (bizLoc && dropLoc && location) {
            // Not delivering yet: show driver + pickup + dropoff (3 points)
            const lats = [location.latitude, Number(bizLoc.latitude), Number(dropLoc.latitude)];
            const lngs = [location.longitude, Number(bizLoc.longitude), Number(dropLoc.longitude)];
            const ne: [number, number] = [Math.max(...lngs) + 0.005, Math.max(...lats) + 0.005];
            const sw: [number, number] = [Math.min(...lngs) - 0.005, Math.min(...lats) - 0.005];

            cameraRef.current?.fitBounds(ne, sw, [60, 60, 120, 60], 1200);
        } else if (bizLoc) {
            cameraRef.current?.setCamera({
                centerCoordinate: [Number(bizLoc.longitude), Number(bizLoc.latitude)],
                zoomLevel: 15.5,
                animationMode: 'flyTo',
                animationDuration: 1200,
            });
        }
    }, [location]);

    const toggleFollowDriver = useCallback(() => {
        if (followDriver) {
            setFollowDriver(false);
        } else {
            setFollowDriver(true);
            if (location) {
                cameraRef.current?.setCamera({
                    centerCoordinate: [location.longitude, location.latitude],
                    animationDuration: 600,
                });
            }
        }
    }, [followDriver, location]);

    // ── Launch Mapbox Navigation SDK ──
    const handleStartNavigation = useCallback(() => {
        if (!focusedOrder || !location) return;
        const bizLoc = focusedOrder.businesses?.[0]?.business?.location;
        const dropLoc = focusedOrder.dropOffLocation;
        if (!bizLoc) return;

        const pickup = {
            latitude: Number(bizLoc.latitude),
            longitude: Number(bizLoc.longitude),
            label: focusedOrder.businesses?.[0]?.business?.name ?? 'Pickup',
        };
        const dropoff = dropLoc
            ? {
                latitude: Number(dropLoc.latitude),
                longitude: Number(dropLoc.longitude),
                label: dropLoc.address ?? 'Drop-off',
            }
            : null;
        const customerName = focusedOrder.user
            ? `${focusedOrder.user.firstName} ${focusedOrder.user.lastName}`
            : 'Customer';

        const navOrder = {
            id: focusedOrder.id,
            status: focusedOrder.status,
            businessName: focusedOrder.businesses?.[0]?.business?.name ?? 'Business',
            customerName,
            pickup,
            dropoff,
        };

        const phase: NavigationPhase =
            focusedOrder.status === 'OUT_FOR_DELIVERY' ? 'to_dropoff' : 'to_pickup';

        const origin = { latitude: location.latitude, longitude: location.longitude };
        startNavigation(navOrder, phase, origin);
        router.push('/navigation' as any);
    }, [focusedOrder, location, startNavigation, router]);

    // ── Initial camera center ──
    const initialCenter = useMemo<[number, number]>(() => {
        if (location) return [location.longitude, location.latitude];
        return GJILAN_CENTER;
    }, []);

    // Dismiss focused order when tapping elsewhere
    const dismissFocusedOrder = useCallback(() => {
        setFocusedOrderId(null);
    }, []);

    return (
        <View style={styles.container}>
            {/* ═══ Full-screen Map ═══ */}
            <Mapbox.MapView
                style={styles.map}
                styleURL={MAP_STYLE}
                logoEnabled={false}
                attributionEnabled={false}
                scaleBarEnabled={false}
                onTouchEnd={handleMapTouchEnd}
            >
                <Mapbox.Camera
                    ref={cameraRef}
                    defaultSettings={{
                        centerCoordinate: initialCenter,
                        zoomLevel: location ? 14.5 : 13.5,
                    }}
                    maxBounds={{
                        ne: GJILAN_NE,
                        sw: GJILAN_SW,
                    }}
                    {...(followDriver && location ? {
                        centerCoordinate: [location.longitude, location.latitude],
                        animationDuration: 300,
                        animationMode: 'easeTo' as const,
                    } : {})}
                />

                {/* ── Preview route (pickup → dropoff, dashed) ── */}
                {previewRouteShape && (
                    <Mapbox.ShapeSource id="preview-route-source" shape={previewRouteShape}>
                        <Mapbox.LineLayer
                            id="preview-route-line"
                            style={{
                                lineColor: '#F59E0B',
                                lineWidth: ['interpolate', ['linear'], ['zoom'],
                                    10, 1,
                                    13, 2,
                                    15, 4,
                                    17, 6,
                                    19, 8,
                                ] as any,
                                lineOpacity: 0.5,
                                lineDasharray: [2, 3],
                                lineCap: 'round' as const,
                                lineJoin: 'round' as const,
                            }}
                        />
                    </Mapbox.ShapeSource>
                )}

                {/* ── Active route (driver → destination, solid) ── */}
                {routeShape && (
                    <Mapbox.ShapeSource id="active-route-source" shape={routeShape}>
                        <Mapbox.LineLayer
                            id="active-route-casing"
                            style={{
                                lineColor: '#ffffff',
                                lineWidth: ['interpolate', ['linear'], ['zoom'],
                                    10, 2,
                                    13, 4,
                                    15, 8,
                                    17, 14,
                                    19, 20,
                                ] as any,
                                lineOpacity: 0.85,
                                lineCap: 'round' as const,
                                lineJoin: 'round' as const,
                            }}
                        />
                        <Mapbox.LineLayer
                            id="active-route-line"
                            style={{
                                lineColor: focusedOrder?.status === 'OUT_FOR_DELIVERY' ? '#8B5CF6' : '#4285F4',
                                lineWidth: ['interpolate', ['linear'], ['zoom'],
                                    10, 1.5,
                                    13, 3,
                                    15, 6,
                                    17, 10,
                                    19, 14,
                                ] as any,
                                lineOpacity: 0.95,
                                lineCap: 'round' as const,
                                lineJoin: 'round' as const,
                            }}
                        />
                    </Mapbox.ShapeSource>
                )}

                {/* Driver position */}
                {location && (
                    <Mapbox.PointAnnotation
                        id="driver-location"
                        coordinate={[location.longitude, location.latitude]}
                    >
                        <View style={styles.driverDot} />
                    </Mapbox.PointAnnotation>
                )}

                {/* Order markers */}
                {allMapOrders.map((order: any) => {
                    const statusColor = STATUS_COLORS[order.status] ?? '#6B7280';
                    const isAssigned = order.driver?.id === currentDriverId;
                    const isFocused = order.id === focusedOrderId;
                    const bizLoc = order.businesses?.[0]?.business?.location;
                    const dropLoc = order.dropOffLocation;
                    const markerScale = isFocused ? 1.25 : 1;

                    return (
                        <React.Fragment key={order.id}>
                            {bizLoc && (
                                <Mapbox.PointAnnotation
                                    id={`pickup-${order.id}`}
                                    coordinate={[Number(bizLoc.longitude), Number(bizLoc.latitude)]}
                                    anchor={{ x: 0.5, y: 1 }}
                                    onSelected={() => focusOrder(order)}
                                >
                                    <View style={[styles.markerContainer, { transform: [{ scale: markerScale }] }]}>
                                        <View style={[
                                            styles.pickupMarker,
                                            {
                                                backgroundColor: statusColor,
                                                opacity: isAssigned ? 1 : 0.5,
                                                borderColor: isFocused ? '#fff' : '#ffffffaa',
                                                borderWidth: isFocused ? 3 : 2,
                                            },
                                        ]}>
                                            <Text style={styles.markerEmoji}>🏪</Text>
                                        </View>
                                        <View style={[styles.markerTip, { borderTopColor: statusColor }]} />
                                    </View>
                                    <Mapbox.Callout title={`${order.businesses[0].business.name} · ${STATUS_LABELS[order.status] ?? order.status}`} />
                                </Mapbox.PointAnnotation>
                            )}

                            {isAssigned && dropLoc && (
                                <Mapbox.PointAnnotation
                                    id={`dropoff-${order.id}`}
                                    coordinate={[Number(dropLoc.longitude), Number(dropLoc.latitude)]}
                                    anchor={{ x: 0.5, y: 1 }}
                                    onSelected={() => focusOrder(order)}
                                >
                                    <View style={[styles.markerContainer, { transform: [{ scale: markerScale }] }]}>
                                        <View style={[
                                            styles.dropoffMarker,
                                            {
                                                borderColor: statusColor,
                                                borderWidth: isFocused ? 3 : 2.5,
                                            },
                                        ]}>
                                            <Text style={styles.markerEmoji}>📍</Text>
                                        </View>
                                        <View style={[styles.markerTip, { borderTopColor: statusColor }]} />
                                    </View>
                                    <Mapbox.Callout title={dropLoc.address ?? 'Drop-off'} />
                                </Mapbox.PointAnnotation>
                            )}
                        </React.Fragment>
                    );
                })}
            </Mapbox.MapView>

            {/* ═══ Right-side buttons ═══ */}
            <View style={[styles.rightButtons, { bottom: focusedOrder ? 100 + insets.bottom : 20 + insets.bottom }]}>
                {/* Lock camera button */}
                <Pressable
                    style={[styles.mapBtn, followDriver && styles.mapBtnActive]}
                    onPress={toggleFollowDriver}
                >
                    <Ionicons
                        name={followDriver ? 'lock-closed' : 'lock-open-outline'}
                        size={20}
                        color={followDriver ? '#4285F4' : '#6B7280'}
                    />
                </Pressable>

                {/* Recenter button */}
                <Pressable
                    style={styles.mapBtn}
                    onPress={recenterOnDriver}
                >
                    <Ionicons name="locate" size={22} color="#4285F4" />
                </Pressable>
            </View>

            {/* ═══ Discord-style order avatars (right side) ═══ */}
            {allMapOrders.length > 0 && (
                <View style={[styles.avatarSidebar, { top: insets.top + 80 }]}>
                    {allMapOrders.map((order: any) => {
                        const statusColor = STATUS_COLORS[order.status] ?? '#6B7280';
                        const isFocused = order.id === focusedOrderId;
                        const iconName = STATUS_ICONS[order.status] ?? 'ellipse-outline';
                        const bizName = order.businesses?.[0]?.business?.name ?? '?';
                        const initial = bizName.charAt(0).toUpperCase();

                        return (
                            <Pressable
                                key={order.id}
                                onPress={() => focusOrder(order)}
                                onLongPress={() => focusOrder(order)}
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

            {/* ═══ Focused order bottom bar ═══ */}
            {focusedOrder && (() => {
                const statusColor = STATUS_COLORS[focusedOrder.status] ?? '#6B7280';
                const bizName = focusedOrder.businesses?.[0]?.business?.name ?? 'Unknown';
                const isAssigned = focusedOrder.driver?.id === currentDriverId;
                const customerName = focusedOrder.user
                    ? `${focusedOrder.user.firstName} ${focusedOrder.user.lastName}`
                    : 'Customer';
                const iconName = STATUS_ICONS[focusedOrder.status] ?? 'ellipse-outline';

                return (
                    <View style={[styles.focusedBar, { paddingBottom: insets.bottom + 8, backgroundColor: statusColor }]}>
                        <View style={[styles.focusedStatusDot, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                            <Ionicons name={iconName as any} size={16} color="#fff" />
                        </View>
                        <View style={styles.focusedInfo}>
                            <Text style={[styles.focusedBiz, { color: '#fff' }]} numberOfLines={1}>
                                {bizName}
                            </Text>
                            <Text style={[styles.focusedMeta, { color: 'rgba(255,255,255,0.75)' }]} numberOfLines={1}>
                                {isAssigned
                                    ? `${STATUS_LABELS[focusedOrder.status]} · ${customerName}`
                                    : 'Available to claim'}
                            </Text>
                            {/* Route distances */}
                            {routeInfo && (
                                <View style={styles.focusedRouteRows}>
                                    <View style={styles.focusedRouteRow}>
                                        <Ionicons
                                            name={focusedOrder.status === 'OUT_FOR_DELIVERY' ? 'flag' : 'restaurant'}
                                            size={12}
                                            color="rgba(255,255,255,0.85)"
                                        />
                                        <Text style={[styles.focusedRouteText, { color: '#fff' }]}>
                                            {routeInfo.distanceKm.toFixed(1)} km · {Math.ceil(routeInfo.durationMin)} min
                                        </Text>
                                        <Text style={[styles.focusedRouteLabel, { color: 'rgba(255,255,255,0.7)' }]}>
                                            {focusedOrder.status === 'OUT_FOR_DELIVERY' ? '→ Dropoff' : '→ Pickup'}
                                        </Text>
                                    </View>
                                    {focusedOrder.status !== 'OUT_FOR_DELIVERY' && previewRouteInfo && (
                                        <View style={styles.focusedRouteRow}>
                                            <Ionicons name="flag" size={12} color="rgba(255,255,255,0.6)" />
                                            <Text style={[styles.focusedRouteTextSm, { color: 'rgba(255,255,255,0.7)' }]}>
                                                {previewRouteInfo.distanceKm.toFixed(1)} km · {Math.ceil(previewRouteInfo.durationMin)} min
                                            </Text>
                                            <Text style={[styles.focusedRouteLabel, { color: 'rgba(255,255,255,0.6)' }]}>
                                                → Dropoff
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                        <Pressable
                            style={[styles.focusedNavBtn, { backgroundColor: 'rgba(255,255,255,0.25)' }]}
                            onPress={handleStartNavigation}
                            hitSlop={8}
                        >
                            <Ionicons name="navigate" size={20} color="#fff" />
                        </Pressable>
                        <Pressable
                            style={styles.focusedCloseBtn}
                            onPress={dismissFocusedOrder}
                            hitSlop={8}
                        >
                            <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
                        </Pressable>
                    </View>
                );
            })()}

            {/* Loading */}
            {loading && !data && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },

    /* ── Driver marker ── */
    driverDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#4285F4',
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 6,
    },

    /* ── Order markers ── */
    markerContainer: {
        alignItems: 'center',
    },
    pickupMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    dropoffMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    markerEmoji: {
        fontSize: 14,
    },
    markerTip: {
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 7,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -1,
    },

    /* ── Right-side buttons ── */
    rightButtons: {
        position: 'absolute',
        right: 16,
        alignItems: 'center',
        gap: 10,
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
    mapBtnActive: {
        backgroundColor: '#EFF6FF',
        borderWidth: 1.5,
        borderColor: '#4285F4',
    },

    /* ── Discord-style avatar sidebar ── */
    avatarSidebar: {
        position: 'absolute',
        right: 12,
        alignItems: 'center',
        gap: 10,
        zIndex: 10,
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

    /* ── Focused order bottom bar ── */
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
        overflow: 'hidden',
    },
    focusedStatusDot: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    focusedInfo: {
        flex: 1,
    },
    focusedBiz: {
        fontSize: 15,
        fontWeight: '700',
    },
    focusedMeta: {
        fontSize: 12,
        marginTop: 2,
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
    },
    focusedRouteTextSm: {
        fontSize: 12,
        fontWeight: '600',
    },
    focusedRouteLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    focusedNavBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
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
