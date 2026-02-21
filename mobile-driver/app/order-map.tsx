import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@apollo/client/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ASSIGN_DRIVER_TO_ORDER, GET_ORDER, GET_ORDERS, UPDATE_ORDER_STATUS } from '@/graphql/operations/orders';
import { useTheme } from '@/hooks/useTheme';
import { useDriverLocationOverrideStore } from '@/store/driverLocationOverrideStore';
import { useAuthStore } from '@/store/authStore';
import type { Feature, LineString } from 'geojson';

// ─────────────────────── Custom Hooks ───────────────────────
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { useNavigationState } from '@/hooks/useNavigationState';
import { useNavigationCamera } from '@/hooks/useNavigationCamera';
import { useNavigationRoute, type RouteData } from '@/hooks/useNavigationRoute';
import { useOffRouteDetection } from '@/hooks/useOffRouteDetection';
import { useNavigationSteps } from '@/hooks/useNavigationSteps';
import { usePredictedTracking } from '@/hooks/usePredictedTracking';
import { computeRouteProgress } from '@/utils/routeProgress';

// ─────────────────────── Components ───────────────────────
import { NavigationBottomPanel } from '@/components/navigation/NavigationBottomPanel';
import { RecenterButton } from '@/components/navigation/RecenterButton';
import { FloatingMapButtons } from '@/components/navigation/FloatingMapButtons';

/* ─────────────────────── constants ─────────────────────── */

const GJILAN_CENTER: [number, number] = [21.4694, 42.4635];
const GJILAN_NE: [number, number] = [21.51, 42.50];
const GJILAN_SW: [number, number] = [21.42, 42.43];
const MAP_STYLE = 'mapbox://styles/artshabani2002/cmls0528e002701p93dejgdri';
const DESTINATION_REACHED_THRESHOLD_M = 25;
const OUT_FOR_DELIVERY_UNLOCK_M = 120;
const ORDER_MAP_ZOOM_KEY = 'order_map_zoom_state_v2';
const ORDER_MAP_LOCK_KEY = 'order_map_lock_state_v2';

/* ── Simple Camera State Management ── */
const saveZoomState = async (zoom: number) => {
    try {
        const zoomStr = JSON.stringify(zoom);
        console.log('[ORDER_MAP] Saving zoom to AsyncStorage:', zoom);
        await AsyncStorage.setItem(ORDER_MAP_ZOOM_KEY, zoomStr);
        // Verify it was saved
        const verify = await AsyncStorage.getItem(ORDER_MAP_ZOOM_KEY);
        console.log('[ORDER_MAP] Verified saved zoom:', verify);
    } catch (error) {
        console.warn('[ORDER_MAP] Failed to save zoom:', error);
    }
};

const loadZoomState = async (): Promise<number | null> => {
    try {
        const data = await AsyncStorage.getItem(ORDER_MAP_ZOOM_KEY);
        console.log('[ORDER_MAP] Raw zoom data from storage:', data);
        if (!data) {
            console.log('[ORDER_MAP] No saved zoom found');
            return null;
        }
        const zoom = JSON.parse(data) as number;
        console.log('[ORDER_MAP] Parsed zoom:', zoom, 'type:', typeof zoom);
        return zoom;
    } catch (error) {
        console.warn('[ORDER_MAP] Failed to load zoom:', error);
        return null;
    }
};

const saveLockState = async (isLocked: boolean) => {
    try {
        const lockStr = JSON.stringify(isLocked);
        console.log('[ORDER_MAP] Saving lock state:', isLocked);
        await AsyncStorage.setItem(ORDER_MAP_LOCK_KEY, lockStr);
        const verify = await AsyncStorage.getItem(ORDER_MAP_LOCK_KEY);
        console.log('[ORDER_MAP] Verified saved lock:', verify);
    } catch (error) {
        console.warn('[ORDER_MAP] Failed to save lock state:', error);
    }
};

const loadLockState = async (): Promise<boolean | null> => {
    try {
        const data = await AsyncStorage.getItem(ORDER_MAP_LOCK_KEY);
        console.log('[ORDER_MAP] Raw lock data from storage:', data);
        if (!data) {
            console.log('[ORDER_MAP] No saved lock state found');
            return null;
        }
        const isLocked = JSON.parse(data) as boolean;
        console.log('[ORDER_MAP] Parsed lock state:', isLocked, 'type:', typeof isLocked);
        return isLocked;
    } catch (error) {
        console.warn('[ORDER_MAP] Failed to load lock state:', error);
        return null;
    }
};

const routeCache = new Map<string, RouteData>();

/* ═══════════════════════════════════════════════════════════ */

