import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useQuery } from '@apollo/client/react';
import { GET_ORDER } from '@/graphql/operations/orders';
import { fetchNavigationRoute, fetchRouteGeometry, NavigationStep } from '@/utils/mapbox';
import { useTheme } from '@/hooks/useTheme';
import type { Feature, LineString } from 'geojson';

/* ─────────────────────── constants ─────────────────────── */

const GJILAN_CENTER: [number, number] = [21.4694, 42.4635];
const GJILAN_NE: [number, number] = [21.51, 42.50];
const GJILAN_SW: [number, number] = [21.42, 42.43];
const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';
const NAV_ZOOM = 18.5; // Close, immersive view (Google Maps navigation style)
const NAV_PITCH = 55; // 3D tilted view (Google Maps uses ~50-60°)
const NAV_HEADING_FOLLOW_BEARING = true; // Rotate map based on driver heading
const NAV_CAMERA_ANIMATION_MS = 250; // Smooth, responsive updates (not sluggish)
const OVERVIEW_ZOOM = 13;
const REROUTE_INTERVAL_MS = 30_000;
const OFF_ROUTE_THRESHOLD_M = 80;
const DESTINATION_REACHED_THRESHOLD_M = 25; // Auto-stop when within 25m

/* ─────────────────────── helpers ─────────────────────── */

