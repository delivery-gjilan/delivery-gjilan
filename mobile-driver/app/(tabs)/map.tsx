import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Alert, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Mapbox from '@rnmapbox/maps';
import Svg, { Path, Circle } from 'react-native-svg';
import { useApolloClient, useMutation, useQuery, useSubscription } from '@apollo/client/react';
import { GET_ORDERS, ALL_ORDERS_UPDATED, ASSIGN_DRIVER_TO_ORDER } from '@/graphql/operations/orders';
import { OrderAcceptSheet } from '@/components/OrderAcceptSheet';
import { OrderDetailSheet } from '@/components/OrderDetailSheet';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { useNavigationStore } from '@/store/navigationStore';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import type { NavigationPhase } from '@/store/navigationStore';
import { Ionicons } from '@expo/vector-icons';
import { fetchRouteGeometry } from '@/utils/mapbox';
import type { Feature, LineString } from 'geojson';

/* ─── Constants ─── */
const GJILAN_CENTER: [number, number] = [21.4694, 42.4635];
const GJILAN_NE: [number, number] = [21.51, 42.50];
const GJILAN_SW: [number, number] = [21.42, 42.43];

// Marching-ants dash sequence (7-frame, 7-unit cycle — matches Mapbox examples)
const DASH_SEQ: number[][] = [
    [3, 4],
    [0, 1, 3, 3],
    [0, 2, 3, 2],
    [0, 3, 3, 1],
    [0, 4, 3],
    [1, 4, 2],
    [2, 4, 1],
];

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
    const apolloClient = useApolloClient();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const mapStyle = colorScheme === 'dark'
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/light-v11';
    const currentDriverId = useAuthStore((state) => state.user?.id);
    const startNavigation = useNavigationStore((s) => s.startNavigation);
    const cameraRef = useRef<Mapbox.Camera>(null);

    const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
    const isOnline = useAuthStore((state) => state.isOnline);
    const connectionStatus = useAuthStore((state) => state.connectionStatus);
    const { dispatchModeEnabled } = useStoreStatus();

    const [acceptSheetOrder, setAcceptSheetOrder] = useState<any>(null);
    const skippedIds = useRef(new Set<string>());
    const [accepting, setAccepting] = useState(false);
    const [assignDriver] = useMutation(ASSIGN_DRIVER_TO_ORDER);

    // ── Route state ──
    const [routeCoords, setRouteCoords] = useState<Array<[number, number]> | null>(null);
    const [previewRouteCoords, setPreviewRouteCoords] = useState<Array<[number, number]> | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
    const [previewRouteInfo, setPreviewRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

    // ── Marching-ants animation for preview route ──
    const [dashStep, setDashStep] = useState(0);
    useEffect(() => {
        if (!previewRouteCoords) { setDashStep(0); return; }
        const id = setInterval(() => setDashStep(s => (s + 1) % DASH_SEQ.length), 100);
        return () => clearInterval(id);
    }, [!!previewRouteCoords]);

    // ── Orders query + real-time subscription ──
    const { data, loading, refetch } = useQuery(GET_ORDERS, {
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
        // In dispatch mode the admin assigns orders manually — hide all available pins
        if (dispatchModeEnabled) return [];
        const orders = (data as any)?.orders ?? [];
        return orders.filter((order: any) => {
            if (order.status !== 'READY') return false;
            return !order.driver?.id;
        });
    }, [data, dispatchModeEnabled]);

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

    // ── Auto-refit camera when a focused order's status changes ──
    const prevFocusedStatusRef = useRef<string | null>(null);
    useEffect(() => {
        if (!focusedOrder) {
            prevFocusedStatusRef.current = null;
            return;
        }
        if (prevFocusedStatusRef.current === focusedOrder.status) return;
        prevFocusedStatusRef.current = focusedOrder.status;
        // Small delay so route coords from the sibling effect are ready
        const t = setTimeout(() => focusOrder(focusedOrder), 400);
        return () => clearTimeout(t);
    }, [focusedOrder?.status, focusedOrder?.id]);

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

            cameraRef.current?.fitBounds(ne, sw, [70, 20, 440, 20], 1200);
        } else if (bizLoc && dropLoc && location) {
            // Not delivering yet: show driver + pickup + dropoff (3 points)
            const lats = [location.latitude, Number(bizLoc.latitude), Number(dropLoc.latitude)];
            const lngs = [location.longitude, Number(bizLoc.longitude), Number(dropLoc.longitude)];
            const ne: [number, number] = [Math.max(...lngs) + 0.005, Math.max(...lats) + 0.005];
            const sw: [number, number] = [Math.min(...lngs) - 0.005, Math.min(...lats) - 0.005];

            cameraRef.current?.fitBounds(ne, sw, [70, 20, 440, 20], 1200);
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

    // ── Accept an available order ──
    const handleAcceptOrder = useCallback(async (orderId: string) => {
        if (!currentDriverId) return;
        setAccepting(true);
        try {
            await assignDriver({ variables: { id: orderId, driverId: currentDriverId } });
            const order = acceptSheetOrder;
            const bizLoc = order?.businesses?.[0]?.business?.location;
            const dropLoc = order?.dropOffLocation;
            const pickup = bizLoc
                ? {
                    latitude: Number(bizLoc.latitude),
                    longitude: Number(bizLoc.longitude),
                    label: order.businesses?.[0]?.business?.name ?? 'Pickup',
                  }
                : null;
            const dropoff = dropLoc
                ? {
                    latitude: Number(dropLoc.latitude),
                    longitude: Number(dropLoc.longitude),
                    label: dropLoc.address ?? 'Drop-off',
                  }
                : null;
            if (pickup && location) {
                const navOrder = {
                    id: orderId,
                    status: 'READY',
                    businessName: order.businesses?.[0]?.business?.name ?? '',
                    customerName: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Customer',
                    pickup,
                    dropoff,
                };
                startNavigation(navOrder, 'to_pickup', location);
            }
            setAcceptSheetOrder(null);
            router.push('/navigation' as any);
        } catch {
            Alert.alert('Error', 'Failed to accept order. Please try again.');
        } finally {
            setAccepting(false);
        }
    }, [acceptSheetOrder, currentDriverId, location, assignDriver, startNavigation, router]);

    const handleSkipOrder = useCallback(() => {
        if (acceptSheetOrder) skippedIds.current.add(acceptSheetOrder.id);
        setAcceptSheetOrder(null);
    }, [acceptSheetOrder]);

    // ── Auto-present the accept sheet when a new available order appears ──
    useEffect(() => {
        if (!isOnline || acceptSheetOrder || dispatchModeEnabled) return;
        const next = availableOrders.find((o: any) => !skippedIds.current.has(o.id));
        if (!next) return;
        setAcceptSheetOrder(next);
        const bizLoc = next.businesses?.[0]?.business?.location;
        if (!bizLoc || !cameraRef.current) return;
        if (location) {
            const lats = [Number(bizLoc.latitude), location.latitude];
            const lngs = [Number(bizLoc.longitude), location.longitude];
            const ne: [number, number] = [Math.max(...lngs) + 0.006, Math.max(...lats) + 0.006];
            const sw: [number, number] = [Math.min(...lngs) - 0.006, Math.min(...lats) - 0.006];
            cameraRef.current.fitBounds(ne, sw, [80, 20, 420, 20], 900);
        } else {
            cameraRef.current.setCamera({
                centerCoordinate: [Number(bizLoc.longitude), Number(bizLoc.latitude)],
                zoomLevel: 14.5,
                animationMode: 'flyTo',
                animationDuration: 900,
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableOrders.length, isOnline]);

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
                styleURL={mapStyle}
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

                {/* ── Preview route (pickup → dropoff, marching ants) ── */}
                {previewRouteShape && (
                    <Mapbox.ShapeSource id="preview-route-source" shape={previewRouteShape}>
                        <Mapbox.LineLayer
                            id="preview-route-line"
                            style={{
                                lineColor: '#F59E0B',
                                lineWidth: ['interpolate', ['linear'], ['zoom'],
                                    10, 1.5,
                                    13, 2.5,
                                    15, 4,
                                    17, 6,
                                    19, 8,
                                ] as any,
                                lineOpacity: 0.75,
                                lineDasharray: DASH_SEQ[dashStep] as any,
                                lineCap: 'round' as const,
                                lineJoin: 'round' as const,
                            }}
                        />
                    </Mapbox.ShapeSource>
                )}

                {/* ── Active route (driver → destination) ── */}
                {routeShape && (
                    <Mapbox.ShapeSource id="active-route-source" shape={routeShape}>
                        {/* Layer 1: neon glow bloom */}
                        <Mapbox.LineLayer
                            id="active-route-glow"
                            style={{
                                lineColor: focusedOrder?.status === 'OUT_FOR_DELIVERY' ? '#8B5CF6' : '#4285F4',
                                lineWidth: ['interpolate', ['linear'], ['zoom'],
                                    10, 8,
                                    13, 16,
                                    15, 28,
                                    17, 40,
                                    19, 54,
                                ] as any,
                                lineOpacity: 0.1,
                                lineBlur: 8,
                                lineCap: 'round' as const,
                                lineJoin: 'round' as const,
                            }}
                        />
                        {/* Layer 2: white casing */}
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
                                lineOpacity: 0.9,
                                lineCap: 'round' as const,
                                lineJoin: 'round' as const,
                            }}
                        />
                        {/* Layer 3: coloured fill */}
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
                                lineOpacity: 0.97,
                                lineCap: 'round' as const,
                                lineJoin: 'round' as const,
                            }}
                        />
                    </Mapbox.ShapeSource>
                )}

                {/* Driver position — heading wedge + dot */}
                {location && (
                    <Mapbox.PointAnnotation
                        id="driver-location"
                        coordinate={[location.longitude, location.latitude]}
                    >
                        <View style={styles.driverMarkerWrapper}>
                            <Svg width={52} height={52} style={StyleSheet.absoluteFill}>
                                {/* Accuracy halo */}
                                <Circle cx={26} cy={26} r={22} fill="rgba(66,133,244,0.12)" />
                                {/* Heading wedge — rotates to show direction */}
                                <Path
                                    d="M26 26 L20 6 A20 20 0 0 1 32 6 Z"
                                    fill="rgba(66,133,244,0.45)"
                                    transform={`rotate(${location.heading ?? 0}, 26, 26)`}
                                />
                            </Svg>
                            {/* Blue dot */}
                            <View style={styles.driverDot} />
                        </View>
                    </Mapbox.PointAnnotation>
                )}

                {/* Order markers */}
                {allMapOrders.map((order: any) => {
                    const statusColor = STATUS_COLORS[order.status] ?? '#6B7280';
                    const isAssigned = order.driver?.id === currentDriverId;
                    const isFocused = order.id === focusedOrderId;
                    const bizLoc = order.businesses?.[0]?.business?.location;
                    const dropLoc = order.dropOffLocation;
                    const markerScale = isFocused ? 1.2 : 1;
                    const bizName = order.businesses?.[0]?.business?.name ?? '?';
                    const bizLabel = bizName.length > 11 ? bizName.slice(0, 11) + '…' : bizName;

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
                                        {/* Flat pill badge */}
                                        <View style={[
                                            styles.pickupPill,
                                            {
                                                backgroundColor: statusColor,
                                                opacity: isAssigned ? 1 : 0.6,
                                                borderWidth: isFocused ? 2.5 : 0,
                                                borderColor: '#fff',
                                                shadowColor: statusColor,
                                                shadowOpacity: isFocused ? 0.55 : 0.3,
                                            },
                                        ]}>
                                            <Ionicons name="storefront-outline" size={12} color="#fff" />
                                            <Text style={styles.pickupPillText}>{bizLabel}</Text>
                                        </View>
                                        <View style={[styles.markerTip, { borderTopColor: statusColor, opacity: isAssigned ? 1 : 0.6 }]} />
                                    </View>
                                    <Mapbox.Callout title={`${bizName} · ${STATUS_LABELS[order.status] ?? order.status}`} />
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
                                                shadowColor: statusColor,
                                                shadowOpacity: isFocused ? 0.5 : 0.2,
                                            },
                                        ]}>
                                            <Ionicons name="person" size={14} color={statusColor} />
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
            <View style={[styles.rightButtons, { bottom: (focusedOrder || acceptSheetOrder) ? 420 + insets.bottom : 20 + insets.bottom }]}>
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

            {/* ═══ Connection status pill ═══ */}
            {(() => {
                const connColor =
                    connectionStatus === 'CONNECTED' ? '#22c55e' :
                    connectionStatus === 'STALE' ? '#f59e0b' : '#ef4444';
                const connLabel =
                    connectionStatus === 'CONNECTED' ? (isOnline ? 'Online' : 'Offline') :
                    connectionStatus === 'STALE' ? 'Weak signal' :
                    connectionStatus === 'LOST' ? 'Signal lost' : 'Offline';
                return (
                    <View style={[styles.connPill, { top: insets.top + 12 }]}>
                        <View style={[styles.connDot, { backgroundColor: connColor }]} />
                        <Text style={styles.connPillText}>{connLabel}</Text>
                    </View>
                );
            })()}

            {/* ═══ Order detail sheet ═══ */}
            {focusedOrder && (
                <OrderDetailSheet
                    order={focusedOrder}
                    routeInfo={routeInfo}
                    previewRouteInfo={previewRouteInfo}
                    isAssignedToMe={focusedOrder.driver?.id === currentDriverId}
                    onStartNavigation={handleStartNavigation}
                    onClose={dismissFocusedOrder}
                />
            )}

            {/* ═══ Accept sheet ═══ */}
            {acceptSheetOrder && !focusedOrder && (
                <OrderAcceptSheet
                    order={acceptSheetOrder}
                    onAccept={handleAcceptOrder}
                    onSkip={handleSkipOrder}
                    accepting={accepting}
                />
            )}

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

    /* ── Connection pill ── */
    connPill: {
        position: 'absolute',
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        zIndex: 20,
    },
    connDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    connPillText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },

    /* ── Driver marker ── */
    driverMarkerWrapper: {
        width: 52,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    driverDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#4285F4',
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#4285F4',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 8,
    },

    /* ── Order markers ── */
    markerContainer: {
        alignItems: 'center',
    },
    pickupPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        elevation: 6,
    },
    pickupPillText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    dropoffMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
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

    /* ── Loading ── */
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
});
