import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { ASSIGN_DRIVER_TO_ORDER, GET_ORDER, UPDATE_ORDER_STATUS } from '@/graphql/operations/orders';
import { useTheme } from '@/hooks/useTheme';
import { useDriverLocationOverrideStore } from '@/store/driverLocationOverrideStore';
import { useAuthStore } from '@/store/authStore';
import type { Feature, LineString } from 'geojson';

// ─────────────────────── Custom Hooks ───────────────────────
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { useNavigationState } from '@/hooks/useNavigationState';
import { useNavigationCamera } from '@/hooks/useNavigationCamera';
import { useNavigationRoute } from '@/hooks/useNavigationRoute';
import { useOffRouteDetection } from '@/hooks/useOffRouteDetection';
import { useNavigationSteps } from '@/hooks/useNavigationSteps';
import { useNavigationSimulation } from '@/hooks/useNavigationSimulation';
import { usePredictedTracking } from '@/hooks/usePredictedTracking';

// ─────────────────────── Components ───────────────────────
import { InstructionBanner } from '@/components/navigation/InstructionBanner';
import { NavigationBottomPanel } from '@/components/navigation/NavigationBottomPanel';
import { RecenterButton } from '@/components/navigation/RecenterButton';

/* ─────────────────────── constants ─────────────────────── */

const GJILAN_CENTER: [number, number] = [21.4694, 42.4635];
const GJILAN_NE: [number, number] = [21.51, 42.50];
const GJILAN_SW: [number, number] = [21.42, 42.43];
const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';
const DESTINATION_REACHED_THRESHOLD_M = 25;

/* ═══════════════════════════════════════════════════════════ */