function haversineMeters(
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number },
): number {
    const R = 6_371_000;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Minimum distance (m) from a point to the nearest vertex on the polyline. */
function minDistToPolyline(
    point: { latitude: number; longitude: number },
    coords: Array<[number, number]>,
): number {
    let best = Number.POSITIVE_INFINITY;
    for (const c of coords) {
        const d = haversineMeters(point, { latitude: c[1], longitude: c[0] });
        if (d < best) best = d;
    }
    return best;
}

function formatDist(meters: number): string {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
}

function maneuverArrow(type?: string, modifier?: string): string {
    if (type === 'arrive') return '🏁';
    if (type === 'depart') return '🚗';
    if (type === 'roundabout' || type === 'rotary') return '🔄';
    if (modifier?.includes('uturn')) return '↩️';
    if (modifier?.includes('sharp') && modifier.includes('left')) return '↰';
    if (modifier?.includes('sharp') && modifier.includes('right')) return '↱';
    if (modifier?.includes('left')) return '⬅';
    if (modifier?.includes('right')) return '➡';
    if (modifier?.includes('straight')) return '⬆';
    return '⬆';
}

/** Calculate bearing (degrees, 0-360) from point A to B (0° = North, 90° = East) */
function calculateBearing(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
): number {
    const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
    const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
}

/* ═══════════════════════════════════════════════════════════ */

export default function OrderMapScreen() {
    const router = useRouter();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { orderId } = useLocalSearchParams<{ orderId?: string }>();

    const { data, loading } = useQuery(GET_ORDER, {
        variables: { id: orderId },
        skip: !orderId,
    });

    const order = (data as any)?.order;

    /* ── derived points ── */

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

    const hasPickedUp = order?.status === 'OUT_FOR_DELIVERY';

    /* ── refs ── */

    const cameraRef = useRef<Mapbox.Camera>(null);
    const mapRef = useRef<Mapbox.MapView>(null);
    const driverLocRef = useRef<Location.LocationObjectCoords | null>(null);
    const hasFitted = useRef(false);
    const lastRerouteRef = useRef(0);
    const prevPickedUpRef = useRef(hasPickedUp);

    /* ── state ── */

    const [driverLocation, setDriverLocation] = useState<Location.LocationObjectCoords | null>(null);
    const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>([]);
    const [eta, setEta] = useState<number | null>(null);
    const [distKm, setDistKm] = useState<number | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);
    const [navSteps, setNavSteps] = useState<NavigationStep[]>([]);
    const [stepIdx, setStepIdx] = useState(0);
    const [isFollowing, setIsFollowing] = useState(true); // Track if camera is auto-following

    // Use real GPS location
    const effectiveLocation = driverLocation;

    /* ── watch driver GPS ── */

    useEffect(() => {
        let sub: Location.LocationSubscription | null = null;
        let alive = true;

        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted' || !alive) return;
            sub = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 2000,
                    distanceInterval: 5,
                },
                (loc) => {
                    if (!alive) return;
                    driverLocRef.current = loc.coords;
                    setDriverLocation(loc.coords);
                },
            );
        })();

        return () => {
            alive = false;
            sub?.remove();
        };
    }, []);



    useEffect(() => {
        if (isNavigating || !pickup || !dropoff) return;
        fetchRouteGeometry(pickup, dropoff).then((r) => {
            if (!r) return;
            setRouteCoords(r.coordinates);
            setEta(Math.round(r.durationMin));
            setDistKm(r.distanceKm);
        });
    }, [pickup, dropoff, isNavigating]);

    /* ── navigation route fetch (uses ref for driver location) ── */

    const fetchNavRoute = useCallback(async () => {
        const loc = driverLocRef.current;
        if (!dropoff) return;

        // Use real GPS or fall back to Gjilan center
        const from = loc
            ? { latitude: loc.latitude, longitude: loc.longitude }
            : { latitude: GJILAN_CENTER[1], longitude: GJILAN_CENTER[0] };
        const dest = { latitude: dropoff.latitude, longitude: dropoff.longitude };

        // Include pickup as waypoint if driver hasn't picked up yet
        const waypoints =
            !hasPickedUp && pickup
                ? [{ latitude: pickup.latitude, longitude: pickup.longitude }]
                : [];

        const nav = await fetchNavigationRoute(from, dest, waypoints);
        if (!nav) {
            console.log('[NAV] fetchNavRoute: failed to fetch navigation');
            return;
        }

        console.log('[NAV] *** fetchNavRoute SUCCESS ***, got', nav.coordinates.length, 'coordinates,', nav.steps.length, 'steps');

        setRouteCoords(nav.coordinates);
        setEta(Math.round(nav.durationMin));
        setDistKm(nav.distanceKm);
        setNavSteps(nav.steps);
        setStepIdx(0);
        lastRerouteRef.current = Date.now();
    }, [pickup, dropoff, hasPickedUp]);

    /* ── start / stop navigation ── */

    const startNavigation = useCallback(() => {
        console.log('[NAV] *** START NAVIGATION ***');
        setIsNavigating(true);
        // fetchNavRoute will be called by the effect when isNavigating changes
    }, []);

    const stopNavigation = useCallback(() => {
        console.log('[NAV] *** STOP NAVIGATION ***');
        setIsNavigating(false);
        setNavSteps([]);
        setStepIdx(0);
        hasFitted.current = false;
    }, []);

    /* ── reroute: periodic + off-route detection ── */

    useEffect(() => {
        if (!isNavigating) {
            console.log('[NAV] Navigation ended');
            return;
        }
        console.log('[NAV] Navigation started, calling fetchNavRoute');
        fetchNavRoute();
    }, [isNavigating, fetchNavRoute]);

    useEffect(() => {
        if (!isNavigating || !effectiveLocation || routeCoords.length < 2) return;

        const now = Date.now();
        const driverPt = { latitude: effectiveLocation.latitude, longitude: effectiveLocation.longitude };
        const offRoute = minDistToPolyline(driverPt, routeCoords) > OFF_ROUTE_THRESHOLD_M;
        const stale = now - lastRerouteRef.current > REROUTE_INTERVAL_MS;

        if (offRoute || stale) {
            fetchNavRoute();
        }
    }, [isNavigating, effectiveLocation, routeCoords, fetchNavRoute]);

    /* ── reroute on order status change (picked up → new destination) ── */

    useEffect(() => {
        if (isNavigating && prevPickedUpRef.current !== hasPickedUp) {
            prevPickedUpRef.current = hasPickedUp;
            lastRerouteRef.current = 0;
            fetchNavRoute();
        }
    }, [isNavigating, hasPickedUp, fetchNavRoute]);

    /* ── auto-stop when destination reached ── */

    useEffect(() => {
        if (!isNavigating || !effectiveLocation || !dropoff) return;

        const distToDestM = haversineMeters(effectiveLocation, dropoff);
        if (distToDestM < DESTINATION_REACHED_THRESHOLD_M) {
            stopNavigation();
        }
    }, [isNavigating, effectiveLocation, dropoff, stopNavigation]);

    /* ── track current navigation step ── */

    useEffect(() => {
        if (!isNavigating || !effectiveLocation || navSteps.length === 0) return;

        const driverPt = { latitude: effectiveLocation.latitude, longitude: effectiveLocation.longitude };
        let bestIdx = stepIdx;
        let bestDist = Infinity;

        for (let i = stepIdx; i < navSteps.length; i++) {
            const step = navSteps[i];
            if (!step) continue;
            const d = haversineMeters(driverPt, {
                latitude: step.maneuverLocation[1],
                longitude: step.maneuverLocation[0],
            });
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }

        if (bestDist < 30 && bestIdx < navSteps.length - 1) {
            bestIdx += 1;
        }

        if (bestIdx !== stepIdx) setStepIdx(bestIdx);
    }, [isNavigating, effectiveLocation, navSteps, stepIdx]);

    /* ── initial camera fit (overview) ── */

    useEffect(() => {
        if (isNavigating || hasFitted.current || !cameraRef.current) return;

        const pts: Array<[number, number]> = [];
        if (pickup) pts.push([pickup.longitude, pickup.latitude]);
        if (dropoff) pts.push([dropoff.longitude, dropoff.latitude]);
        if (effectiveLocation) pts.push([effectiveLocation.longitude, effectiveLocation.latitude]);
        if (pts.length < 2) return;

        const lngs = pts.map((p) => p[0]);
        const lats = pts.map((p) => p[1]);

        cameraRef.current.fitBounds(
            [Math.max(...lngs), Math.max(...lats)],
            [Math.min(...lngs), Math.min(...lats)],
            [120, 60, 280, 60],
            800,
        );
        hasFitted.current = true;
    }, [pickup, dropoff, effectiveLocation, isNavigating]);



    /* ── derived values ── */

    const currentStep = navSteps[stepIdx] ?? null;
    const nextStep = navSteps[stepIdx + 1] ?? null;

    const routeShape = useMemo<Feature<LineString>>(
        () => ({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: routeCoords },
        }),
        [routeCoords],
    );

    const headingTo = hasPickedUp ? 'Drop-off' : 'Pickup';

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
            {/* ── TURN-BY-TURN INSTRUCTION BAR (navigation mode) ── */}
            {isNavigating && currentStep && (
                <View style={[styles.instructionBar, { paddingTop: insets.top + 8 }]}>
                    <View style={styles.instructionRow}>
                        <Text style={styles.maneuverIcon}>
                            {maneuverArrow(currentStep.maneuverType, currentStep.maneuverModifier)}
                        </Text>
                        <View style={styles.instructionTextWrap}>
                            <Text style={styles.instructionDist}>
                                {formatDist(currentStep.distanceM)}
                            </Text>
                            <Text style={styles.instructionLabel} numberOfLines={2}>
                                {currentStep.instruction}
                            </Text>
                        </View>
                    </View>
                    {nextStep && (
                        <View style={styles.thenRow}>
                            <Text style={styles.thenText}>
                                Then{' '}
                                {maneuverArrow(nextStep.maneuverType, nextStep.maneuverModifier)}{' '}
                                {nextStep.instruction}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* ── BACK BAR (overview mode) ── */}
            {!isNavigating && (
                <View style={[styles.topBarOverview, { paddingTop: insets.top }]}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backArrow}>{'←'}</Text>
                    </Pressable>
                    <Text style={styles.topBarTitle}>
                        {hasPickedUp ? 'Delivering Order' : 'Picking Up Order'}
                    </Text>
                    <View style={{ width: 44 }} />
                </View>
            )}

            {/* ── MAP ── */}
            <View style={styles.mapContainer}>
                <Mapbox.MapView
                    ref={mapRef}
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
                    onPress={() => {
                        console.log('[MAP] User touched map, disabling auto-follow');
                        setIsFollowing(false);
                    }}
                    onLongPress={() => {
                        console.log('[MAP] User long-pressed map, disabling auto-follow');
                        setIsFollowing(false);
                    }}
                >
                    {/* 
                        Navigation Camera: Uses native Mapbox followUserLocation for smooth Uber-like experience
                        - followUserLocation: Auto-follows driver puck
                        - followUserMode="course": Rotates map based on bearing
                        - followZoomLevel: Close, immersive view
                        - followPitch: Steep 3D perspective
                    */}
                    {isNavigating && isFollowing && effectiveLocation ? (
                        <Mapbox.Camera
                            ref={cameraRef}
                            followUserLocation={true}
                            followZoomLevel={NAV_ZOOM}
                            followPitch={NAV_PITCH}
                            animationDuration={NAV_CAMERA_ANIMATION_MS}
                        />
                    ) : !isNavigating && effectiveLocation ? (
                        <Mapbox.Camera
                            ref={cameraRef}
                            defaultSettings={{
                                centerCoordinate: GJILAN_CENTER,
                                zoomLevel: OVERVIEW_ZOOM,
                            }}
                            maxBounds={{
                                ne: GJILAN_NE,
                                sw: GJILAN_SW,
                            }}
                        />
                    ) : null}
                    {/* 
                        Puck: Use native UserLocation for real GPS, custom marker for simulation
                        - Real GPS: Native UserLocation (smooth Mapbox handling)
                        - Simulation: Custom marker (shows simulated position)
                    */}
                    {driverLocation && (
                        // Real GPS: Native puck
                        <Mapbox.UserLocation
                            visible={true}
                            showsUserHeadingIndicator={true}
                        />
                    )}

                    {/* Route line: casing + fill (night mode colors) */}
                    {routeCoords.length > 1 && (
                        <Mapbox.ShapeSource id="route-source" shape={routeShape}>
                            <Mapbox.LineLayer
                                id="route-casing"
                                style={{
                                    lineColor: '#1a5490', // Darker blue for night
                                    lineWidth: 10,
                                    lineOpacity: 0.4,
                                    lineCap: 'round' as const,
                                    lineJoin: 'round' as const,
                                }}
                            />
                            <Mapbox.LineLayer
                                id="route-fill"
                                style={{
                                    lineColor: '#4db8ff', // Bright blue for night visibility
                                    lineWidth: 6,
                                    lineOpacity: 1,
                                    lineCap: 'round' as const,
                                    lineJoin: 'round' as const,
                                }}
                            />
                        </Mapbox.ShapeSource>
                    )}

                    {/* PICKUP marker (A) – green */}
                    {pickup && (
                        <Mapbox.PointAnnotation
                            id="marker-pickup"
                            coordinate={[pickup.longitude, pickup.latitude]}
                        >
                            <View style={styles.markerA}>
                                <Text style={styles.markerLetter}>A</Text>
                            </View>
                            <Mapbox.Callout title={pickupLabel} />
                        </Mapbox.PointAnnotation>
                    )}

                    {/* DROPOFF marker (B) – red */}
                    {dropoff && (
                        <Mapbox.PointAnnotation
                            id="marker-dropoff"
                            coordinate={[dropoff.longitude, dropoff.latitude]}
                        >
                            <View style={styles.markerB}>
                                <Text style={styles.markerLetter}>B</Text>
                            </View>
                            <Mapbox.Callout title={dropoffLabel} />
                        </Mapbox.PointAnnotation>
                    )}
                </Mapbox.MapView>

                {/* Floating re-center button (during navigation) */}
                {isNavigating && (
                    <Pressable
                        style={[styles.fab, { bottom: 200, right: 16 }]}
                        onPress={() => {
                            const loc = driverLocRef.current;
                            if (!loc || !cameraRef.current) return;
                            
                            console.log('[RECENTER] Re-enabling camera auto-follow');
                            setIsFollowing(true); // Re-enable auto-follow
                            
                            cameraRef.current.setCamera({
                                centerCoordinate: [loc.longitude, loc.latitude],
                                zoomLevel: NAV_ZOOM,
                                pitch: NAV_PITCH,
                                heading: loc.heading ?? 0,
                                animationDuration: 600,
                            });
                        }}
                    >
                        <Text style={styles.fabIcon}>◎</Text>
                    </Pressable>
                )}

                {/* Floating fit-all button (overview) */}
                {!isNavigating && (
                    <Pressable
                        style={[styles.fab, { bottom: 260, right: 16 }]}
                        onPress={() => {
                            if (!cameraRef.current) return;
                            const pts: Array<[number, number]> = [];
                            if (pickup) pts.push([pickup.longitude, pickup.latitude]);
                            if (dropoff) pts.push([dropoff.longitude, dropoff.latitude]);
                            if (driverLocation)
                                pts.push([driverLocation.longitude, driverLocation.latitude]);
                            if (pts.length < 2) return;
                            const lngs = pts.map((p) => p[0]);
                            const lats = pts.map((p) => p[1]);
                            cameraRef.current.fitBounds(
                                [Math.max(...lngs), Math.max(...lats)],
                                [Math.min(...lngs), Math.min(...lats)],
                                [120, 60, 280, 60],
                                800,
                            );
                        }}
                    >
                        <Text style={styles.fabIcon}>⊡</Text>
                    </Pressable>
                )}
            </View>

            {/* ════════════ BOTTOM PANEL ════════════ */}
            {isNavigating ? (
                /* ── Navigation bottom strip ── */
                <View style={[styles.navBottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                    <View style={styles.navHeadingRow}>
                        <View
                            style={[
                                styles.navHeadingDot,
                                { backgroundColor: hasPickedUp ? '#EA4335' : '#34A853' },
                            ]}
                        />
                        <Text style={styles.navHeadingText}>Heading to {headingTo}</Text>
                    </View>
                    <View style={styles.navStatsRow}>
                        <View style={styles.navStat}>
                            <Text style={styles.navStatValue}>{eta ?? '–'}</Text>
                            <Text style={styles.navStatUnit}>min</Text>
                        </View>
                        <View style={styles.navDivider} />
                        <View style={styles.navStat}>
                            <Text style={styles.navStatValue}>
                                {distKm != null ? distKm.toFixed(1) : '–'}
                            </Text>
                            <Text style={styles.navStatUnit}>km</Text>
                        </View>
                        <Pressable style={styles.endBtn} onPress={stopNavigation}>
                            <Text style={styles.endBtnText}>End</Text>
                        </Pressable>
                    </View>


                </View>
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
                            onPress={startNavigation}
                        >
                            <Text style={styles.startBtnText}>Start Navigation</Text>
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

const BLUE = '#4285F4';
const BLUE_DARK = '#1a73e8';

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    /* ── instruction bar (night mode) ── */
    instructionBar: {
        backgroundColor: '#0d1b2a', // Deep dark
        paddingHorizontal: 20,
        paddingBottom: 14,
        zIndex: 10,
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    maneuverIcon: {
        fontSize: 38,
        color: '#fff',
        width: 56,
        textAlign: 'center',
    },
    instructionTextWrap: { flex: 1, marginLeft: 10 },
    instructionDist: {
        fontSize: 26,
        fontWeight: '700',
        color: '#4db8ff', // Bright blue for visibility
    },
    instructionLabel: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
    },
    thenRow: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    thenText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

    /* ── top bar (overview, night mode) ── */
    topBarOverview: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 8,
        backgroundColor: '#1a1a1a',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        zIndex: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backArrow: { fontSize: 24, color: '#4db8ff' },
    topBarTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },

    /* ── map ── */
    mapContainer: { flex: 1 },
    map: { flex: 1 },

    /* ── floating action buttons (night mode) ── */
    fab: {
        position: 'absolute',
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#2a2a2a',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    fabIcon: { fontSize: 22, color: '#4db8ff' },

    /* ── markers ── */
    markerA: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#34A853',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    markerB: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#EA4335',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    markerLetter: {
        color: '#ffffff',
        fontWeight: '800',
        fontSize: 15,
    },

    /* ── navigation bottom strip (night mode) ── */
    navBottom: {
        backgroundColor: '#1a1a1a',
        paddingTop: 14,
        paddingHorizontal: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#333',
    },
    navHeadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    navHeadingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    navHeadingText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#e0e0e0',
    },
    navStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    navStat: { alignItems: 'center', flex: 1 },
    navStatValue: {
        fontSize: 30,
        fontWeight: '700',
        color: '#4db8ff',
    },
    navStatUnit: {
        fontSize: 13,
        color: '#a0a0a0',
        marginTop: 2,
    },
    navDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#333',
        marginHorizontal: 4,
    },
    endBtn: {
        backgroundColor: '#d32f2f', // Red for night
        borderRadius: 26,
        paddingHorizontal: 30,
        paddingVertical: 14,
        marginLeft: 8,
    },
    endBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },

    /* ── overview bottom card (night mode) ── */
    overviewCard: {
        backgroundColor: '#1a1a1a',
        paddingTop: 20,
        paddingHorizontal: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    addressBlock: { marginBottom: 14 },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addressDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    addressTexts: { marginLeft: 12, flex: 1 },
    addressLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6,
        color: '#888',
    },
    addressName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#e0e0e0',
        marginTop: 1,
    },
    addressConnector: {
        marginLeft: 5,
        height: 18,
        justifyContent: 'center',
    },
    connectorLine: {
        width: 2,
        height: 18,
        backgroundColor: '#333',
    },
    etaBadge: {
        backgroundColor: '#2a2a3e',
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        marginBottom: 14,
    },
    etaBadgeText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#4db8ff',
    },
    startBtn: {
        backgroundColor: '#1a73e8',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 4,
    },
    startBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 17,
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

    /* ── driver puck (night mode) ── */
    driverPuck: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(77,184,255,0.2)', // Bright blue with transparency for night
        alignItems: 'center',
        justifyContent: 'center',
    },
    driverPuckInner: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4db8ff', // Bright blue for night
        borderWidth: 2.5,
        borderColor: '#ffffff',
    },
    driverPuckArrow: {
        position: 'absolute',
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderBottomWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#4db8ff',
        top: -8,
    },

    /* ── debug button (dev mode) ── */
    debugBtn: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    debugBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ffffff',
    },
    debugPanel: {
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(10,10,10,0.8)',
        borderRadius: 8,
        borderTopWidth: 1,
        borderTopColor: '#3a3a3a',
    },
    debugText: {
        fontSize: 10,
        color: '#8a8a8a',
        marginTop: 4,
        fontFamily: 'monospace',
    },
});