export default function OrderMapScreen() {
    const router = useRouter();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { orderId } = useLocalSearchParams<{ orderId?: string }>();
    const { clearLocationOverride } = useDriverLocationOverrideStore();
    const currentDriverId = useAuthStore((state) => state.user?.id);

    // ═══════════════ Query Order Data ═══════════════
    const { data, loading, refetch } = useQuery(GET_ORDER, {
        variables: { id: orderId },
        skip: !orderId,
    });
    const [updateOrderStatus, { loading: updatingOrderStatus }] = useMutation(UPDATE_ORDER_STATUS);
    const [assignDriverToOrder] = useMutation(ASSIGN_DRIVER_TO_ORDER);

    // ═══════════════ All active orders (for side panel) ═══════════════
    const { data: ordersData, refetch: refetchOrders } = useQuery(GET_ORDERS, {
        // No poll interval — the subscription on the home screen keeps GET_ORDERS
        // up to date in the normalized cache. This query just reads from it.
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });
    const activeOrders = useMemo<any[]>(
        () => (ordersData as any)?.orders ?? [],
        [ordersData],
    );

    // Focused order — driver can switch which order the map shows
    const [focusedOrderId, setFocusedOrderId] = useState<string | undefined>(orderId);
    useEffect(() => {
        if (orderId) setFocusedOrderId(orderId);
    }, [orderId]);

    // Orders panel open/close
    const [isPanelExpanded, setIsPanelExpanded] = useState(false);

    const togglePanel = useCallback(() => {
        setIsPanelExpanded((v) => !v);
    }, []);

    // Derive focused order from the list (fall back to single-order query)
    const order = useMemo(() => {
        if (activeOrders.length > 0) {
            return activeOrders.find((o: any) => o.id === focusedOrderId) ?? (data as any)?.order;
        }
        return (data as any)?.order;
    }, [activeOrders, focusedOrderId, data]);
    const [previewRoutePulse, setPreviewRoutePulse] = useState(0.6);
    const [destinationBlink, setDestinationBlink] = useState(1);
    const [routeRefreshKey, setRouteRefreshKey] = useState(0);
    const [isRestoringView, setIsRestoringView] = useState(false);
    const wasFollowingBeforeOverviewRef = useRef(false);
    const hasRecenteredOnFocusRef = useRef(false);
    const isFocusedRef = useRef(false);
    const autoStartRef = useRef(false);
    const isRestoringCameraRef = useRef(false);

    // ═══════════════ Derive Points ═══════════════
    const pickup = useMemo(() => {
        const biz = order?.businesses?.[0]?.business;
        if (!biz?.location) return null;
        return {
            latitude: Number(biz.location.latitude),
            longitude: Number(biz.location.longitude),
        };
    }, [order]);

    const dropoff = useMemo(() => {
        const loc = order?.dropOffLocation;
        if (!loc) return null;
        return {
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
        };
    }, [order]);

    const pickupLabel = order?.businesses?.[0]?.business?.name ?? 'Pickup';
    const dropoffLabel = order?.dropOffLocation?.address ?? 'Drop-off';

    const canNavigate = [
        'PENDING',
        'ACCEPTED',
        'READY',
        'OUT_FOR_DELIVERY',
    ].includes(order?.status);
    const isAssignedToOrder = Boolean(order?.driver?.id && order?.driver?.id === currentDriverId);
    const shouldAutoStartNavigation =
        isAssignedToOrder && (order?.status === 'ACCEPTED' || order?.status === 'READY');

    useEffect(() => {
        autoStartRef.current = false;
    }, [orderId, order?.driver?.id]);

    // ═══════════════ Custom Hooks ═══════════════
    const { location, locationRef, permissionGranted, error: locationError } = useDriverLocation({
        smoothing: true,
        timeInterval: 2000,
        distanceFilter: 5,
    });

    const effectiveLocation = location;

    const {
        state,
        context,
        isNavigating,
        isNavigatingToPickup,
        isNavigatingToDropoff,
        isInOverview,
        startNavigation: startNav,
        markPickupComplete,
        markDeliveryComplete,
        setNavigatingToPickup,
        setNavigatingToDropoff,
        stopNavigation: stopNav,
        showOverview,
    } = useNavigationState();

    const {
        cameraRef,
        cameraState,
        isFollowing,
        followMode,
        enableFollowMode,
        disableFollowMode,
        setFollowMode,
        recenter,
        fitBounds,
        handleMapPress,
        saveViewportPreference,
    } = useNavigationCamera();

    const driverMarkerRef = useRef<any>(null);
    const driverArrowRef = useRef<any>(null);
    const lastRouteRef = useRef<RouteData | null>(null);
    const latestLocationRef = useRef<typeof effectiveLocation>(null);

    // Imperative 60 FPS marker + camera prediction loop
    // Only follow camera when explicitly locked by user
    usePredictedTracking({
        sourceLocation: effectiveLocation,
        isActive: Boolean(effectiveLocation),
        followCamera: isFollowing, // Follow only when locked, regardless of navigation state
        cameraRef,
        markerRef: driverMarkerRef,
        arrowRef: driverArrowRef,
        zoomLevel: cameraState.zoom || 18.5,
        pitch: cameraState.pitch || 58,
        followMode,
        deadZoneOffsetMeters: 28,
        headingSnapThresholdDeg: 10,
        adaptiveZoom: false,
    });

    useEffect(() => {
        latestLocationRef.current = effectiveLocation ?? null;
    }, [effectiveLocation]);

    const {
        route,
        isLoading: isRouteLoading,
        error: routeError,
        fetchRoute,
        clearRoute,
        shouldReroute,
        markRerouted,
        resetRerouteCount,
    } = useNavigationRoute();

    const {
        route: pickupToDropoffRoute,
        fetchRoute: fetchPickupToDropoffRoute,
        clearRoute: clearPickupToDropoffRoute,
    } = useNavigationRoute();

    const { checkOffRoute, calculateDistanceToDestination } = useOffRouteDetection();

    const { currentStep, nextStep, reset: resetSteps } = useNavigationSteps(
        route?.steps || [],
        effectiveLocation,
    );

    // ═══════════════ Navigation Logic ═══════════════

    // Keep navigation leg aligned with backend order status
    useEffect(() => {
        if (!orderId || !pickup || !dropoff) return;

        if (order?.status === 'ACCEPTED') {
            if (isNavigating && !isNavigatingToPickup) {
                setNavigatingToPickup();
            }
            return;
        }

        if (order?.status === 'READY') {
            // READY should preview route to pickup, but not force navigation start
            if (isNavigating && !isNavigatingToPickup) {
                setNavigatingToPickup();
            }
            return;
        }

        if (order?.status === 'OUT_FOR_DELIVERY') {
            if (!isNavigating) {
                startNav(orderId, pickup, dropoff);
            }
            if (!isNavigatingToDropoff) {
                setNavigatingToDropoff();
            }
        }
    }, [
        order?.status,
        orderId,
        pickup,
        dropoff,
        isNavigating,
        isNavigatingToPickup,
        isNavigatingToDropoff,
        startNav,
        setNavigatingToPickup,
        setNavigatingToDropoff,
    ]);

    useEffect(() => {
        if (!shouldAutoStartNavigation || !orderId || !pickup || !dropoff) return;
        if (isNavigating) return;
        if (autoStartRef.current) return;

        startNav(orderId, pickup, dropoff);
        setNavigatingToPickup();

        if (effectiveLocation) {
            recenter(effectiveLocation);
        } else {
            enableFollowMode();
        }

        setRouteRefreshKey((prev) => prev + 1);
        autoStartRef.current = true;
    }, [
        shouldAutoStartNavigation,
        orderId,
        pickup,
        dropoff,
        isNavigating,
        startNav,
        setNavigatingToPickup,
        effectiveLocation,
        recenter,
        enableFollowMode,
    ]);

    // ═══════════════ Status-Driven Single-Leg Routing ═══════════════
    // Preview route before navigation starts OR fetch route during navigation
    // Route leg is determined purely by order status:
    // - ACCEPTED/READY → driver to pickup
    // - OUT_FOR_DELIVERY → driver to dropoff
    const currentDestination = useMemo(() => {
        if (!pickup || !dropoff) return null;
        if (order?.status === 'ACCEPTED' || order?.status === 'READY') return pickup;
        if (order?.status === 'OUT_FOR_DELIVERY') return dropoff;
        return null;
    }, [order?.status, pickup, dropoff]);

    const routeCacheKey = useMemo(() => {
        if (!orderId || !currentDestination) return null;
        return `${orderId}:${order?.status ?? 'UNKNOWN'}`;
    }, [orderId, currentDestination, order?.status]);

    const hasLocation = Boolean(effectiveLocation);

    useEffect(() => {
        if (!currentDestination) {
            clearRoute();
            lastRouteRef.current = null;
            return;
        }

        if (routeCacheKey && !lastRouteRef.current) {
            const cached = routeCache.get(routeCacheKey);
            if (cached) {
                lastRouteRef.current = cached;
            }
        }

        const locationForRoute = latestLocationRef.current;
        if (!locationForRoute) return;

        fetchRoute(locationForRoute, currentDestination);
    }, [
        currentDestination,
        routeCacheKey,
        hasLocation,
        fetchRoute,
        clearRoute,
        routeRefreshKey,
    ]);

    useEffect(() => {
        if (route && route.coordinates.length >= 2) {
            lastRouteRef.current = route;
            if (routeCacheKey) {
                routeCache.set(routeCacheKey, route);
            }
        }
    }, [route, routeCacheKey]);

    useEffect(() => {
        lastRouteRef.current = null;
        resetRerouteCount();
    }, [orderId, resetRerouteCount]);

    useEffect(() => {
        if (!pickup || !dropoff) return;

        const shouldPreviewRoute =
            order?.status === 'ACCEPTED' || order?.status === 'READY';

        if (!shouldPreviewRoute) {
            clearPickupToDropoffRoute();
            return;
        }

        fetchPickupToDropoffRoute(pickup, dropoff);
    }, [
        pickup,
        dropoff,
        order?.status,
        fetchPickupToDropoffRoute,
        clearPickupToDropoffRoute,
    ]);

    useEffect(() => {
        return () => {
            clearLocationOverride();
        };
    }, [clearLocationOverride]);

    // Reroute logic: off-route detection only (no periodic timer), capped at maxReroutes
    useEffect(() => {
        if (!isNavigating || !effectiveLocation || !route) return;

        const destination = isNavigatingToPickup ? pickup : dropoff;
        if (!destination) return;

        const offRoute = checkOffRoute(effectiveLocation, route.coordinates);
        if (shouldReroute(effectiveLocation, offRoute)) {
            markRerouted();
            fetchRoute(effectiveLocation, destination);
        }
    }, [
        isNavigating,
        effectiveLocation,
        route,
        pickup,
        dropoff,
        isNavigatingToPickup,
        checkOffRoute,
        shouldReroute,
        markRerouted,
        fetchRoute,
    ]);

    // Auto-complete pickup/dropoff when destination reached
    useEffect(() => {
        if (!isNavigating || !effectiveLocation) return;

        const destination = isNavigatingToPickup ? pickup : isNavigatingToDropoff ? dropoff : null;
        if (!destination) return;

        const distanceToDestination = calculateDistanceToDestination(effectiveLocation, destination);

        if (distanceToDestination !== null && distanceToDestination < DESTINATION_REACHED_THRESHOLD_M) {
            if (isNavigatingToPickup) {
                markPickupComplete();
            } else if (isNavigatingToDropoff) {
                markDeliveryComplete();
            }
        }
    }, [
        isNavigating,
        effectiveLocation,
        pickup,
        dropoff,
        isNavigatingToPickup,
        isNavigatingToDropoff,
        calculateDistanceToDestination,
        markPickupComplete,
        markDeliveryComplete,
    ]);

    // No auto-fit camera behavior - user controls camera manually with lock/unlock/recenter buttons

    // ═══════════════ Handlers ═══════════════
    const handleStartNavigation = () => {
        if (!pickup || !dropoff || !orderId) return;
        startNav(orderId, pickup, dropoff);

        if (order?.status === 'OUT_FOR_DELIVERY') {
            setNavigatingToDropoff();
        } else {
            setNavigatingToPickup();
        }

        if (effectiveLocation) {
            recenter(effectiveLocation);
        } else {
            enableFollowMode();
        }

        setRouteRefreshKey((prev) => prev + 1);
    };

    const handleOutForDelivery = async () => {
        if (!pickup || !dropoff || !orderId) return;
        if (!currentDriverId) {
            Alert.alert('Error', 'Driver profile not loaded. Please re-login.');
            return;
        }

        if (!canUnlockOutForDelivery) {
            Alert.alert('Too far', 'Get closer to the pickup location to start delivery.');
            return;
        }

        if (order?.status !== 'READY') {
            Alert.alert('Not ready', 'Order must be READY before going out for delivery.');
            return;
        }

        if (order?.driver?.id && order.driver.id !== currentDriverId) {
            Alert.alert('Already assigned', 'This order is assigned to another driver.');
            return;
        }

        try {
            if (!order?.driver?.id) {
                await assignDriverToOrder({
                    variables: {
                        id: orderId,
                        driverId: currentDriverId,
                    },
                });
            }
        } catch (error) {
            console.error('[OrderMap] Failed to assign before OUT_FOR_DELIVERY', error);
            Alert.alert('Could not lock order', 'Please try again.');
            await Promise.all([refetch(), refetchOrders()]);
            return;
        }

        // Start dropoff leg immediately for a responsive UX
        if (!isNavigating) {
            startNav(orderId, pickup, dropoff);
        }
        setNavigatingToDropoff();
        enableFollowMode();

        try {
            await updateOrderStatus({
                variables: {
                    id: orderId,
                    status: 'OUT_FOR_DELIVERY',
                },
            });
            await Promise.all([refetch(), refetchOrders()]);
        } catch (error) {
            console.error('[OrderMap] Failed to update status to OUT_FOR_DELIVERY', error);
            Alert.alert('Update failed', 'Order could not be moved to OUT_FOR_DELIVERY.');
            await Promise.all([refetch(), refetchOrders()]);
        }
    };

    const handleStopNavigation = () => {
        stopNav();
        clearRoute();
        resetSteps();
        disableFollowMode();

        setRouteRefreshKey((prev) => prev + 1);
    };

    const handleRecenter = () => {
        if (!effectiveLocation || !cameraRef.current) return;
        
        // Center on driver with full zoom + lock camera
        const zoomLevel = 20;
        cameraRef.current.setCamera({
            centerCoordinate: [effectiveLocation.longitude, effectiveLocation.latitude],
            zoomLevel: zoomLevel,
            pitch: 55,
            heading: effectiveLocation.heading || 0,
            animationDuration: 600,
        });
        
        // Lock camera in heading-up mode
        setFollowMode('heading-up');
        saveLockState(true);
        saveZoomState(zoomLevel);
    };

    const handleUnlockCamera = () => {
        setFollowMode('free');
        saveLockState(false);
    };

    const fitAllMarkers = () => {
        if (!cameraRef.current || !effectiveLocation) return;
        
        // Collect all visible markers: driver, pickup, dropoff
        const coordinates: [number, number][] = [
            [effectiveLocation.longitude, effectiveLocation.latitude], // Driver
        ];
        
        if (pickup) {
            coordinates.push([pickup.longitude, pickup.latitude]);
        }
        
        if (dropoff) {
            coordinates.push([dropoff.longitude, dropoff.latitude]);
        }
        
        // Fit bounds with padding to show all markers
        if (coordinates.length > 0) {
            fitBounds(coordinates, [100, 80, 100, 200]); // [top, right, bottom, left]
            setFollowMode('free');
        }
    };

    const handleToggleCameraLock = () => {
        if (followMode === 'free') {
            handleRecenter();
        } else {
            handleUnlockCamera();
        }
    };

    // Auto-fit all markers when in preview mode (accepting an order)
    useEffect(() => {
        const isPreviewMode = !isNavigating && (order?.status === 'READY' || order?.status === 'ACCEPTED');
        
        if (isPreviewMode && effectiveLocation && pickup && dropoff && cameraRef.current && !hasRecenteredOnFocusRef.current) {
            setTimeout(() => {
                fitAllMarkers();
                hasRecenteredOnFocusRef.current = true;
            }, 500); // Slight delay to let map settle
        }
    }, [order?.status, isNavigating, effectiveLocation, pickup, dropoff, fitBounds]);

    const handleCameraChanged = (event: any) => {
        // Skip saving if we're currently restoring camera state
        if (isRestoringCameraRef.current) {
            console.log('[ORDER_MAP] Skipping camera save - restoration in progress');
            return;
        }

        const properties = event?.properties;
        const zoom = properties?.zoom;

        if (typeof zoom === 'number' && zoom > 0) {
            console.log('[ORDER_MAP] Camera zoom changed:', zoom);
            saveZoomState(zoom);
        }
    };

    useFocusEffect(
        useCallback(() => {
            console.log('[ORDER_MAP] Screen focused - restoring zoom and lock state');
            isFocusedRef.current = true;
            hasRecenteredOnFocusRef.current = false;
            setIsRestoringView(false); // Hide map while restoring

            const restoreState = async () => {
                try {
                    const savedZoom = await loadZoomState();
                    const savedLocked = await loadLockState();
                    
                    const zoomToUse = savedZoom || 18.5;
                    const isLocked = savedLocked ?? false;
                    
                    console.log('[ORDER_MAP] Loaded saved state - zoom:', zoomToUse, 'locked:', isLocked);
                    
                    // Mark restoration in progress to block camera saves
                    isRestoringCameraRef.current = true;
                    
                    // Restore lock state immediately
                    if (isLocked) {
                        console.log('[ORDER_MAP] Restoring locked state');
                        setFollowMode('heading-up');
                    } else {
                        console.log('[ORDER_MAP] Restoring free state');
                        setFollowMode('free');
                    }
                    
                    // Wait for camera and location to be ready
                    let retries = 0;
                    const waitForCamera = setInterval(() => {
                        if (cameraRef.current && effectiveLocation) {
                            clearInterval(waitForCamera);
                            console.log('[ORDER_MAP] Camera ready, applying saved zoom');
                            
                            // Apply saved zoom
                            cameraRef.current.setCamera({
                                centerCoordinate: [effectiveLocation.longitude, effectiveLocation.latitude],
                                zoomLevel: zoomToUse,
                                pitch: 55,
                                heading: effectiveLocation.heading || 0,
                                animationDuration: 0,
                            });
                            
                            // Wait for map to fully settle and then show it
                            setTimeout(() => {
                                console.log('[ORDER_MAP] Restoration complete, showing map and re-enabling saves');
                                isRestoringCameraRef.current = false;
                                setIsRestoringView(true); // Show map once restored
                            }, 1200);
                            
                            hasRecenteredOnFocusRef.current = true;
                        } else {
                            retries++;
                            if (retries > 50) {
                                // Timeout after 5 seconds
                                console.warn('[ORDER_MAP] Camera or location not ready, showing map anyway');
                                clearInterval(waitForCamera);
                                isRestoringCameraRef.current = false;
                                setIsRestoringView(true);
                            }
                        }
                    }, 100);
                    
                } catch (error) {
                    console.warn('[ORDER_MAP] Failed to restore state:', error);
                    setIsRestoringView(true); // Show map even if restore failed
                }
            };

            restoreState();

            return () => {
                console.log('[ORDER_MAP] Screen unfocused');
                isFocusedRef.current = false;
            };
        }, [effectiveLocation]),
    );

    const handleOverviewPressIn = () => {
        if (!route || route.coordinates.length < 2) return;
        wasFollowingBeforeOverviewRef.current = isFollowing;
        setFollowMode('free');
        fitBounds(route.coordinates, [130, 60, 300, 60]);
    };

    const handleOverviewPressOut = () => {
        if (!wasFollowingBeforeOverviewRef.current || !effectiveLocation) return;
        setFollowMode('heading-up');
        recenter(effectiveLocation);
        wasFollowingBeforeOverviewRef.current = false;
    };

    // ═══════════════ Derived Values ═══════════════
    const activeRoute = route ?? lastRouteRef.current;
    const routeShape = useMemo<Feature<LineString> | null>(() => {
        if (!activeRoute || activeRoute.coordinates.length < 2) return null;
        return {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: activeRoute.coordinates },
        };
    }, [activeRoute]);

    const pickupToDropoffShape = useMemo<Feature<LineString> | null>(() => {
        if (!pickupToDropoffRoute || pickupToDropoffRoute.coordinates.length < 2) return null;
        return {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: pickupToDropoffRoute.coordinates },
        };
    }, [pickupToDropoffRoute]);

    const headingTo = isNavigatingToPickup ? 'Pickup' : 'Drop-off';

    // Live ETA: derived from remaining polyline distance — no API calls needed.
    // computeRouteProgress walks the polyline to find how far the driver has gone
    // and applies the original Mapbox speed to produce a decrementing estimate.
    const routeProgress = useMemo(() => {
        if (!effectiveLocation || !route || route.coordinates.length < 2) return null;
        return computeRouteProgress(
            effectiveLocation,
            route.coordinates,
            route.distance,   // metres
            route.duration,   // seconds
        );
    }, [effectiveLocation, route]);

    const eta = routeProgress != null
        ? Math.max(0, Math.round(routeProgress.remainingDurationSec / 60))
        : route
        ? Math.round(route.duration / 60)   // fallback before first GPS fix
        : null;
    const distKm = routeProgress != null
        ? routeProgress.remainingDistanceM / 1000
        : route
        ? route.distance / 1000
        : null;
    const isPreviewMode = !isNavigating && order?.status === 'READY';
    const distanceToPickup = useMemo(() => {
        if (!effectiveLocation || !pickup) return null;
        return calculateDistanceToDestination(effectiveLocation, pickup);
    }, [effectiveLocation, pickup, calculateDistanceToDestination]);
    const canUnlockOutForDelivery = Boolean(
        order?.status === 'READY' &&
            distanceToPickup != null &&
            distanceToPickup <= OUT_FOR_DELIVERY_UNLOCK_M,
    );
    const etaArrivalText = eta != null
        ? new Date(Date.now() + eta * 60 * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
          })
        : undefined;

    const markerScale = useMemo(() => {
        const zoom = cameraState.zoom ?? 15;
        if (zoom >= 16) return 1;
        if (zoom >= 14) return 0.88;
        if (zoom >= 12) return 0.75;
        if (zoom >= 10) return 0.65;
        return 0.55;
    }, [cameraState.zoom]);

    useEffect(() => {
        if (!isPreviewMode) {
            setPreviewRoutePulse(0.6);
            return;
        }

        let frameId = 0;
        const started = Date.now();

        const animate = () => {
            const elapsed = (Date.now() - started) / 1000;
            const pulse = 0.45 + ((Math.sin(elapsed * 2.6) + 1) / 2) * 0.45;
            setPreviewRoutePulse(pulse);
            frameId = requestAnimationFrame(animate);
        };

        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [isPreviewMode]);

    useEffect(() => {
        let frameId = 0;
        const started = Date.now();

        const animate = () => {
            const elapsed = (Date.now() - started) / 1000;
            const pulse = 0.35 + ((Math.sin(elapsed * 4.2) + 1) / 2) * 0.65;
            setDestinationBlink(pulse);
            frameId = requestAnimationFrame(animate);
        };

        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, []);


    /* ═══════════════════ LOADING ═══════════════════ */

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    /* ═══════════════════ RENDER ═══════════════════ */

    return (
        <View style={styles.container}>
            {/* ── TOP BAR (Overview mode) ── */}
            {!isNavigating && (
                <View style={[styles.topBar, { paddingTop: insets.top }]}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backArrow}>{'←'}</Text>
                    </Pressable>
                    <Text style={styles.topBarTitle}>
                        {isNavigatingToDropoff ? 'Delivering Order' : 'Picking Up Order'}
                    </Text>
                    <View style={{ width: 44 }} />
                </View>
            )}

            {/* ── MAP ── */}
            <View style={[styles.mapContainer, !isRestoringView && { opacity: 0 }]}>
                <Mapbox.MapView
                    style={styles.map}
                    styleURL={MAP_STYLE}
                    logoEnabled={false}
                    attributionEnabled={false}
                    compassEnabled
                    compassPosition={{ top: 12, right: 12 }}
                    scaleBarEnabled={false}
                    zoomEnabled
                    scrollEnabled
                    rotateEnabled
                    pitchEnabled
                    onPress={handleMapPress}
                    onCameraChanged={handleCameraChanged}
                >
                    <Mapbox.Camera
                        ref={cameraRef}
                        defaultSettings={{
                            centerCoordinate: GJILAN_CENTER,
                            zoomLevel: 13,
                        }}
                        maxBounds={{
                            ne: GJILAN_NE,
                            sw: GJILAN_SW,
                        }}
                    />

                    {/* Preview pickup → dropoff route (before delivery) */}
                    {pickupToDropoffShape && !isNavigatingToDropoff && (
                        <Mapbox.ShapeSource id="preview-route-source" shape={pickupToDropoffShape}>
                            <Mapbox.LineLayer
                                id="preview-route"
                                style={{
                                    lineColor: '#F59E0B',
                                    lineWidth: [
                                        'interpolate',
                                        ['linear'],
                                        ['zoom'],
                                        11, 3,
                                        13, 4,
                                        15, 6,
                                        17, 7,
                                    ],
                                    lineOpacity: 0.75,
                                    lineCap: 'round' as const,
                                    lineJoin: 'round' as const,
                                }}
                            />
                        </Mapbox.ShapeSource>
                    )}

                    {/* Route line - Google Maps style */}
                    {routeShape && (
                        <Mapbox.ShapeSource id="route-source" shape={routeShape}>
                            {/* White road casing */}
                            <Mapbox.LineLayer
                                id="route-casing"
                                style={{
                                    lineColor: '#ffffff',
                                    lineWidth: [
                                        'interpolate',
                                        ['linear'],
                                        ['zoom'],
                                        11, 5,
                                        13, 7,
                                        15, 9,
                                        17, 12,
                                    ],
                                    lineOpacity: 0.9,
                                    lineCap: 'round' as const,
                                    lineJoin: 'round' as const,
                                }}
                            />

                            {/* Google blue navigation line */}
                            <Mapbox.LineLayer
                                id="route-fill"
                                style={{
                                    lineColor: '#4285F4',
                                    lineWidth: [
                                        'interpolate',
                                        ['linear'],
                                        ['zoom'],
                                        11, 3,
                                        13, 4,
                                        15, 6,
                                        17, 8,
                                    ],
                                    lineOpacity: isPreviewMode ? Math.max(0.7, previewRoutePulse) : 1,
                                    lineCap: 'round' as const,
                                    lineJoin: 'round' as const,
                                }}
                            />
                        </Mapbox.ShapeSource>
                    )}

                    {/* Driver position marker - keep above route */}
                    {effectiveLocation && (
                        <Mapbox.PointAnnotation
                            id="driver-position"
                            ref={driverMarkerRef}
                            coordinate={[effectiveLocation.longitude, effectiveLocation.latitude]}
                        >
                            <View style={[styles.driverMarker, { transform: [{ scale: markerScale }] }]}>
                                <View style={styles.driverMarkerCore} />
                                <View
                                    ref={driverArrowRef}
                                    style={[
                                        styles.driverArrow,
                                        {
                                            transform: [
                                                {
                                                    rotate: `${effectiveLocation.heading || 0}deg`,
                                                },
                                            ],
                                        },
                                    ]}
                                />
                            </View>
                        </Mapbox.PointAnnotation>
                    )}

                    {/* Pickup marker - pinpoint shape */}
                    {pickup && (
                        <Mapbox.PointAnnotation
                            id="marker-pickup"
                            coordinate={[pickup.longitude, pickup.latitude]}
                            anchor={{ x: 0.5, y: 1 }}
                        >
                            <View style={[styles.pinMarkerContainer, { transform: [{ scale: markerScale }] }]}>
                                <View style={styles.pickupPin}>
                                    <View style={styles.pickupPinCircle}>
                                        <View style={styles.pickupPinInner} />
                                    </View>
                                    <View style={styles.pickupPinTip} />
                                </View>
                            </View>
                            <Mapbox.Callout title={pickupLabel} />
                        </Mapbox.PointAnnotation>
                    )}

                    {/* Dropoff marker - pinpoint shape */}
                    {dropoff && (
                        <Mapbox.PointAnnotation
                            id="marker-dropoff"
                            coordinate={[dropoff.longitude, dropoff.latitude]}
                            anchor={{ x: 0.5, y: 1 }}
                        >
                            <View style={[styles.pinMarkerContainer, { transform: [{ scale: markerScale }] }]}>
                                <View style={styles.dropoffPin}>
                                    <View style={styles.dropoffPinCircle} />
                                    <View style={styles.dropoffPinTip} />
                                </View>
                            </View>
                            <Mapbox.Callout title={dropoffLabel} />
                        </Mapbox.PointAnnotation>
                    )}

                    {/* ── Ghost markers for non-focused active orders ── */}
                    {activeOrders
                        .filter((o: any) => o.id !== focusedOrderId)
                        .map((o: any) => {
                            const bizLoc = o.businesses?.[0]?.business?.location;
                            const dropLoc = o.dropOffLocation;
                            return (
                                <React.Fragment key={`ghost-${o.id}`}>
                                    {bizLoc && (
                                        <Mapbox.PointAnnotation
                                            id={`ghost-pickup-${o.id}`}
                                            coordinate={[Number(bizLoc.longitude), Number(bizLoc.latitude)]}
                                            onSelected={() => setFocusedOrderId(o.id)}
                                        >
                                            <View style={styles.ghostPickupPin} />
                                        </Mapbox.PointAnnotation>
                                    )}
                                    {dropLoc && (
                                        <Mapbox.PointAnnotation
                                            id={`ghost-dropoff-${o.id}`}
                                            coordinate={[Number(dropLoc.longitude), Number(dropLoc.latitude)]}
                                            onSelected={() => setFocusedOrderId(o.id)}
                                        >
                                            <View style={styles.ghostDropoffPin} />
                                        </Mapbox.PointAnnotation>
                                    )}
                                </React.Fragment>
                            );
                        })}
                </Mapbox.MapView>

                <Pressable
                    style={[styles.backButtonFloating, { top: insets.top + 10 }]}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backArrow}>{'←'}</Text>
                </Pressable>

                {/* ── Floating control buttons (right side) ── */}
                <FloatingMapButtons
                    topOffset={insets.top + 16}
                    isLocked={followMode !== 'free'}
                    onLockAndZoom={handleRecenter}
                    onUnlock={handleUnlockCamera}
                    followMode={followMode}
                />

                {/* ── Recenter button (right side) ── */}
                <RecenterButton
                    onPress={handleRecenter}
                    onPressIn={handleOverviewPressIn}
                    onPressOut={handleOverviewPressOut}
                    isFollowing={isFollowing}
                    bottom={isNavigating ? 180 : 220}
                    right={16}
                />

                {/* ── Orders panel toggle button (always visible on map) ── */}
                {activeOrders.length >= 1 && (
                    <TouchableOpacity
                        style={[
                            styles.ordersPillBtn,
                            { bottom: isNavigating ? 188 : 228 },
                        ]}
                        onPress={togglePanel}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.ordersPillBtnText}>
                            {isPanelExpanded ? '✕' : `≡  Orders · ${activeOrders.length}`}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* ════════════ ACTIVE ORDERS SLIDE PANEL (inside mapContainer) ════════════ */}
                {activeOrders.length >= 1 && isPanelExpanded && (
                <View
                    style={styles.ordersPanel}
                >
                    {/* Handle + header — always tappable to expand/collapse */}
                    <TouchableOpacity
                        style={styles.ordersPanelHeader}
                        onPress={togglePanel}
                        activeOpacity={0.8}
                    >
                        <View style={styles.ordersPanelHandle} />
                        <View style={styles.ordersPanelHeaderRow}>
                            <Text style={styles.ordersPanelTitle}>
                                Active Orders ({activeOrders.length})
                            </Text>
                            <Text style={styles.ordersPanelChevron}>
                                {isPanelExpanded ? '▾' : '▴'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Order cards (only rendered/scrollable when expanded) */}
                    <ScrollView
                        style={styles.ordersPanelList}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {activeOrders.map((o: any) => {
                            const isFocused = o.id === focusedOrderId;
                            const bizName = o.businesses?.[0]?.business?.name ?? 'Business';
                            const customerName =
                                [o.user?.firstName, o.user?.lastName]
                                    .filter(Boolean)
                                    .join(' ') || 'Customer';
                            const address = o.dropOffLocation?.address ?? '';
                            const statusColor =
                                o.status === 'ACCEPTED' ? '#FBBF24' :
                                o.status === 'READY' ? '#34D399' :
                                o.status === 'OUT_FOR_DELIVERY' ? '#60A5FA' : '#9CA3AF';
                            return (
                                <TouchableOpacity
                                    key={o.id}
                                    style={[
                                        styles.orderCard,
                                        isFocused && styles.orderCardFocused,
                                    ]}
                                    onPress={() => setFocusedOrderId(o.id)}
                                    activeOpacity={0.75}
                                >
                                    <View style={styles.orderCardLeft}>
                                        <View style={[styles.orderStatusDot, { backgroundColor: statusColor }]} />
                                    </View>
                                    <View style={styles.orderCardContent}>
                                        <Text style={styles.orderCardBiz} numberOfLines={1}>{bizName}</Text>
                                        <Text style={styles.orderCardCustomer} numberOfLines={1}>{customerName}</Text>
                                        {address ? (
                                            <Text style={styles.orderCardAddress} numberOfLines={1}>{address}</Text>
                                        ) : null}
                                    </View>
                                    {isFocused && (
                                        <View style={styles.orderCardFocusedBadge}>
                                            <Text style={styles.orderCardFocusedBadgeText}>ACTIVE</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
                )}
            </View>

            {/* ════════════ BOTTOM PANEL ════════════ */}
            {isNavigating ? (
                <NavigationBottomPanel
                    eta={eta}
                    distance={distKm}
                    destination={headingTo}
                    etaArrivalText={etaArrivalText}
                    onPrimaryAction={order?.status === 'READY' ? handleOutForDelivery : undefined}
                    primaryActionLabel={order?.status === 'READY' ? 'Out for delivery' : undefined}
                    primaryActionDisabled={order?.status === 'READY' ? !canUnlockOutForDelivery : false}
                    primaryActionLoading={updatingOrderStatus}
                    onEnd={handleStopNavigation}
                    bottomInset={insets.bottom}
                />
            ) : (
                /* ── Overview bottom card ── */
                <View
                    style={[
                        styles.overviewCard,
                        { paddingBottom: Math.max(insets.bottom, 12) },
                    ]}
                >
                    {/* A / B addresses */}
                    <View style={styles.addressBlock}>
                        <View style={styles.addressRow}>
                            <View style={[styles.addressDot, { backgroundColor: '#34A853' }]} />
                            <View style={styles.addressTexts}>
                                <Text style={styles.addressLabel}>PICKUP</Text>
                                <Text style={styles.addressName} numberOfLines={1}>
                                    {pickupLabel}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.addressConnector}>
                            <View style={styles.connectorLine} />
                        </View>

                        <View style={styles.addressRow}>
                            <View style={[styles.addressDot, { backgroundColor: '#EA4335' }]} />
                            <View style={styles.addressTexts}>
                                <Text style={styles.addressLabel}>DROP-OFF</Text>
                                <Text style={styles.addressName} numberOfLines={1}>
                                    {dropoffLabel}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ETA badge */}
                    {eta != null && distKm != null && (
                        <View style={styles.etaBadge}>
                            <Text style={styles.etaBadgeText}>
                                {eta} min · {distKm.toFixed(1)} km
                            </Text>
                        </View>
                    )}

                    {/* Action button */}
                    {canNavigate ? (
                        <Pressable
                            style={styles.startBtn}
                            onPress={handleStartNavigation}
                            disabled={updatingOrderStatus}
                        >
                            <Text style={styles.startBtnText}>
                                {updatingOrderStatus
                                    ? 'Updating…'
                                    : 'Start Navigation'}
                            </Text>
                        </Pressable>
                    ) : (
                        <View style={styles.statusChip}>
                            <Text style={styles.statusChipText}>
                                {shouldAutoStartNavigation
                                    ? 'Navigation active'
                                    : order?.status?.replace(/_/g, ' ') ?? 'Loading…'}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Loading overlay while restoring camera */}
            {!isRestoringView && (
                <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            )}
        </View>
    );
}

/* ═══════════════════ STYLES ═══════════════════ */

const GOOGLE_BLUE = '#4285F4';
const GOOGLE_GREEN = '#34A853';
const GOOGLE_RED = '#EA4335';

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    /* ── top bar (overview mode) ── */
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButtonFloating: {
        position: 'absolute',
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 4,
        zIndex: 20,
    },
    backArrow: { fontSize: 20, color: '#374151' },
    topBarTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },

    /* ── map ── */
    mapContainer: { flex: 1 },
    map: { flex: 1 },

    /* ── overview bottom card (Google Maps style) ── */
    overviewCard: {
        backgroundColor: '#ffffff',
        paddingTop: 20,
        paddingHorizontal: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 12,
    },
    addressBlock: {
        marginBottom: 16,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addressDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    addressTexts: { marginLeft: 14, flex: 1 },
    addressLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6,
        color: '#9CA3AF',
        textTransform: 'uppercase',
    },
    addressName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginTop: 2,
    },
    addressConnector: {
        marginLeft: 5,
        height: 20,
        justifyContent: 'center',
    },
    connectorLine: {
        width: 2,
        height: 20,
        backgroundColor: '#E5E7EB',
    },
    etaBadge: {
        backgroundColor: '#F0FDF4',
        borderRadius: 16,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    etaBadgeText: {
        fontSize: 15,
        fontWeight: '700',
        color: GOOGLE_GREEN,
        letterSpacing: 0.3,
    },
    startBtn: {
        backgroundColor: GOOGLE_BLUE,
        borderRadius: 24,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: GOOGLE_BLUE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    startBtnText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 16,
    },
    statusChip: {
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        marginBottom: 4,
    },
    statusChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },

    /* ── Pin Marker Container ── */
    pinMarkerContainer: {
        alignItems: 'center',
        justifyContent: 'flex-end',
    },

    /* ── Pickup Pin (Green teardrop, minimal) ── */
    pickupPin: {
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    pickupPinCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: GOOGLE_GREEN,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 2,
    },
    pickupPinInner: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
    },
    pickupPinTip: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 4,
        borderRightWidth: 4,
        borderTopWidth: 7,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: GOOGLE_GREEN,
        marginTop: -2,
        zIndex: 1,
    },

    /* ── Dropoff Pin (Red teardrop, minimal) ── */
    dropoffPin: {
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    dropoffPinCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: GOOGLE_RED,
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 2,
    },
    dropoffPinTip: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 4,
        borderRightWidth: 4,
        borderTopWidth: 7,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: GOOGLE_RED,
        marginTop: -2,
        zIndex: 1,
    },

    /* ── Driver Marker (Google blue navigation dot) ── */
    driverMarker: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: GOOGLE_BLUE,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30,
        borderWidth: 3,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 10,
    },
    driverMarkerCore: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ffffff',
    },
    driverArrow: {
        position: 'absolute',
        top: -8,
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderBottomWidth: 9,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: GOOGLE_BLUE,
    },

    /* ── Ghost Pins (non-focused orders) ── */
    ghostPickupPin: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#34A853',
        opacity: 0.45,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    ghostDropoffPin: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#EA4335',
        opacity: 0.45,
        borderWidth: 1.5,
        borderColor: '#fff',
    },

    /* ── Orders Panel (slide-up sheet, inside mapContainer) ── */
    ordersPanel: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: 300,
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 20,
        overflow: 'hidden',
        zIndex: 50,
    },
    /* ── Orders Pill Toggle Button (floating, always visible on map) ── */
    ordersPillBtn: {
        position: 'absolute',
        left: 16,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: '#1F2937',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 8,
        zIndex: 40,
    },
    ordersPillBtnText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    ordersPanelHeader: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 6,
    },
    ordersPanelHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
        alignSelf: 'center',
        marginBottom: 8,
    },
    ordersPanelHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ordersPanelTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
        letterSpacing: 0.2,
    },
    ordersPanelChevron: {
        fontSize: 14,
        color: '#6B7280',
    },
    ordersPanelList: {
        flex: 1,
    },

    /* ── Order Card ── */
    orderCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F3F4F6',
        backgroundColor: '#ffffff',
    },
    orderCardFocused: {
        backgroundColor: '#EFF6FF',
        borderLeftWidth: 3,
        borderLeftColor: '#3B82F6',
    },
    orderCardLeft: {
        width: 28,
        alignItems: 'center',
    },
    orderStatusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    orderCardContent: {
        flex: 1,
        marginLeft: 4,
    },
    orderCardBiz: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1F2937',
    },
    orderCardCustomer: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 1,
    },
    orderCardAddress: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 1,
    },
    orderCardFocusedBadge: {
        backgroundColor: '#DBEAFE',
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    orderCardFocusedBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#2563EB',
        letterSpacing: 0.3,
    },
});