export default function OrderMapScreen() {
    const router = useRouter();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { orderId } = useLocalSearchParams<{ orderId?: string }>();
    const { setLocationOverride, clearLocationOverride } = useDriverLocationOverrideStore();
    const currentDriverId = useAuthStore((state) => state.user?.id);

    // ═══════════════ Query Order Data ═══════════════
    const { data, loading, refetch } = useQuery(GET_ORDER, {
        variables: { id: orderId },
        skip: !orderId,
    });
    const [updateOrderStatus, { loading: updatingOrderStatus }] = useMutation(UPDATE_ORDER_STATUS);
    const [assignDriverToOrder] = useMutation(ASSIGN_DRIVER_TO_ORDER);

    const order = (data as any)?.order;
    const [previewRoutePulse, setPreviewRoutePulse] = useState(0.6);
    const [showRelockChip, setShowRelockChip] = useState(false);
    const relockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastViewportSaveRef = useRef(0);
    const wasFollowingBeforeOverviewRef = useRef(false);

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

    // ═══════════════ Custom Hooks ═══════════════
    const { location, locationRef, permissionGranted, error: locationError } = useDriverLocation({
        smoothing: true,
        timeInterval: 2000,
        distanceFilter: 5,
    });

    const {
        isSimulating,
        simulatedLocation,
        startSimulation,
        stopSimulation,
        toggleSimulation,
    } = useNavigationSimulation({
        speedKmh: 40, // Realistic city driving speed
        updateIntervalMs: 200, // Update every 200ms for ultra-smooth movement
    });

    // Use simulated location when simulation is active, otherwise use real GPS
    const effectiveLocation = isSimulating ? simulatedLocation : location;

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
        cycleFollowMode,
        recenter,
        fitBounds,
        handleMapPress,
        saveViewportPreference,
    } = useNavigationCamera();

    const driverMarkerRef = useRef<any>(null);
    const driverArrowRef = useRef<any>(null);

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
        deadZoneOffsetMeters: 95,
        headingSnapThresholdDeg: 10,
        adaptiveZoom: true,
    });

    const {
        route,
        isLoading: isRouteLoading,
        error: routeError,
        fetchRoute,
        clearRoute,
        shouldReroute,
        lastRerouteTime,
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

    // ═══════════════ Status-Driven Single-Leg Routing ═══════════════
    // Preview route before navigation starts OR fetch route during navigation
    // Route leg is determined purely by order status:
    // - ACCEPTED/READY → driver to pickup
    // - OUT_FOR_DELIVERY → driver to dropoff
    useEffect(() => {
        if (!effectiveLocation || !pickup || !dropoff) return;

        // Determine destination based on order status
        const destination =
            order?.status === 'ACCEPTED' || order?.status === 'READY'
                ? pickup
                : order?.status === 'OUT_FOR_DELIVERY'
                ? dropoff
                : null;

        if (!destination) {
            clearRoute();
            return;
        }

        fetchRoute(effectiveLocation, destination);
    }, [
        effectiveLocation,
        order?.status,
        pickup,
        dropoff,
        fetchRoute,
        clearRoute,
    ]);

    // Simulation remains manual-only (no auto-start)

    // Sync simulated location into heartbeat pipeline for admin tracking
    useEffect(() => {
        if (isSimulating && simulatedLocation) {
            setLocationOverride({
                latitude: simulatedLocation.latitude,
                longitude: simulatedLocation.longitude,
            });
            return;
        }

        clearLocationOverride();
    }, [isSimulating, simulatedLocation, setLocationOverride, clearLocationOverride]);

    useEffect(() => {
        return () => {
            clearLocationOverride();
        };
    }, [clearLocationOverride]);

    // Reroute logic: off-route detection + periodic updates
    useEffect(() => {
        if (!isNavigating || !effectiveLocation || !route) return;

        const destination = isNavigatingToPickup ? pickup : dropoff;
        if (!destination) return;

        const offRoute = checkOffRoute(effectiveLocation, route.coordinates);
        const needsReroute = shouldReroute(effectiveLocation, offRoute);

        if (needsReroute) {
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

        // Don't force follow mode - let driver control camera manually
        // enableFollowMode(); // Removed: allow manual camera control like Google Maps
    };

    const handleOutForDelivery = async () => {
        if (!pickup || !dropoff || !orderId) return;
        if (!currentDriverId) {
            Alert.alert('Error', 'Driver profile not loaded. Please re-login.');
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
            await refetch();
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
            await refetch();
        } catch (error) {
            console.error('[OrderMap] Failed to update status to OUT_FOR_DELIVERY', error);
            Alert.alert('Update failed', 'Order could not be moved to OUT_FOR_DELIVERY.');
            await refetch();
        }
    };

    const handleStopNavigation = () => {
        stopNav();
        clearRoute();
        resetSteps();
        disableFollowMode();
        stopSimulation(); // Stop simulation when navigation ends
    };

    const handleRecenter = () => {
        if (!effectiveLocation || !cameraRef.current) return;
        
        // Recenter to driver position with navigation settings
        cameraRef.current.setCamera({
            centerCoordinate: [effectiveLocation.longitude, effectiveLocation.latitude],
            zoomLevel: 18.5,
            pitch: 60,
            heading: effectiveLocation.heading || 0,
            animationDuration: 600,
        });
    };

    const handleToggleSimulation = () => {
        if (!route || route.coordinates.length < 2) {
            Alert.alert('No route', 'Cannot start simulation without a route');
            return;
        }

        if (isSimulating) {
            stopSimulation();
        } else {
            // Start simulation following the actual route polyline
            startSimulation(route.coordinates);
        }
    };

    const handleToggleCameraLock = () => {
        if (followMode === 'free') {
            setFollowMode('heading-up');
            setShowRelockChip(false);
            return;
        }

        setFollowMode('free');
    };

    const handleCycleFollowMode = () => {
        cycleFollowMode();
        setShowRelockChip(false);
    };

    const clearRelockTimer = () => {
        if (relockTimerRef.current) {
            clearTimeout(relockTimerRef.current);
            relockTimerRef.current = null;
        }
    };

    const triggerAutoUnlock = () => {
        if (!isFollowing) return;

        setFollowMode('free');
        setShowRelockChip(true);
        clearRelockTimer();

        relockTimerRef.current = setTimeout(() => {
            const speed = effectiveLocation?.speed ?? 0;
            if (speed >= 5) {
                setFollowMode('heading-up');
                setShowRelockChip(false);
                return;
            }

            setShowRelockChip(true);
        }, 8000);
    };

    const handleMapTouchStart = () => {
        triggerAutoUnlock();
    };

    const handleCameraChanged = (event: any) => {
        const now = Date.now();
        if (now - lastViewportSaveRef.current < 1200) return;

        const properties = event?.properties;
        const zoom = properties?.zoom;
        const pitch = properties?.pitch;

        if (typeof zoom === 'number' && typeof pitch === 'number') {
            saveViewportPreference(zoom, pitch);
            lastViewportSaveRef.current = now;
        }
    };

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

    useEffect(() => {
        return () => {
            clearRelockTimer();
        };
    }, []);

    // ═══════════════ Derived Values ═══════════════
    const routeShape = useMemo<Feature<LineString> | null>(() => {
        if (!route || route.coordinates.length < 2) return null;
        return {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: route.coordinates },
        };
    }, [route]);

    const headingTo = isNavigatingToPickup ? 'Pickup' : 'Drop-off';
    // Fix: route.duration is in SECONDS from Mapbox API, convert to minutes
    const eta = route ? Math.round(route.duration / 60) : null;
    const distKm = route ? route.distance / 1000 : null;
    const isPreviewMode = !isNavigating && order?.status === 'READY';
    const etaArrivalText = eta != null
        ? new Date(Date.now() + eta * 60 * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
          })
        : undefined;

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
            {/* ── INSTRUCTION BANNER (Navigation mode) ── */}
            {isNavigating && currentStep && (
                <InstructionBanner
                    currentStep={currentStep}
                    nextStep={nextStep}
                    topInset={insets.top}
                />
            )}

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
            <View style={styles.mapContainer}>
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
                    onTouchStart={handleMapTouchStart}
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

                    {/* Driver position marker - clean design */}
                    {effectiveLocation && (
                        <Mapbox.PointAnnotation
                            id="driver-position"
                            ref={driverMarkerRef}
                            coordinate={[effectiveLocation.longitude, effectiveLocation.latitude]}
                        >
                            <View style={styles.driverMarker}>
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

                    {/* Route line - Modern gradient style with glow */}
                    {routeShape && (
                        <Mapbox.ShapeSource id="route-source" shape={routeShape}>
                            {/* Outer glow */}
                            <Mapbox.LineLayer
                                id="route-outer-glow"
                                style={{
                                    lineColor: isPreviewMode ? '#3b82f6' : '#06b6d4',
                                    lineWidth: 16,
                                    lineOpacity: isPreviewMode ? 0.15 : 0.2,
                                    lineCap: 'round' as const,
                                    lineJoin: 'round' as const,
                                    lineBlur: 4,
                                }}
                            />
                            {/* Middle glow */}
                            <Mapbox.LineLayer
                                id="route-middle-glow"
                                style={{
                                    lineColor: isPreviewMode ? '#60a5fa' : '#22d3ee',
                                    lineWidth: 12,
                                    lineOpacity: isPreviewMode ? 0.25 : 0.35,
                                    lineCap: 'round' as const,
                                    lineJoin: 'round' as const,
                                    lineBlur: 2,
                                }}
                            />
                            {/* Dark casing */}
                            <Mapbox.LineLayer
                                id="route-casing"
                                style={{
                                    lineColor: '#0f172a',
                                    lineWidth: 9,
                                    lineOpacity: 0.8,
                                    lineCap: 'round' as const,
                                    lineJoin: 'round' as const,
                                }}
                            />
                            {/* Main route line - gradient effect */}
                            <Mapbox.LineLayer
                                id="route-fill"
                                style={{
                                    lineColor: isPreviewMode ? '#3b82f6' : '#06b6d4',
                                    lineWidth: 6,
                                    lineOpacity: isPreviewMode ? previewRoutePulse : 1,
                                    lineCap: 'round' as const,
                                    lineJoin: 'round' as const,
                                }}
                            />
                            {/* Inner highlight */}
                            <Mapbox.LineLayer
                                id="route-highlight"
                                style={{
                                    lineColor: '#ffffff',
                                    lineWidth: 2,
                                    lineOpacity: isPreviewMode ? previewRoutePulse * 0.4 : 0.5,
                                    lineCap: 'round' as const,
                                    lineJoin: 'round' as const,
                                }}
                            />
                        </Mapbox.ShapeSource>
                    )}

                    {/* Pickup marker - business style (orange circle) */}
                    {pickup && (
                        <Mapbox.PointAnnotation
                            id="marker-pickup"
                            coordinate={[pickup.longitude, pickup.latitude]}
                        >
                            <View style={styles.businessMarker}>
                                <View style={styles.businessMarkerInner} />
                            </View>
                            <Mapbox.Callout title={pickupLabel} />
                        </Mapbox.PointAnnotation>
                    )}

                    {/* Dropoff marker - package icon in status-colored circle */}
                    {dropoff && (
                        <Mapbox.PointAnnotation
                            id="marker-dropoff"
                            coordinate={[dropoff.longitude, dropoff.latitude]}
                        >
                            <View style={styles.dropoffMarker}>
                                <Text style={styles.dropoffIcon}>📦</Text>
                            </View>
                            <Mapbox.Callout title={dropoffLabel} />
                        </Mapbox.PointAnnotation>
                    )}
                </Mapbox.MapView>

                {/* Simulation control button */}
                {route && route.coordinates.length >= 2 && (
                    <Pressable
                        style={[
                            styles.simulationButton,
                            { bottom: 340 },
                            isSimulating && styles.simulationButtonActive,
                        ]}
                        onPress={handleToggleSimulation}
                    >
                        <Text style={styles.simulationButtonIcon}>
                            {isSimulating ? '⏹' : '▶️'}
                        </Text>
                    </Pressable>
                )}

                {/* Camera lock toggle button (always available) */}
                <Pressable
                    style={[
                        styles.cameraLockButton,
                        { bottom: 270 },
                        followMode !== 'free' && styles.cameraLockButtonActive,
                    ]}
                    onPress={handleToggleCameraLock}
                >
                    <Text style={styles.cameraLockIcon}>
                        {followMode === 'free' ? '🔓' : '🔒'}
                    </Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.followModeButton,
                        { bottom: 270 },
                    ]}
                    onPress={handleCycleFollowMode}
                >
                    <Text style={styles.followModeButtonText}>
                        {followMode === 'heading-up' ? 'Heading' : followMode === 'north-up' ? 'North' : 'Free'}
                    </Text>
                </Pressable>

                {showRelockChip && (
                    <Pressable
                        style={styles.relockChip}
                        onPress={() => {
                            setFollowMode('heading-up');
                            setShowRelockChip(false);
                        }}
                    >
                        <Text style={styles.relockChipText}>Relock camera</Text>
                    </Pressable>
                )}

                {/* Recenter to driver button */}
                <RecenterButton
                    onPress={handleRecenter}
                    onPressIn={handleOverviewPressIn}
                    onPressOut={handleOverviewPressOut}
                    bottom={200}
                    right={16}
                />
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
                            onPress={order?.status === 'READY' ? handleOutForDelivery : handleStartNavigation}
                            disabled={updatingOrderStatus}
                        >
                            <Text style={styles.startBtnText}>
                                {updatingOrderStatus
                                    ? 'Updating…'
                                    : order?.status === 'READY'
                                    ? 'Out for Delivery'
                                    : 'Start Navigation'}
                            </Text>
                        </Pressable>
                    ) : (
                        <View style={styles.statusChip}>
                            <Text style={styles.statusChipText}>
                                {order?.status?.replace(/_/g, ' ') ?? 'Loading…'}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

/* ═══════════════════ STYLES ═══════════════════ */

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    /* ── top bar ── */
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    backArrow: { fontSize: 20, color: '#3b82f6' },
    topBarTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 15,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: 0.5,
    },

    /* ── map ── */
    mapContainer: { flex: 1 },
    map: { flex: 1 },

    /* ── floating action button ── */
    fab: {
        position: 'absolute',
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#0d1b2a',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(77, 184, 255, 0.3)',
    },
    fabActive: {
        backgroundColor: '#1a5490',
        borderColor: '#4db8ff',
        borderWidth: 2,
    },
    fabIcon: { fontSize: 24, color: '#4db8ff' },

    /* ── simulation button ── */
    simulationButton: {
        position: 'absolute',
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(22, 163, 74, 0.95)',
        backdropFilter: 'blur(10px)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#16a34a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1.5,
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    simulationButtonActive: {
        backgroundColor: 'rgba(220, 38, 38, 0.95)',
        shadowColor: '#dc2626',
        borderColor: 'rgba(239, 68, 68, 0.4)',
    },
    simulationButtonIcon: {
        fontSize: 22,
        color: '#ffffff',
    },

    /* ── camera lock button ── */
    cameraLockButton: {
        position: 'absolute',
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(59, 130, 246, 0.95)',
        backdropFilter: 'blur(10px)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1.5,
        borderColor: 'rgba(96, 165, 250, 0.3)',
    },
    cameraLockButtonActive: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        shadowColor: '#0f172a',
        borderColor: 'rgba(148, 163, 184, 0.3)',
    },
    cameraLockIcon: {
        fontSize: 24,
        color: '#ffffff',
    },

    followModeButton: {
        position: 'absolute',
        right: 84,
        minWidth: 86,
        height: 42,
        borderRadius: 12,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.25)',
        paddingHorizontal: 12,
    },
    followModeButtonText: {
        color: '#e2e8f0',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },

    relockChip: {
        position: 'absolute',
        top: 22,
        alignSelf: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.5)',
    },
    relockChipText: {
        color: '#bfdbfe',
        fontSize: 12,
        fontWeight: '700',
    },

    /* ── recenter button ── */
    recenterButton: {
        position: 'absolute',
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(10px)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1.5,
        borderColor: 'rgba(148, 163, 184, 0.2)',
    },
    recenterButtonIcon: {
        fontSize: 18,
        color: '#ffffff',
    },

    /* ── markers ── */
    markerA: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#34A853',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
    },
    markerB: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EA4335',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
    },
    markerLetter: {
        color: '#ffffff',
        fontWeight: '800',
        fontSize: 16,
    },

    /* ── overview bottom card ── */
    overviewCard: {
        backgroundColor: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(20px)',
        paddingTop: 20,
        paddingHorizontal: 20,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        elevation: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
    },
    addressBlock: {
        marginBottom: 16,
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        padding: 16,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addressDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    addressTexts: { marginLeft: 12, flex: 1 },
    addressLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: '#94a3b8',
    },
    addressName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#f1f5f9',
        marginTop: 2,
    },
    addressConnector: {
        marginLeft: 5,
        height: 18,
        justifyContent: 'center',
    },
    connectorLine: {
        width: 2,
        height: 18,
        backgroundColor: '#2f3844',
    },
    etaBadge: {
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderRadius: 16,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(6, 182, 212, 0.3)',
    },
    etaBadgeText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#22d3ee',
        letterSpacing: 0.5,
    },
    startBtn: {
        backgroundColor: '#3b82f6',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    startBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16,
        letterSpacing: 0.5,
    },
    statusChip: {
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        marginBottom: 4,
    },
    statusChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#a0a0a0',
    },

    /* ── Marker Styles - Modern Design ── */
    businessMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(249, 115, 22, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2.5,
        borderColor: 'rgba(249, 115, 22, 0.5)',
        shadowColor: '#f97316',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    businessMarkerInner: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#f97316',
        borderWidth: 2,
        borderColor: 'rgba(253, 186, 116, 0.8)',
        shadowColor: '#f97316',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
    },
    dropoffMarker: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(6, 182, 212, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2.5,
        borderColor: 'rgba(6, 182, 212, 0.6)',
        shadowColor: '#06b6d4',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },
    dropoffIcon: {
        fontSize: 20,
    },

    /* ── Driver Marker (Clean Circle Design) ── */
    driverMarker: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#ffffff',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.7,
        shadowRadius: 12,
        elevation: 10,
    },
    driverArrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 9,
        borderRightWidth: 9,
        borderBottomWidth: 16,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#ffffff',
    },
});
