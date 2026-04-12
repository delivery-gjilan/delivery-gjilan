import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, Pressable, Alert, ActionSheetIOS, Platform, Linking, useColorScheme, Animated, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Mapbox from '@rnmapbox/maps';

import { useMutation } from '@apollo/client/react';
import { UPDATE_ORDER_STATUS } from '@/graphql/operations/orders';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { useNavigationStore } from '@/store/navigationStore';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { Ionicons } from '@expo/vector-icons';
import { fetchRouteGeometry } from '@/utils/mapbox';
import { buildNavOrder, orderToPhase } from '@/utils/orderToNavOrder';
import { useOrderAcceptStore } from '@/store/orderAcceptStore';
import { useTranslations } from '@/hooks/useTranslations';
import { useSharedOrderAccept } from '@/hooks/GlobalOrderAcceptContext';
import type { Feature, LineString } from 'geojson';

/* â”€â”€â”€ Constants â”€â”€â”€ */
const BOTTOM_BAR_HEIGHT = 108;
const GJILAN_CENTER: [number, number] = [21.4694, 42.4635];
const GJILAN_NE: [number, number] = [21.51, 42.50];
const GJILAN_SW: [number, number] = [21.42, 42.43];

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

export default function MapScreen() {
    const { t } = useTranslations();
    const STATUS_LABELS: Record<string, string> = {
        PENDING: t.map.status_pending,
        PREPARING: t.map.status_preparing,
        READY: t.map.status_ready,
        OUT_FOR_DELIVERY: t.map.status_delivering,
    };
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const mapStyle = colorScheme === 'dark'
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/light-v11';
    const currentDriverId = useAuthStore((state) => state.user?.id);
    const hasHydrated = useAuthStore((state) => state.hasHydrated);
    const startNavigation = useNavigationStore((s) => s.startNavigation);
    const cameraRef = useRef<Mapbox.Camera>(null);

    const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
    const isOnline = useAuthStore((state) => state.isOnline);
    const connectionStatus = useAuthStore((state) => state.connectionStatus);
    const { dispatchModeEnabled, googleMapsNavEnabled, inventoryModeEnabled } = useStoreStatus();

    const [markingPickedUpIds, setMarkingPickedUpIds] = useState<Set<string>>(new Set());
    const [nowTs, setNowTs] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNowTs(Date.now()), 10_000);
        return () => clearInterval(id);
    }, []);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const assignedOrdersLenRef = useRef(0);
    const readyPulse = useRef(new Animated.Value(1)).current;
    const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS);
    const pendingOrder = useOrderAcceptStore((s) => s.pendingOrder);
    const pendingAutoCountdown = useOrderAcceptStore((s) => s.autoCountdown);
    const { orders, assignedOrders, availableOrders, isOrdersBootstrapping } = useSharedOrderAccept();

    // â”€â”€ Route state â”€â”€
    const [routeCoords, setRouteCoords] = useState<Array<[number, number]> | null>(null);
    const [previewRouteCoords, setPreviewRouteCoords] = useState<Array<[number, number]> | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
    const [previewRouteInfo, setPreviewRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

    // â”€â”€ Adaptive GPS interval based on activity â”€â”€
    const hasActiveNavigation = useMemo(() => {
        return assignedOrders.some((order: any) =>
            order.status === 'READY' || order.status === 'OUT_FOR_DELIVERY'
        );
    }, [assignedOrders]);

    const gpsInterval = hasActiveNavigation ? 1000 : 5000;

    // â”€â”€ Driver location â”€â”€
    const { location, permissionGranted } = useDriverLocation({
        smoothing: true,
        timeInterval: gpsInterval,
        distanceFilter: hasActiveNavigation ? 5 : 10,
    });

    // â”€â”€ Camera follow â”€â”€
    const [followDriver, setFollowDriver] = useState(false);

    const centerCameraOnDriver = useCallback((enableFollow: boolean) => {
        if (!location) return;

        if (enableFollow) {
            setFollowDriver(true);
        }

        cameraRef.current?.setCamera({
            centerCoordinate: [location.longitude, location.latitude],
            bearing: hasActiveNavigation ? (location.heading ?? 0) : 0,
            zoomLevel: hasActiveNavigation ? 16 : 14.5,
            animationDuration: 600,
            animationMode: 'easeTo',
        });
    }, [location, hasActiveNavigation]);

    const recenterOnDriver = useCallback(() => {
        centerCameraOnDriver(true);
    }, [centerCameraOnDriver]);

    const handleMapTouchEnd = useCallback(() => {
        if (!followDriver || !location) return;
        cameraRef.current?.setCamera({
            centerCoordinate: [location.longitude, location.latitude],
            bearing: location.heading ?? 0,
            animationDuration: 300,
            animationMode: 'easeTo',
        });
    }, [followDriver, location]);

    const allMapOrders = useMemo(
        () => [...assignedOrders, ...availableOrders],
        [assignedOrders, availableOrders],
    );

    const isInitialOrdersLoading = hasHydrated && !!currentDriverId && isOrdersBootstrapping;

    // â”€â”€ Focused order object â”€â”€
    const focusedOrder = useMemo(
        () => allMapOrders.find((o: any) => o.id === focusedOrderId) ?? null,
        [allMapOrders, focusedOrderId],
    );

    // â”€â”€ Fetch route when focused order changes â”€â”€
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
                // Clear the pickupâ†’dropoff preview â€” not needed while delivering
                if (!cancelled) {
                    setPreviewRouteCoords(null);
                    setPreviewRouteInfo(null);
                }
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

    // â”€â”€ Auto-refit camera when a focused order's status changes â”€â”€
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

    // â”€â”€ GeoJSON shapes for route lines â”€â”€
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

    // â”€â”€ Focus on an order: fly camera to its pickup location â”€â”€
    const focusOrder = useCallback((order: any) => {
        const bizLoc = order.businesses?.[0]?.business?.location;
        const dropLoc = order.dropOffLocation;

        setFocusedOrderId(order.id);

        if (followDriver) {
            return;
        }

        // Padding: respect the info sheet at top and card bar at bottom
        const padTop = 20;
        const padBottom = BOTTOM_BAR_HEIGHT + 20;

        // OUT_FOR_DELIVERY: show driver + dropoff only
        if (order.status === 'OUT_FOR_DELIVERY' && dropLoc && location) {
            const lats = [Number(dropLoc.latitude), location.latitude];
            const lngs = [Number(dropLoc.longitude), location.longitude];
            const ne: [number, number] = [Math.max(...lngs) + 0.005, Math.max(...lats) + 0.005];
            const sw: [number, number] = [Math.min(...lngs) - 0.005, Math.min(...lats) - 0.005];

            cameraRef.current?.fitBounds(ne, sw, [padTop, 20, padBottom, 20], 1200);
        } else if (bizLoc && dropLoc && location) {
            // Not delivering yet: show driver + pickup + dropoff (3 points)
            const lats = [location.latitude, Number(bizLoc.latitude), Number(dropLoc.latitude)];
            const lngs = [location.longitude, Number(bizLoc.longitude), Number(dropLoc.longitude)];
            const ne: [number, number] = [Math.max(...lngs) + 0.005, Math.max(...lats) + 0.005];
            const sw: [number, number] = [Math.min(...lngs) - 0.005, Math.min(...lats) - 0.005];

            cameraRef.current?.fitBounds(ne, sw, [padTop, 20, padBottom, 20], 1200);
        } else if (bizLoc) {
            cameraRef.current?.setCamera({
                centerCoordinate: [Number(bizLoc.longitude), Number(bizLoc.latitude)],
                zoomLevel: 15.5,
                animationMode: 'flyTo',
                animationDuration: 1200,
            });
        }
    }, [followDriver, location]);

    const toggleFollowDriver = useCallback(() => {
        if (followDriver) {
            setFollowDriver(false);
            // Return to north-up; let user keep whatever tilt they set
            cameraRef.current?.setCamera({
                bearing: 0,
                animationDuration: 500,
                animationMode: 'easeTo',
            });
        } else {
            centerCameraOnDriver(true);
        }
    }, [followDriver, centerCameraOnDriver]);

    const handleMarkPickedUp = useCallback(async (orderId?: string) => {
        const targetId = orderId ?? focusedOrder?.id;
        if (!targetId) return;
        setMarkingPickedUpIds(prev => new Set(prev).add(targetId));
        try {
            await updateOrderStatus({ variables: { id: targetId, status: 'OUT_FOR_DELIVERY' } });
            // Immediately launch turn-by-turn navigation to dropoff
            const order = allMapOrders.find((o: any) => o.id === targetId);
            if (order && location) {
                const navOrder = buildNavOrder(order);
                if (navOrder) {
                    startNavigation(
                        { ...navOrder, status: 'OUT_FOR_DELIVERY' },
                        'to_dropoff',
                        { latitude: location.latitude, longitude: location.longitude },
                    );
                    router.push('/navigation' as any);
                }
            }
        } catch {
            Alert.alert('Error', 'Could not update order status. Please try again.');
        } finally {
            setMarkingPickedUpIds(prev => { const next = new Set(prev); next.delete(targetId); return next; });
        }
    }, [focusedOrder?.id, updateOrderStatus, allMapOrders, location, startNavigation, router]);

    // â”€â”€ Camera fit when global accept sheet auto-presents a new order â”€â”€
    useEffect(() => {
        if (!pendingOrder || !pendingAutoCountdown) return;
        if (followDriver) return;
        const bizLoc = pendingOrder.businesses?.[0]?.business?.location;
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
    }, [followDriver, pendingOrder?.id, pendingAutoCountdown]);

    // â”€â”€ Card swipe PanResponder â”€â”€
    const swipePanResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) =>
                Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
            onPanResponderRelease: (_, gs) => {
                if (gs.dx < -40) {
                    setCurrentCardIndex(prev => Math.min(prev + 1, assignedOrdersLenRef.current - 1));
                } else if (gs.dx > 40) {
                    setCurrentCardIndex(prev => Math.max(prev - 1, 0));
                }
            },
        }),
    ).current;

    // â”€â”€ Clamp card index when orders are removed â”€â”€
    useEffect(() => {
        assignedOrdersLenRef.current = assignedOrders.length;
        if (assignedOrders.length === 0) {
            setCurrentCardIndex(0);
            setFocusedOrderId(null);
            return;
        }
        setCurrentCardIndex(prev => Math.min(prev, assignedOrders.length - 1));
    }, [assignedOrders.length]);

    // â”€â”€ Focus camera on the current card's order â”€â”€
    useEffect(() => {
        if (assignedOrders.length === 0) return;
        const idx = Math.min(currentCardIndex, assignedOrders.length - 1);
        const order = assignedOrders[idx];
        if (order) focusOrder(order);
    // focusOrder dep intentionally omitted â€” it changes on every render due to location
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCardIndex, assignedOrders.length]);

    // â”€â”€ Pulse animation for READY orders â”€â”€
    useEffect(() => {
        if (assignedOrders.length === 0) return;
        const idx = Math.min(currentCardIndex, assignedOrders.length - 1);
        const order = assignedOrders[idx];
        if (order?.status === 'READY') {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(readyPulse, { toValue: 0.25, duration: 650, useNativeDriver: true }),
                    Animated.timing(readyPulse, { toValue: 1, duration: 650, useNativeDriver: true }),
                ]),
            );
            loop.start();
            return () => { loop.stop(); readyPulse.setValue(1); };
        } else {
            readyPulse.setValue(1);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCardIndex, assignedOrders.length]);

    // â”€â”€ Launch Mapbox Navigation SDK â”€â”€
    const handleStartNavigation = useCallback((targetOrder?: any) => {
        const order = targetOrder ?? focusedOrder;
        if (!order || !location) return;
        const navOrder = buildNavOrder(order);
        if (!navOrder) return;

        const origin = { latitude: location.latitude, longitude: location.longitude };
        startNavigation(navOrder, orderToPhase(order.status), origin);
        router.push('/navigation' as any);
    }, [focusedOrder, location, startNavigation, router]);
    // -- Open destination in Google Maps --
    const openInGoogleMaps = useCallback((targetOrder?: any) => {
        const order = targetOrder ?? focusedOrder;
        if (!order) return;
        const navOrder = buildNavOrder(order);
        if (!navOrder) return;

        const dest = orderToPhase(order.status) === 'to_dropoff' ? navOrder.dropoff : navOrder.pickup;
        if (!dest) return;

        const { latitude, longitude } = dest;
        const nativeUrl = Platform.select({
            ios: `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`,
            android: `google.navigation:q=${latitude},${longitude}`,
        })!;
        const webUrl = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${latitude},${longitude}`;

        Linking.canOpenURL(nativeUrl)
            .then((canOpen) => Linking.openURL(canOpen ? nativeUrl : webUrl))
            .catch(() => Linking.openURL(webUrl).catch(() => {}));
    }, [focusedOrder]);

    // -- Navigation picker (In-App vs Google Maps) --
    const handleNavigationPress = useCallback((targetOrder?: any) => {
        const order = targetOrder ?? focusedOrder;
        if (!order || !location) return;

        // If admin hasn't enabled the Google Maps picker, go straight to in-app nav
        if (!googleMapsNavEnabled) {
            handleStartNavigation(order);
            return;
        }

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: t.drive.nav_choice_title,
                    options: [t.drive.nav_choice_cancel, t.drive.nav_choice_inapp, t.drive.nav_choice_gmaps],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) handleStartNavigation(order);
                    else if (buttonIndex === 2) openInGoogleMaps(order);
                },
            );
        } else {
            Alert.alert(
                t.drive.nav_choice_title,
                undefined,
                [
                    { text: t.drive.nav_choice_inapp, onPress: () => handleStartNavigation(order) },
                    { text: t.drive.nav_choice_gmaps, onPress: () => openInGoogleMaps(order) },
                    { text: t.drive.nav_choice_cancel, style: 'cancel' },
                ],
            );
        }
    }, [focusedOrder, location, googleMapsNavEnabled, t, handleStartNavigation, openInGoogleMaps]);

    // â”€â”€ Initial camera center â”€â”€
    const initialCenter = useMemo<[number, number]>(() => {
        if (location) return [location.longitude, location.latitude];
        return GJILAN_CENTER;
    }, []);

    return (
        <View style={styles.container}>
            {/* â•â•â• Full-screen Map â•â•â• */}
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
                    maxBounds={{ ne: GJILAN_NE, sw: GJILAN_SW }}
                    minZoomLevel={12}
                    padding={{
                        paddingTop: 0,
                        paddingBottom: assignedOrders.length > 0 ? BOTTOM_BAR_HEIGHT : 0,
                        paddingLeft: 0,
                        paddingRight: 0,
                    }}
                    {...(followDriver && location ? {
                        centerCoordinate: [location.longitude, location.latitude],
                        bearing: location.heading ?? 0,
                        zoomLevel: hasActiveNavigation ? 16 : undefined,
                        animationDuration: 600,
                        animationMode: 'easeTo' as const,
                    } : {})}
                />

                {/* â”€â”€ Preview route (pickup â†’ dropoff) â€” only while picking up â”€â”€ */}
                {previewRouteShape && focusedOrder?.status !== 'OUT_FOR_DELIVERY' && (
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
                                lineOpacity: 0.6,
                                lineCap: 'round' as const,
                                lineJoin: 'round' as const,
                            }}
                        />
                    </Mapbox.ShapeSource>
                )}

                {/* â”€â”€ Active route (driver â†’ destination) â”€â”€ */}
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

                {/* Driver position â€” native Mapbox location layer (smooth interpolation) */}
                {permissionGranted && (
                    <Mapbox.UserLocation
                        visible
                        showsUserHeadingIndicator={hasActiveNavigation && followDriver}
                        renderMode={Mapbox.UserLocationRenderMode.Normal}
                    />
                )}

                {/* Order markers â€” pickup pins for assigned orders only; drop-off pins always */}
                {allMapOrders.map((order: any) => {
                    const statusColor = STATUS_COLORS[order.status] ?? '#6B7280';
                    const isAssigned = order.driver?.id === currentDriverId;
                    const isFocused = order.id === focusedOrderId;
                    const bizLoc = order.businesses?.[0]?.business?.location;
                    const dropLoc = order.dropOffLocation;
                    const biz = order.businesses?.[0]?.business;
                    const bizName = biz?.name ?? '?';
                    const bizImageUrl = biz?.imageUrl;
                    const isRestaurant = biz?.businessType === 'RESTAURANT';

                    return (
                        <React.Fragment key={order.id}>
                            {/* Only show pins for the focused order */}
                            {isAssigned && isFocused && bizLoc && (
                                <Mapbox.PointAnnotation
                                    id={`pickup-${order.id}`}
                                    coordinate={[Number(bizLoc.longitude), Number(bizLoc.latitude)]}
                                    anchor={{ x: 0.5, y: 0.5 }}
                                    onSelected={() => focusOrder(order)}
                                >
                                    <View style={[
                                        styles.bizMarker,
                                        {
                                            borderColor: isFocused ? '#a78bfa' : 'rgba(139,92,246,0.6)',
                                            borderWidth: isFocused ? 2 : 1.5,
                                            transform: [{ scale: isFocused ? 1.15 : 1 }],
                                        },
                                    ]}>
                                        {bizImageUrl ? (
                                            <Image
                                                source={{ uri: bizImageUrl }}
                                                style={styles.bizMarkerImage}
                                            />
                                        ) : (
                                            <Ionicons
                                                name={isRestaurant ? 'restaurant-outline' : 'storefront-outline'}
                                                size={13}
                                                color="#c4b5fd"
                                            />
                                        )}
                                    </View>
                                </Mapbox.PointAnnotation>
                            )}

                            {isAssigned && isFocused && dropLoc && (
                                <Mapbox.PointAnnotation
                                    id={`dropoff-${order.id}`}
                                    coordinate={[Number(dropLoc.longitude), Number(dropLoc.latitude)]}
                                    anchor={{ x: 0.5, y: 1 }}
                                    onSelected={() => focusOrder(order)}
                                >
                                    <View style={[styles.dropoffPin, { transform: [{ scale: isFocused ? 1.2 : 1 }] }]}>
                                        <View style={[
                                            styles.dropoffPinHead,
                                            isFocused && styles.dropoffPinHeadFocused,
                                        ]}>
                                            <Ionicons name="flag" size={12} color="#fff" />
                                        </View>
                                        <View style={styles.dropoffPinTip} />
                                    </View>
                                </Mapbox.PointAnnotation>
                            )}
                        </React.Fragment>
                    );
                })}
            </Mapbox.MapView>

            {/* â•â•â• Right-side buttons â•â•â• */}
            <View style={[styles.rightButtons, { bottom: (assignedOrders.length > 0 ? BOTTOM_BAR_HEIGHT + 12 : 20 + insets.bottom) }]}>
                {/* Arrived at pickup shortcut */}
                {(() => {
                    const t = assignedOrders.length === 1
                        ? assignedOrders[0]
                        : assignedOrders.find((o: any) => o.id === focusedOrderId) ?? null;
                    if (t?.status !== 'READY') return null;
                    return (
                        <Pressable
                            style={[styles.mapBtn, styles.mapBtnArrived]}
                            onPress={() => handleMarkPickedUp(t.id)}
                            disabled={markingPickedUpIds.has(t.id)}
                        >
                            {markingPickedUpIds.has(t.id)
                                ? <ActivityIndicator size={16} color="#fff" />
                                : <Ionicons name="checkmark-circle" size={22} color="#fff" />
                            }
                        </Pressable>
                    );
                })()}
                {/* Lock camera + Recenter (compact pill) */}
                <View style={styles.mapControlPill}>
                    <Pressable
                        style={[styles.mapControlBtn, followDriver && styles.mapControlBtnActive]}
                        onPress={toggleFollowDriver}
                    >
                        <Ionicons
                            name={followDriver ? 'lock-closed' : 'lock-open-outline'}
                            size={17}
                            color={followDriver ? '#4285F4' : '#6B7280'}
                        />
                    </Pressable>
                    <View style={styles.mapControlDivider} />
                    <Pressable
                        style={styles.mapControlBtn}
                        onPress={recenterOnDriver}
                    >
                        <Ionicons name="locate" size={18} color="#4285F4" />
                    </Pressable>
                </View>
            </View>

            {/* â•â•â• Connection status pill â•â•â• */}

            {/* â•â•â• Connection status pill â•â•â• (needs to stay inside MapView container) */}
            {(() => {
                const connColor =
                    connectionStatus === 'CONNECTED' ? '#22c55e' :
                    connectionStatus === 'STALE' ? '#f59e0b' : '#ef4444';
                const connLabel =
                    connectionStatus === 'CONNECTED' ? (isOnline ? t.home.online : t.home.offline) :
                    connectionStatus === 'STALE' ? t.home.signal_weak :
                    connectionStatus === 'LOST' ? t.home.signal_lost : t.home.offline;
                return (
                    <View style={[styles.connPill, { top: insets.top + 12 }]}>
                        <View style={[styles.connDot, { backgroundColor: connColor }]} />
                        <Text style={styles.connPillText}>{connLabel}</Text>
                    </View>
                );
            })()}

            {/* Loading */}
            {isInitialOrdersLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            )}

            {/* â•â•â• Single swipeable active order card â•â•â• */}
            {assignedOrders.length > 0 && (() => {
                const idx = Math.min(currentCardIndex, assignedOrders.length - 1);
                const order = assignedOrders[idx];
                const statusColor = STATUS_COLORS[order.status] ?? '#6B7280';
                const bizName = order.businesses?.[0]?.business?.name ?? '?';
                const initial = bizName.charAt(0).toUpperCase();
                const earnings = Number(order.deliveryPrice ?? 0).toFixed(2);
                const dropAddress = order.dropOffLocation?.address ?? '';
                const shortDrop = dropAddress.split(',')[0] || '';
                const isReady = order.status === 'READY';
                const isPreparing = order.status === 'PREPARING';
                const isOutForDelivery = order.status === 'OUT_FOR_DELIVERY';
                const isPickingUp = markingPickedUpIds.has(order.id);
                const prepMinsLeft = isPreparing && order.estimatedReadyAt
                    ? Math.max(0, Math.ceil((new Date(order.estimatedReadyAt).getTime() - nowTs) / 60000))
                    : null;
                const total = assignedOrders.length;

                return (
                    <View style={[styles.singleCardWrap, { bottom: 12 + insets.bottom }]}>
                        {/* Stack depth shadow (visible when 2+ orders) */}
                        {total > 1 && (
                            <View style={styles.cardStackBehind} pointerEvents="none" />
                        )}

                        <View style={styles.singleCard} {...swipePanResponder.panHandlers}>
                        {/* READY glow border â€” animated pulse */}
                        {isReady && (
                            <Animated.View
                                style={[styles.readyGlow, { opacity: readyPulse, borderColor: statusColor }]}
                                pointerEvents="none"
                            />
                        )}

                        {/* Order counter â€” top right */}
                        {total > 1 && (
                            <View style={styles.cardCounter}>
                                <Text style={styles.cardCounterText}>{idx + 1} / {total}</Text>
                            </View>
                        )}

                        {/* Header: avatar + biz name/address + earnings */}
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardAvatar, { backgroundColor: statusColor }]}>
                                <Text style={styles.cardAvatarText}>{initial}</Text>
                            </View>
                            <View style={styles.cardHeaderInfo}>
                                <Text style={styles.cardBizName} numberOfLines={1}>{bizName}</Text>
                                {shortDrop ? (
                                    <Text style={styles.cardAddress} numberOfLines={1}>{shortDrop}</Text>
                                ) : null}
                            </View>
                            <View style={styles.cardEarningsBadge}>
                                <Text style={styles.cardEarningsText}>â‚¬{earnings}</Text>
                            </View>
                        </View>

                        {/* Status + ETA row */}
                        <View style={styles.cardMidRow}>
                            <View style={[styles.cardStatusBadge, { backgroundColor: statusColor + '28' }]}>
                                <View style={[styles.cardStatusDot, { backgroundColor: statusColor }]} />
                                <Text style={[styles.cardStatusText, { color: statusColor }]}>
                                    {STATUS_LABELS[order.status] ?? order.status}
                                </Text>
                            </View>
                            {routeInfo && focusedOrderId === order.id && (
                                <Text style={styles.cardEtaText}>
                                    {order.status === 'OUT_FOR_DELIVERY'
                                        ? t.drive.min_to_drop.replace('{{min}}', String(Math.ceil(routeInfo.durationMin)))
                                        : t.drive.min_to_pickup.replace('{{min}}', String(Math.ceil(routeInfo.durationMin)))}
                                </Text>
                            )}
                            {isPreparing && prepMinsLeft !== null && (
                                <Text style={styles.cardEtaText}>
                                    {prepMinsLeft === 0 ? t.drive.almost_ready : t.drive.ready_min.replace('{{min}}', String(prepMinsLeft))}
                                </Text>
                            )}
                            {/* Swipe hint â€” only when multiple orders */}
                            {total > 1 && (
                                <Text style={styles.cardSwipeHint}>{t.drive.swipe_hint}</Text>
                            )}
                        </View>

                        {/* Fulfillment guide — visible when order has stock items (i.e. was created during inventory mode) */}
                        {(() => {
                            const allItems = order.businesses?.flatMap((b: any) => b.items ?? []) ?? [];
                            const stockItems = allItems.filter((it: any) => (it.inventoryQuantity ?? 0) > 0);
                            const marketItems = allItems.filter((it: any) => (it.quantity ?? 0) - (it.inventoryQuantity ?? 0) > 0);
                            if (stockItems.length === 0) return null;
                            return (
                                <View style={styles.fulfillmentGuide}>
                                    {stockItems.length > 0 && (
                                        <View style={styles.fulfillmentSection}>
                                            <Text style={styles.fulfillmentHeader}>{t.drive.from_stock_label}</Text>
                                            {stockItems.map((it: any, i: number) => (
                                                <Text key={i} style={styles.fulfillmentItem}>
                                                    {'📦 '}{it.inventoryQuantity}× {it.name}
                                                </Text>
                                            ))}
                                        </View>
                                    )}
                                    {marketItems.length > 0 && (
                                        <View style={[styles.fulfillmentSection, { marginTop: 6 }]}>
                                            <Text style={[styles.fulfillmentHeader, { color: '#6B7280' }]}>{t.drive.from_market_label}</Text>
                                            {marketItems.map((it: any, i: number) => (
                                                <Text key={i} style={[styles.fulfillmentItem, { color: '#6B7280' }]}>
                                                    {'🛒 '}{it.quantity - (it.inventoryQuantity ?? 0)}× {it.name}
                                                </Text>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            );
                        })()}

                        {/* Primary CTA */}
                        {isReady ? (
                            <View style={styles.cardCtaRow}>
                                <Pressable
                                    style={[styles.cardCta, styles.cardCtaHalf, { backgroundColor: '#4f46e5' }]}
                                    onPress={() => handleNavigationPress(order)}
                                >
                                    <Ionicons name="navigate" size={18} color="#fff" />
                                    <Text style={styles.cardCtaText}>{t.drive.pickup}</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.cardCta, styles.cardCtaHalf, { backgroundColor: '#16a34a' }]}
                                    onPress={() => handleMarkPickedUp(order.id)}
                                    disabled={isPickingUp}
                                >
                                    {isPickingUp ? (
                                        <ActivityIndicator size={16} color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                            <Text style={styles.cardCtaText}>{t.drive.arrived}</Text>
                                        </>
                                    )}
                                </Pressable>
                            </View>
                        ) : isOutForDelivery ? (
                            <Pressable
                                style={[styles.cardCta, { backgroundColor: '#7c3aed' }]}
                                onPress={() => handleNavigationPress(order)}
                            >
                                <Ionicons name="navigate" size={18} color="#fff" />
                                <Text style={styles.cardCtaText}>{t.drive.resume_navigation}</Text>
                            </Pressable>
                        ) : (
                            <Pressable
                                style={[styles.cardCta, { backgroundColor: '#4f46e5' }]}
                                onPress={() => handleNavigationPress(order)}
                            >
                                <Ionicons name="navigate" size={18} color="#fff" />
                                <Text style={styles.cardCtaText}>{t.drive.navigate_to_pickup}</Text>
                            </Pressable>
                        )}
                    </View>
                    </View>
                );
            })()}

            {/* Dot pager â€” shown below card when 2+ orders */}
            {assignedOrders.length > 1 && (() => {
                const idx = Math.min(currentCardIndex, assignedOrders.length - 1);
                return (
                    <View style={[styles.dotPager, { bottom: BOTTOM_BAR_HEIGHT - 24 }]}>
                        {assignedOrders.map((_: any, i: number) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    i === idx ? styles.dotActive : styles.dotInactive,
                                ]}
                            />
                        ))}
                    </View>
                );
            })()}
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

    /* â”€â”€ Connection pill â”€â”€ */
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

    /* â”€â”€ Driver marker â”€â”€ */
    driverMarkerWrap: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    driverGPSDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#4285F4',
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#4285F4',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 5,
        elevation: 8,
    },

    /* â”€â”€ Order markers â”€â”€ */
    bizMarker: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#1a1a2e',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 5,
    },
    bizMarkerImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    dropoffPin: {
        alignItems: 'center',
        width: 28,
        height: 38,
    },
    dropoffPinHead: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f97316',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#f97316',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.55,
        shadowRadius: 5,
        elevation: 7,
    },
    dropoffPinHeadFocused: {
        borderWidth: 2.5,
        borderColor: '#fff',
    },
    dropoffPinTip: {
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 9,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#f97316',
        marginTop: -1,
    },

    /* â”€â”€ Right-side buttons â”€â”€ */
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
    mapBtnArrived: {
        backgroundColor: '#16a34a',
    },
    mapControlPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 22,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 5,
        overflow: 'hidden',
    },
    mapControlBtn: {
        width: 42,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapControlBtnActive: {
        backgroundColor: '#EFF6FF',
    },
    mapControlDivider: {
        width: 1,
        height: 22,
        backgroundColor: '#E5E7EB',
    },
    poolBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#22d3ee',
        alignItems: 'center',
        justifyContent: 'center',
    },
    poolBadgeText: {
        color: '#0f172a',
        fontSize: 9,
        fontWeight: '800',
    },

    /* â”€â”€ Single swipeable active order card â”€â”€ */
    /* â”€â”€ Multi-order card wrap + stack â”€â”€ */
    singleCardWrap: {
        position: 'absolute',
        left: 12,
        right: 12,
    },
    cardStackBehind: {
        position: 'absolute',
        left: 6,
        right: 6,
        bottom: -6,
        height: 20,
        backgroundColor: 'rgba(10,12,24,0.55)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    singleCard: {
        backgroundColor: 'rgba(10,12,24,0.93)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 14,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.55,
        shadowRadius: 16,
        elevation: 16,
    },
    /* â”€â”€ Dot pager â”€â”€ */
    dotPager: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        borderRadius: 4,
    },
    dotActive: {
        width: 20,
        height: 6,
        backgroundColor: '#e2e8f0',
    },
    dotInactive: {
        width: 6,
        height: 6,
        backgroundColor: 'rgba(148,163,184,0.35)',
    },

    readyGlow: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        borderRadius: 20,
        borderWidth: 2,
    },
    cardCounter: {
        position: 'absolute',
        top: 10,
        right: 12,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    cardCounterText: {
        color: '#e2e8f0',
        fontSize: 10,
        fontWeight: '800',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingRight: 50,
    },
    cardAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    cardAvatarText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
    },
    cardHeaderInfo: {
        flex: 1,
        gap: 2,
    },
    cardBizName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#f1f5f9',
    },
    cardAddress: {
        fontSize: 11,
        color: '#64748b',
    },
    cardEarningsBadge: {
        backgroundColor: 'rgba(5,46,22,0.9)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        flexShrink: 0,
    },
    cardEarningsText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#22c55e',
    },
    cardMidRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    cardStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    cardStatusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    cardStatusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardEtaText: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '600',
    },
    cardSwipeHint: {
        color: 'rgba(148,163,184,0.45)',
        fontSize: 10,
        fontWeight: '500',
        marginLeft: 'auto' as any,
    },
    cardCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        borderRadius: 12,
        paddingVertical: 12,
    },
    cardCtaRow: {
        flexDirection: 'row',
        gap: 8,
    },
    cardCtaHalf: {
        flex: 1,
    },
    cardCtaText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },

    /* -- Fulfillment guide -- */
    fulfillmentGuide: {
        marginTop: 10,
        marginBottom: 4,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#f5f3ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd6fe',
    },
    fulfillmentSection: {},
    fulfillmentHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: '#7c3aed',
        textTransform: 'uppercase',
        marginBottom: 3,
        letterSpacing: 0.4,
    },
    fulfillmentItem: {
        fontSize: 13,
        color: '#374151',
        marginBottom: 1,
    },

    /* â”€â”€ Loading â”€â”€ */
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
});
