import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Linking, Dimensions, ScrollView, LayoutAnimation, Platform, UIManager, Modal } from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { Order, OrderStatus } from '@/gql/graphql';
import { Image } from 'expo-image';
import { useQuery, useSubscription } from '@apollo/client/react';
import { GET_ORDER_DRIVER } from '@/graphql/operations/orders';
import { ORDER_DRIVER_LIVE_TRACKING } from '@/graphql/operations/orders/subscriptions';
import { useUpdateOrderStatus } from '../hooks/useOrders';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
    FadeIn,
    FadeInDown,
    FadeOut,
} from 'react-native-reanimated';
import { calculateHaversineDistance } from '@/utils/haversine';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { useLiveActivity } from '@/hooks/useLiveActivity';
import { fetchRoute } from '@/utils/route';

// Lazy-load MapLibreGL to prevent crash if native module has issues
let MapLibreGL: any = null;
try {
    MapLibreGL = require('@/components/MapWrapper').MapLibreGL;
} catch (e) {
    console.warn('[OrderDetails] Failed to load MapWrapper:', e);
}

// ─── Map Error Boundary ─────────────────────────────────────
class MapErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[MapErrorBoundary] Map crashed:', error, info);
    }
    render() {
        if (this.state.hasError || !MapLibreGL) return this.props.fallback;
        return this.props.children;
    }
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Mapbox Style ──────────────────────────────────────────
const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11';

// ─── Gjilan City Bounds ─────────────────────────────────────
const GJILAN_BOUNDS = {
    ne: [21.54, 42.52] as [number, number], // northeast (wider for tile rendering)
    sw: [21.40, 42.40] as [number, number], // southwest
};

// ─── Helper Functions ───────────────────────────────────────
const formatOrderDate = (value?: string | null) => {
    if (!value) return 'Unknown date';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown date';
    return parsed.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatCurrency = (value: unknown) => {
    const numberValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numberValue)) {
        return '0.00';
    }
    return numberValue.toFixed(2);
};

const toText = (value: unknown) => {
    if (typeof value === 'string') {
        return value;
    }
    if (value === null || value === undefined) {
        return '';
    }
    return String(value);
};

const shortOrderId = (value: unknown, count = 8) => {
    const text = toText(value);
    if (!text) {
        return '';
    }
    return text.slice(-count).toUpperCase();
};

const LIVE_DRIVER_ETA_TTL_MS = 20_000;
const DRIVER_INTERPOLATION_TICK_MS = 50;
const DRIVER_INTERPOLATION_MIN_MS = 220;
const DRIVER_INTERPOLATION_MAX_MS = 6_000;
const DRIVER_INTERPOLATION_RATIO = 0.82;
const DRIVER_POSITION_EPSILON = 0.00001;
const DRIVER_TELEPORT_GUARD_KM = 0.8;
const ROUTE_SNAP_MAX_DISTANCE_M = 45;
const ROUTE_SNAP_FALLBACK_DISTANCE_M = 70;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#16A34A', '#4F46E5'];

const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = toText(firstName).trim().charAt(0).toUpperCase();
    const last = toText(lastName).trim().charAt(0).toUpperCase();
    return `${first}${last}`.trim() || '?';
};

const getAvatarColor = (id?: unknown) => {
    const idText = toText(id);
    if (!idText) return AVATAR_COLORS[0];
    const hash = idText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const calculateBearingDeg = (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
): number => {
    const fromLatRad = (fromLat * Math.PI) / 180;
    const toLatRad = (toLat * Math.PI) / 180;
    const deltaLngRad = ((toLng - fromLng) * Math.PI) / 180;
    const y = Math.sin(deltaLngRad) * Math.cos(toLatRad);
    const x =
        Math.cos(fromLatRad) * Math.sin(toLatRad) -
        Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(deltaLngRad);
    const angleDeg = (Math.atan2(y, x) * 180) / Math.PI;
    return (angleDeg + 360) % 360;
};

const toPlanarMeters = (latitude: number, longitude: number) => {
    const latRad = (latitude * Math.PI) / 180;
    const metersPerDegLat = 111_320;
    const metersPerDegLng = 111_320 * Math.cos(latRad);
    return {
        x: longitude * metersPerDegLng,
        y: latitude * metersPerDegLat,
    };
};

const projectPointToSegment = (
    point: { latitude: number; longitude: number },
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
) => {
    const pointM = toPlanarMeters(point.latitude, point.longitude);
    const fromM = toPlanarMeters(from.latitude, from.longitude);
    const toM = toPlanarMeters(to.latitude, to.longitude);

    const dx = toM.x - fromM.x;
    const dy = toM.y - fromM.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq <= 1e-9) {
        return {
            latitude: from.latitude,
            longitude: from.longitude,
            distanceM: Math.hypot(pointM.x - fromM.x, pointM.y - fromM.y),
        };
    }

    const t = clamp(((pointM.x - fromM.x) * dx + (pointM.y - fromM.y) * dy) / lengthSq, 0, 1);
    const projectedX = fromM.x + dx * t;
    const projectedY = fromM.y + dy * t;
    const distanceM = Math.hypot(pointM.x - projectedX, pointM.y - projectedY);

    return {
        latitude: from.latitude + (to.latitude - from.latitude) * t,
        longitude: from.longitude + (to.longitude - from.longitude) * t,
        distanceM,
    };
};

const snapPointToRoute = (
    point: { latitude: number; longitude: number },
    routeCoordinates: Array<{ latitude: number; longitude: number }>,
) => {
    if (routeCoordinates.length < 2) {
        return null;
    }

    let best: { latitude: number; longitude: number; distanceM: number } | null = null;

    for (let i = 0; i < routeCoordinates.length - 1; i += 1) {
        const projected = projectPointToSegment(point, routeCoordinates[i], routeCoordinates[i + 1]);
        if (!best || projected.distanceM < best.distanceM) {
            best = projected;
        }
    }

    return best;
};

// ─── Status Config ──────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
    color: string;
    bgColor: string;
    textColor: string;
    icon: keyof typeof Ionicons.glyphMap;
}> = {
    PENDING: { color: '#F59E0B', bgColor: '#FEF3C7', textColor: '#92400E', icon: 'time' },
    PREPARING: { color: '#7C3AED', bgColor: '#EDE9FE', textColor: '#5B21B6', icon: 'restaurant' },
    READY: { color: '#7C3AED', bgColor: '#EDE9FE', textColor: '#5B21B6', icon: 'restaurant' },
    OUT_FOR_DELIVERY: { color: '#22C55E', bgColor: '#DCFCE7', textColor: '#166534', icon: 'bicycle' },
    DELIVERED: { color: '#22C55E', bgColor: '#DCFCE7', textColor: '#166534', icon: 'checkmark-done-circle' },
    CANCELLED: { color: '#EF4444', bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'close-circle' },
};

// ─── Status Steps ───────────────────────────────────────────
const STATUS_ORDER = ['PENDING', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;

const STATUS_STEP_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    PENDING: 'time',
    PREPARING: 'restaurant',
    OUT_FOR_DELIVERY: 'bicycle',
    DELIVERED: 'checkmark-done-circle',
};

const getCustomerVisibleStatus = (status: string) => (status === 'READY' ? 'PREPARING' : status);

// ─── Pin Markers ────────────────────────────────────────────
const MapPin = ({
    icon,
    size = 44,
    shellColor = '#FFFFFF',
    coreColor = '#0F172A',
    iconSize = 18,
    scale = 1,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    size?: number;
    shellColor?: string;
    coreColor?: string;
    iconSize?: number;
    scale?: number;
}) => (
    <View style={{ alignItems: 'center' }}>
        <View style={{
            alignItems: 'center',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.16,
            shadowRadius: 14,
            elevation: 10,
        }}>
            <View style={{
                width: size * scale,
                height: size * scale,
                borderRadius: (size * scale) / 2,
                backgroundColor: shellColor,
                borderWidth: 2,
                borderColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
            }}>
                <View style={{
                    width: Math.round(size * 0.62 * scale),
                    height: Math.round(size * 0.62 * scale),
                    borderRadius: Math.round(size * 0.31 * scale),
                    backgroundColor: coreColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Ionicons name={icon} size={Math.round(iconSize * scale)} color="#FFFFFF" />
                </View>
            </View>
            <View style={{
                width: 18 * scale,
                height: 18 * scale,
                backgroundColor: shellColor,
                transform: [{ rotate: '45deg' }],
                marginTop: -9 * scale,
                borderBottomRightRadius: 5 * scale,
            }} />
        </View>
        <View style={{
            width: 18 * scale,
            height: 6 * scale,
            borderRadius: 999,
            backgroundColor: '#0000001A',
            marginTop: 1 * scale,
        }} />
    </View>
);

const VehiclePin = ({ icon, size = 28, rotationDeg = 0, scale = 1 }: { icon: keyof typeof Ionicons.glyphMap; size?: number; rotationDeg?: number; scale?: number }) => (
    <View style={{ alignItems: 'center' }}>
        <View style={{
            width: size * scale,
            height: size * scale,
            borderRadius: (size * scale) / 2,
            backgroundColor: '#7C3AED',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4, shadowRadius: 6, elevation: 5,
        }}>
            <View style={{ transform: [{ rotate: `${rotationDeg}deg` }] }}>
                <Ionicons name={icon} size={Math.round(size * 0.45 * scale)} color="white" />
            </View>
        </View>
    </View>
);

const HomeLocationPin = ({ scale = 1 }: { scale?: number }) => (
    <MapPin icon="home" size={40} shellColor="#FFFFFF" coreColor="#111111" iconSize={18} scale={scale} />
);

const BusinessMarker = ({ active, scale = 1 }: { active: boolean; scale?: number }) => {
    const pulseScale = useSharedValue(1);
    const pulseOpacity = useSharedValue(active ? 0.32 : 0);

    useEffect(() => {
        if (active) {
            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.85, { duration: 1300, easing: Easing.out(Easing.cubic) }),
                    withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.cubic) }),
                ),
                -1,
                false,
            );
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.34, { duration: 900, easing: Easing.inOut(Easing.quad) }),
                    withTiming(0.08, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
                ),
                -1,
                false,
            );
            return;
        }

        pulseScale.value = withTiming(1, { duration: 250 });
        pulseOpacity.value = withTiming(0, { duration: 250 });
    }, [active, pulseOpacity, pulseScale]);

    const pulseAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
        opacity: pulseOpacity.value,
    }));

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
                pointerEvents="none"
                style={[
                    {
                        position: 'absolute',
                        width: 72 * scale,
                        height: 72 * scale,
                        borderRadius: 36 * scale,
                        backgroundColor: '#F59E0B',
                    },
                    pulseAnimatedStyle,
                ]}
            />
            <MapPin icon="restaurant" size={46} shellColor="#FFFFFF" coreColor="#111111" iconSize={18} scale={scale} />
        </View>
    );
};

const DriverAvatar = ({
    driver,
    imageUrl,
    size,
    textSize,
}: {
    driver: any;
    imageUrl?: string | null;
    size: number;
    textSize: number;
}) => {
    const initials = getInitials(driver?.firstName, driver?.lastName);
    const backgroundColor = getAvatarColor(driver?.id);

    if (imageUrl) {
        return <Image source={{ uri: imageUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }

    return (
        <View style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <Text style={{ color: '#FFFFFF', fontSize: textSize, fontWeight: '800', letterSpacing: 0.2 }}>
                {initials}
            </Text>
        </View>
    );
};

// ─── Icon Stepper ───────────────────────────────────────
const IconStepper = ({ status, color, theme: th, t }: {
    status: string;
    color: string;
    theme: any;
    t: any;
}) => {
    const visibleStatus = getCustomerVisibleStatus(status);
    const currentIndex = STATUS_ORDER.indexOf(visibleStatus as typeof STATUS_ORDER[number]);
    const isCancelled = status === 'CANCELLED';

    const stepLabels: Record<string, string> = {
        PENDING: t.orders.details.placed_at,
        PREPARING: t.orders.details.preparing_at,
        OUT_FOR_DELIVERY: t.orders.details.picked_up_at,
        DELIVERED: t.orders.details.delivered_at,
    };

    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            {STATUS_ORDER.map((step, index) => {
                const done = !isCancelled && index < currentIndex;
                const active = !isCancelled && index === currentIndex;
                const iconName = STATUS_STEP_ICONS[step];
                const isLast = index === STATUS_ORDER.length - 1;

                const iconColor = done ? '#22C55E' : active ? color : (th.dark ? '#3f3f46' : '#D1D5DB');
                const leftLineColor = !isCancelled && index <= currentIndex ? '#22C55E' : (th.dark ? '#27272A' : '#E5E7EB');
                const rightLineColor = !isCancelled && index < currentIndex ? '#22C55E' : (th.dark ? '#27272A' : '#E5E7EB');

                return (
                    <View key={step} style={{ flex: 1, alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                            {index > 0 && (
                                <View style={{ flex: 1, height: 2, backgroundColor: leftLineColor }} />
                            )}
                            {index === 0 && <View style={{ flex: 1 }} />}

                            <View style={{
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                backgroundColor: done ? '#22C55E15' : active ? color + '15' : (th.dark ? '#1A1A22' : '#F3F4F6'),
                                alignItems: 'center', justifyContent: 'center',
                                borderWidth: active ? 2 : 0,
                                borderColor: active ? color + '40' : 'transparent',
                            }}>
                                {done ? (
                                    <Ionicons name="checkmark" size={14} color="#22C55E" />
                                ) : (
                                    <Ionicons name={iconName} size={14} color={iconColor} />
                                )}
                            </View>

                            {!isLast && (
                                <View style={{ flex: 1, height: 2, backgroundColor: rightLineColor }} />
                            )}
                            {isLast && <View style={{ flex: 1 }} />}
                        </View>

                        <Text style={{
                            fontSize: 9,
                            fontWeight: active ? '700' : '400',
                            color: active ? color : done ? '#22C55E' : th.colors.subtext,
                            marginTop: 4, textAlign: 'center',
                        }} numberOfLines={1}>
                            {stepLabels[step]}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
};

// ═══════════════════════════════════════════════════════════
// ─── Main Component ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════

interface OrderDetailsProps {
    order: Partial<Order> | null;
    loading?: boolean;
}

export const OrderDetails = ({ order, loading }: OrderDetailsProps) => {
    const router = useRouter();
    const theme = useTheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const mapRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const focusedStatusKeyRef = useRef<string | null>(null);
    // Stable ref so driver interpolation ticks (every ~66ms) don't cancel the focus timeout
    const fitMapToMarkersRef = useRef<() => void>(() => {});
    const [showSummary, setShowSummary] = useState(false);
    const [showDriverInfo, setShowDriverInfo] = useState(false);
    const { update: updateOrderStatus, loading: isMarkingAsDelivered } = useUpdateOrderStatus();
    const [mapZoomLevel, setMapZoomLevel] = useState(15.5);
    const [interpolatedDriverLocation, setInterpolatedDriverLocation] = useState<{
        latitude: number;
        longitude: number;
        address: string;
    } | null>(null);
    const [driverHeadingDeg, setDriverHeadingDeg] = useState(0);
    const lastRenderedDriverLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
    const interpolationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastHeartbeatReceivedAtRef = useRef<number | null>(null);
    const lastObservedHeartbeatGapMsRef = useRef(5000);
    const smoothedHeartbeatGapMsRef = useRef(5000);
    const [liveDriverTracking, setLiveDriverTracking] = useState<{
        orderId: string;
        driverId: string;
        latitude: number;
        longitude: number;
        navigationPhase?: string | null;
        remainingEtaSeconds?: number | null;
        etaUpdatedAt: string;
    } | null>(null);
    const [deliveryRouteCoordinates, setDeliveryRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);

    // ─── Driver Data (initial/fallback query; live movement comes from subscription) ───────────────────────────────
    const { data: driverData } = useQuery(GET_ORDER_DRIVER, {
        variables: { id: order?.id ?? '' },
        skip: !order?.id,
        fetchPolicy: 'cache-and-network',
    });

    const status = order?.status ?? 'PENDING';
    const customerVisibleStatus = getCustomerVisibleStatus(status);
    const isDeliveryPhase = status === 'OUT_FOR_DELIVERY';
    const isPreparingAnimationPhase = status === 'PENDING';
    const orderBusinesses = useMemo(() => {
        if (!Array.isArray(order?.businesses)) return [];
        return order.businesses.map((biz: any) => ({
            ...biz,
            items: Array.isArray(biz?.items) ? biz.items : [],
        }));
    }, [order?.businesses]);

    const stopDriverInterpolation = useCallback(() => {
        if (interpolationTimerRef.current) {
            clearInterval(interpolationTimerRef.current);
            interpolationTimerRef.current = null;
        }
    }, []);

    useSubscription(ORDER_DRIVER_LIVE_TRACKING, {
        variables: { orderId: order?.id ?? '' },
        skip: !order?.id || !isDeliveryPhase,
        onData: ({ data }) => {
            const payload = data.data?.orderDriverLiveTracking;
            if (!payload) return;
            setLiveDriverTracking(payload);
        },
        onError: (error) => {
            console.warn('[OrderDetails] live tracking subscription error:', error);
        },
    });

    useEffect(() => {
        setLiveDriverTracking(null);
        setInterpolatedDriverLocation(null);
        setDriverHeadingDeg(0);
        lastRenderedDriverLocationRef.current = null;
        lastHeartbeatReceivedAtRef.current = null;
        lastObservedHeartbeatGapMsRef.current = 5000;
        smoothedHeartbeatGapMsRef.current = 5000;
        stopDriverInterpolation();
    }, [order?.id]);

    useEffect(() => {
        if (!isDeliveryPhase) {
            setLiveDriverTracking(null);
            setInterpolatedDriverLocation(null);
            setDriverHeadingDeg(0);
            lastRenderedDriverLocationRef.current = null;
            lastHeartbeatReceivedAtRef.current = null;
            smoothedHeartbeatGapMsRef.current = 5000;
            stopDriverInterpolation();
        }
    }, [isDeliveryPhase, stopDriverInterpolation]);

    useEffect(() => {
        return () => {
            stopDriverInterpolation();
        };
    }, [stopDriverInterpolation]);

    const driver = driverData?.order?.driver ?? (order as any)?.driver ?? null;
    const hasAssignedDriver = Boolean(driver?.id);
    const driverName = driver?.firstName ? `${driver.firstName} ${driver?.lastName || ''}`.trim() : null;
    const driverPhone = driver?.phoneNumber || '+383 44 123 456';
    const driverImageUrl = driver?.imageUrl || null;
    const queriedDriverLocation = driver?.driverLocation ?? null;
    const liveDriverRawLocation =
        liveDriverTracking != null && liveDriverTracking.orderId === order?.id
            ? {
                  latitude: liveDriverTracking.latitude,
                  longitude: liveDriverTracking.longitude,
                  address: queriedDriverLocation?.address ?? '',
              }
            : null;

    const getRoadSnappedLocation = useCallback(
        (
            location: { latitude: number; longitude: number; address: string } | null,
            maxDistanceM: number,
        ) => {
            if (!location || deliveryRouteCoordinates.length < 2) {
                return location;
            }

            const snapped = snapPointToRoute(location, deliveryRouteCoordinates);
            if (!snapped || snapped.distanceM > maxDistanceM) {
                return location;
            }

            return {
                ...location,
                latitude: snapped.latitude,
                longitude: snapped.longitude,
            };
        },
        [deliveryRouteCoordinates],
    );

    const liveDriverTargetLocation = useMemo(() => {
        if (!liveDriverRawLocation) {
            return null;
        }
        return getRoadSnappedLocation(liveDriverRawLocation, ROUTE_SNAP_MAX_DISTANCE_M);
    }, [liveDriverRawLocation, getRoadSnappedLocation]);

    useEffect(() => {
        if (!isDeliveryPhase || !liveDriverTargetLocation) return;

        const now = Date.now();
        if (lastHeartbeatReceivedAtRef.current != null) {
            const observedGap = now - lastHeartbeatReceivedAtRef.current;
            if (Number.isFinite(observedGap) && observedGap > 0) {
                lastObservedHeartbeatGapMsRef.current = clamp(observedGap, 500, 15_000);
                const emaFactor = 0.2;
                smoothedHeartbeatGapMsRef.current =
                    smoothedHeartbeatGapMsRef.current * (1 - emaFactor) +
                    lastObservedHeartbeatGapMsRef.current * emaFactor;
            }
        }
        lastHeartbeatReceivedAtRef.current = now;

        const target = liveDriverTargetLocation;
        const start = interpolatedDriverLocation ?? queriedDriverLocation ?? target;

        const deltaLat = Math.abs(target.latitude - start.latitude);
        const deltaLng = Math.abs(target.longitude - start.longitude);
        if (deltaLat < DRIVER_POSITION_EPSILON && deltaLng < DRIVER_POSITION_EPSILON) {
            setInterpolatedDriverLocation(target);
            return;
        }

        const jumpDistanceKm = calculateHaversineDistance(
            start.latitude,
            start.longitude,
            target.latitude,
            target.longitude,
        );
        if (jumpDistanceKm >= DRIVER_TELEPORT_GUARD_KM) {
            stopDriverInterpolation();
            setInterpolatedDriverLocation(target);
            lastRenderedDriverLocationRef.current = { latitude: target.latitude, longitude: target.longitude };
            return;
        }

        const distanceFactor = jumpDistanceKm > 0.12 ? 0.8 : jumpDistanceKm < 0.01 ? 1.15 : 1;

        const durationMs = clamp(
            Math.round(smoothedHeartbeatGapMsRef.current * DRIVER_INTERPOLATION_RATIO * distanceFactor),
            DRIVER_INTERPOLATION_MIN_MS,
            DRIVER_INTERPOLATION_MAX_MS,
        );

        stopDriverInterpolation();
        const startedAt = Date.now();
        interpolationTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startedAt;
            const progress = clamp(elapsed / durationMs, 0, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const nextLat = start.latitude + (target.latitude - start.latitude) * easedProgress;
            const nextLng = start.longitude + (target.longitude - start.longitude) * easedProgress;
            const previousRendered = lastRenderedDriverLocationRef.current;
            if (previousRendered) {
                const stepDistanceKm = calculateHaversineDistance(
                    previousRendered.latitude,
                    previousRendered.longitude,
                    nextLat,
                    nextLng,
                );
                if (stepDistanceKm >= 0.002) {
                    setDriverHeadingDeg(
                        calculateBearingDeg(
                            previousRendered.latitude,
                            previousRendered.longitude,
                            nextLat,
                            nextLng,
                        ),
                    );
                }
            }
            lastRenderedDriverLocationRef.current = { latitude: nextLat, longitude: nextLng };
            setInterpolatedDriverLocation({
                latitude: nextLat,
                longitude: nextLng,
                address: target.address,
            });

            if (progress >= 1) {
                stopDriverInterpolation();
            }
        }, DRIVER_INTERPOLATION_TICK_MS);
    }, [
        isDeliveryPhase,
        liveDriverTargetLocation?.latitude,
        liveDriverTargetLocation?.longitude,
        liveDriverTargetLocation?.address,
        interpolatedDriverLocation,
        queriedDriverLocation,
        stopDriverInterpolation,
    ]);

    const driverLocation = getRoadSnappedLocation(
        liveDriverRawLocation
            ? interpolatedDriverLocation ?? liveDriverRawLocation
            : queriedDriverLocation,
        ROUTE_SNAP_FALLBACK_DISTANCE_M,
    );
    const liveDriverConnection =
        liveDriverTracking != null && liveDriverTracking.orderId === order?.id
            ? {
                  ...(driver?.driverConnection ?? {}),
                  activeOrderId: liveDriverTracking.orderId,
                  navigationPhase: liveDriverTracking.navigationPhase ?? null,
                  remainingEtaSeconds: liveDriverTracking.remainingEtaSeconds ?? null,
                  etaUpdatedAt: liveDriverTracking.etaUpdatedAt,
              }
            : driver?.driverConnection ?? null;

    // ─── Locations ──────────────────────────────────────────
    const pickupLocation = useMemo(() => {
        if (order?.pickupLocations?.length) return order.pickupLocations[0];
        if (orderBusinesses[0]?.business?.location) return orderBusinesses[0].business.location;
        return null;
    }, [order?.pickupLocations, orderBusinesses]);

    const dropoffLocation = useMemo(() => order?.dropOffLocation ?? null, [order?.dropOffLocation]);

    useEffect(() => {
        let isCancelled = false;

        const loadDeliveryRoute = async () => {
            if (!isDeliveryPhase || !pickupLocation || !dropoffLocation) {
                setDeliveryRouteCoordinates([]);
                return;
            }

            if (
                typeof pickupLocation.latitude !== 'number' ||
                typeof pickupLocation.longitude !== 'number' ||
                typeof dropoffLocation.latitude !== 'number' ||
                typeof dropoffLocation.longitude !== 'number'
            ) {
                setDeliveryRouteCoordinates([]);
                return;
            }

            const result = await fetchRoute(
                { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
                { latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude },
            );

            if (isCancelled) {
                return;
            }

            setDeliveryRouteCoordinates(result?.coordinates ?? []);
        };

        loadDeliveryRoute();

        return () => {
            isCancelled = true;
        };
    }, [isDeliveryPhase, pickupLocation, dropoffLocation]);

    const deliveryRouteShape = useMemo(() => {
        if (deliveryRouteCoordinates.length < 2) {
            return null;
        }

        return {
            type: 'Feature' as const,
            properties: {},
            geometry: {
                type: 'LineString' as const,
                coordinates: deliveryRouteCoordinates.map((coord) => [coord.longitude, coord.latitude]),
            },
        };
    }, [deliveryRouteCoordinates]);

    // ─── Status ─────────────────────────────────────────────
    const config = STATUS_CONFIG[customerVisibleStatus] || STATUS_CONFIG.PENDING;
    const statusKey = toText(customerVisibleStatus).toLowerCase();
    const statusMessage = (t.orders.status_messages as any)?.[statusKey] || '';
    const isCompleted = status === 'DELIVERED';
    const isCancelled = status === 'CANCELLED';
    const isPendingApproval = status === 'PENDING';
    const isPreparingPhase = customerVisibleStatus === 'PREPARING';
    const businessName = orderBusinesses[0]?.business?.name || '';

    // ─── ETA for PREPARING (restaurant prep only) ────
    const preparationEta = useMemo(() => {
        if (!isPreparingPhase) return null;

        const prepTotal = Number(order?.preparationMinutes ?? 0);
        if (!Number.isFinite(prepTotal) || prepTotal <= 0) return null;

        const prepStartRaw = order?.preparingAt || order?.orderDate;
        const prepStartMs = prepStartRaw ? new Date(prepStartRaw).getTime() : 0;
        if (!prepStartMs || Number.isNaN(prepStartMs)) return Math.max(1, Math.round(prepTotal));

        const elapsedMin = Math.max(0, (Date.now() - prepStartMs) / 60000);
        return Math.max(1, Math.ceil(prepTotal - elapsedMin));
    }, [isPreparingPhase, order?.preparationMinutes, order?.preparingAt, order?.orderDate]);

    // ─── ETA for OUT_FOR_DELIVERY (delivery only) ────
    const deliveryEta = useMemo(() => {
        if (!isDeliveryPhase) return null;

        const liveEtaOrderId = liveDriverConnection?.activeOrderId;
        const liveEtaSeconds = liveDriverConnection?.remainingEtaSeconds;
        const liveEtaUpdatedAt = liveDriverConnection?.etaUpdatedAt;
        const liveEtaUpdatedAtMs = liveEtaUpdatedAt ? new Date(liveEtaUpdatedAt).getTime() : 0;
        const liveEtaIsFresh =
            liveEtaOrderId === order?.id &&
            typeof liveEtaSeconds === 'number' &&
            Number.isFinite(liveEtaSeconds) &&
            liveEtaUpdatedAtMs > 0 &&
            Date.now() - liveEtaUpdatedAtMs <= LIVE_DRIVER_ETA_TTL_MS;

        if (liveEtaIsFresh) {
            if (liveEtaSeconds <= 0) return 0;
            return Math.max(1, Math.round(liveEtaSeconds / 60));
        }

        // Fallback: haversine
        if (driverLocation && dropoffLocation) {
            const dist = calculateHaversineDistance(
                driverLocation.latitude, driverLocation.longitude,
                dropoffLocation.latitude, dropoffLocation.longitude
            );
            return Math.max(1, Math.ceil(dist * 2.5));
        }
        return null;
    }, [
        isDeliveryPhase,
        liveDriverConnection?.activeOrderId,
        liveDriverConnection?.etaUpdatedAt,
        liveDriverConnection?.remainingEtaSeconds,
        order?.id,
        driverLocation,
        dropoffLocation,
    ]);

    const currentEta = isPreparingPhase ? preparationEta : isDeliveryPhase ? deliveryEta : null;
    const currentEtaLabel = isPreparingPhase ? t.orders.details.est_ready : isDeliveryPhase ? t.orders.details.est_delivery : '';

    // ─── Navigate back when order transitions to DELIVERED ──
    // (so only the global success modal is shown, not the completed order view)
    const prevStatusRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        const prev = prevStatusRef.current;
        prevStatusRef.current = status;
        if (prev !== undefined && prev !== 'DELIVERED' && status === 'DELIVERED') {
            router.back();
        }
    }, [status]);

    // ─── Elapsed time ticker ────────────────────────────────
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!order || isCompleted || isCancelled) return;
        const interval = setInterval(() => setTick(prev => prev + 1), 30000);
        return () => clearInterval(interval);
    }, [order?.status]);

    const elapsedMin = useMemo(() => {
        if (!order?.orderDate) return null;
        const start = new Date(order.orderDate).getTime();
        const end = isCompleted && (order as any).deliveredAt
            ? new Date((order as any).deliveredAt).getTime()
            : Date.now();
        return Math.max(0, Math.round((end - start) / 60000));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order?.orderDate, order?.status, (order as any)?.deliveredAt]);

    // ─── Live Activity (Dynamic Island) ─────────────────────
    const { startLiveActivity, endLiveActivity } = useLiveActivity({
        orderId: order?.id ?? '',
        orderDisplayId: order?.displayId ?? '',
        businessName: businessName,
        enabled: !!(order?.id && (status === 'OUT_FOR_DELIVERY' || customerVisibleStatus === 'PREPARING')),
    });

    // Manage Live Activity: start/update when active, end when done
    useEffect(() => {
        if (isCompleted || isCancelled) {
            endLiveActivity();
            return;
        }
        const etaMinutes = (isDeliveryPhase ? deliveryEta : isPreparingPhase ? preparationEta : null) ?? 0;
        const liveStatus = status === 'OUT_FOR_DELIVERY' ? 'out_for_delivery'
            : 'preparing';
        if (status === 'OUT_FOR_DELIVERY') {
            startLiveActivity({ driverName: driverName || 'Driver', estimatedMinutes: etaMinutes, status: liveStatus });
        } else if (customerVisibleStatus === 'PREPARING') {
            // Start during preparing as well so updates have an active activity to target.
            startLiveActivity({ driverName: driverName || 'Driver', estimatedMinutes: etaMinutes, status: liveStatus });
        }
    }, [status, customerVisibleStatus, isCompleted, isCancelled, deliveryEta, preparationEta, isDeliveryPhase, isPreparingPhase, driverName, startLiveActivity, endLiveActivity]);

    // ─── Map Fitting (status-aware) ────────────────────────
    const fitMapToMarkers = useCallback(() => {
        if (!cameraRef.current) return;

        if (isDeliveryPhase) {
            // OUT_FOR_DELIVERY: fit driver + dropoff
            const coords: { latitude: number; longitude: number }[] = [];
            if (driverLocation) coords.push({ latitude: driverLocation.latitude, longitude: driverLocation.longitude });
            if (dropoffLocation) coords.push({ latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude });
            if (coords.length < 2) {
                const c = coords[0] || (dropoffLocation ? { latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude } : null);
                if (c) cameraRef.current.setCamera({ centerCoordinate: [c.longitude, c.latitude], zoomLevel: 15.5, animationDuration: 800 });
                return;
            }
            const lngs = coords.map(c => c.longitude);
            const lats = coords.map(c => c.latitude);
            const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
            const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
            cameraRef.current.fitBounds(ne, sw, [120, 80, SCREEN_HEIGHT * 0.42, 80], 800);
        } else {
            // PENDING / PREPARING / READY: center on business
            const loc = pickupLocation;
            if (loc && typeof loc.latitude === 'number') {
                cameraRef.current.setCamera({
                    centerCoordinate: [loc.longitude, loc.latitude],
                    zoomLevel: 15.5,
                    animationDuration: 800,
                });
            }
        }
    }, [pickupLocation, dropoffLocation, driverLocation, isDeliveryPhase]);

    // Always keep the ref in sync with the latest callback (synchronous assignment, no effect needed)
    fitMapToMarkersRef.current = fitMapToMarkers;

    // Focus once per order+status. Driver movement must NOT be a dep here — it would cancel
    // the 180ms timeout every ~66ms (interpolation tick) so it would never fire.
    useEffect(() => {
        if (!pickupLocation && !dropoffLocation) return;

        const focusKey = `${order?.id ?? 'unknown'}:${status}`;
        if (focusedStatusKeyRef.current === focusKey) return;

        const timeout = setTimeout(() => {
            fitMapToMarkersRef.current();
            focusedStatusKeyRef.current = focusKey;
        }, 180);

        return () => clearTimeout(timeout);
    }, [order?.id, status, pickupLocation, dropoffLocation]);

    // ─── Handlers ───────────────────────────────────────────
    const handleCallDriver = useCallback(async () => {
        if (!driverPhone) return;
        try { await Linking.openURL(`tel:${driverPhone}`); }
        catch { Alert.alert(t.orders.details.call_failed, t.orders.details.unable_open_dialer); }
    }, [driverPhone, t.orders.details.call_failed, t.orders.details.unable_open_dialer]);

    const handleMarkAsDelivered = useCallback(async () => {
        if (!order?.id || isMarkingAsDelivered) return;

        const result = await updateOrderStatus(order.id, OrderStatus.Delivered);
        if (result.error) {
            Alert.alert('Failed', 'Could not mark this order as delivered.');
            return;
        }
//qapaasd
        Alert.alert('Success', 'Order marked as delivered.');
    }, [order?.id, isMarkingAsDelivered, updateOrderStatus]);

    const markerScale = useMemo(() => {
        const normalized = clamp((mapZoomLevel - 13) / 4, 0, 1);
        return 0.68 + normalized * 0.32;
    }, [mapZoomLevel]);

    const handleCameraChanged = useCallback((event: any) => {
        const nextZoom = event?.properties?.zoom;
        if (typeof nextZoom !== 'number' || !Number.isFinite(nextZoom)) return;
        setMapZoomLevel((prev) => (Math.abs(prev - nextZoom) > 0.04 ? nextZoom : prev));
    }, []);

    const fadeInEnter = useMemo(
        () => (typeof (FadeIn as any)?.duration === 'function' ? (FadeIn as any).duration(400) : undefined),
        [],
    );
    const fadeInDown320 = useMemo(
        () => (typeof (FadeInDown as any)?.duration === 'function' ? (FadeInDown as any).duration(320) : undefined),
        [],
    );
    const fadeOut220 = useMemo(
        () => (typeof (FadeOut as any)?.duration === 'function' ? (FadeOut as any).duration(220) : undefined),
        [],
    );
    const fadeInDown300Delay50 = useMemo(() => {
        const base = typeof (FadeInDown as any)?.duration === 'function' ? (FadeInDown as any).duration(300) : undefined;
        if (base && typeof base.delay === 'function') {
            return base.delay(50);
        }
        return base;
    }, []);

    // ─── Loading / Empty ────────────────────────────────────
    // Only show spinner on initial load (no data yet). During refetches
    // (subscription-triggered), `loading` flickers true but we already have
    // data — showing a spinner would unmount & remount the MapView.
    if (loading && !order) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!order) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }}>
                <Ionicons name="alert-circle-outline" size={80} color={theme.colors.subtext} />
                <Text style={{ fontSize: 18, color: theme.colors.text, marginTop: 16 }}>{t.orders.details.not_found}</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 24 }}>
                    <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '600' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ─── Default region ─────────────────────────────────────
    const defaultRegion = {
        latitude: pickupLocation?.latitude ?? dropoffLocation?.latitude ?? 42.4629,
        longitude: pickupLocation?.longitude ?? dropoffLocation?.longitude ?? 21.4694,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
    };

    // ─── Toggle order summary ───────────────────────────────
    const handleToggleSummary = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowSummary(prev => !prev);
    };

    const handleOpenDriverInfo = () => {
        if (!hasAssignedDriver) return;
        setShowDriverInfo(true);
    };

    const handleCloseDriverInfo = () => {
        setShowDriverInfo(false);
    };

    // ═════════════════════════════════════════════════════════
    // ─── COMPLETED ORDER VIEW (No Map) ─────────────────────────
    // ═══════════════════════════════════════════════════════════

    if (isCompleted || isCancelled) {
        return (
            <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <SafeAreaView edges={['top']}>
                    {/* Header */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.border,
                    }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: theme.dark ? '#ffffff10' : '#00000008',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12,
                            }}
                        >
                            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.3 }}>
                            {t.orders.details.order_details}
                        </Text>
                    </View>

                    {/* Status Banner */}
                    <View style={{
                        marginHorizontal: 16,
                        marginTop: 16,
                        marginBottom: 12,
                        backgroundColor: config.bgColor,
                        borderRadius: 20,
                        padding: 24,
                        alignItems: 'center',
                        shadowColor: config.color,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 12,
                        elevation: 4,
                    }}>
                        <View style={{
                            width: 72,
                            height: 72,
                            borderRadius: 36,
                            backgroundColor: config.color + '30',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16,
                            borderWidth: 3,
                            borderColor: config.color + '50',
                        }}>
                            <Ionicons name={config.icon} size={36} color={config.color} />
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: '800', color: config.textColor, marginBottom: 6, letterSpacing: -0.5 }}>
                            {isCompleted ? t.orders.details.order_delivered : 'Order Cancelled'}
                        </Text>
                        <Text style={{ fontSize: 13, color: config.textColor, opacity: 0.7, textAlign: 'center', fontWeight: '500' }}>
                            {formatOrderDate(order.orderDate)}
                        </Text>
                    </View>

                    {/* Order Number Card */}
                    <View style={{
                        marginHorizontal: 16,
                        marginBottom: 12,
                        backgroundColor: theme.colors.card,
                        borderRadius: 16,
                        padding: 18,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 2,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Ionicons name="receipt-outline" size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 11, color: theme.colors.subtext, fontWeight: '600', letterSpacing: 0.5 }}>
                                ORDER NUMBER
                            </Text>
                        </View>
                        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 }}>
                            #{toText(order.displayId) || shortOrderId(order.id) || 'N/A'}
                        </Text>
                    </View>

                    {/* Order Items */}
                    <View style={{
                        marginHorizontal: 16,
                        marginBottom: 12,
                        backgroundColor: theme.colors.card,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 2,
                    }}>
                        <View style={{
                            paddingHorizontal: 18,
                            paddingVertical: 14,
                            borderBottomWidth: 1,
                            borderBottomColor: theme.colors.border,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="cart-outline" size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
                                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.3 }}>
                                        {(t.orders.details as any).order_items || 'Order items'}
                                </Text>
                            </View>
                        </View>

                        {orderBusinesses.map((biz, bizIdx) => (
                            <View key={bizIdx}>
                                <View style={{
                                    paddingHorizontal: 18,
                                    paddingVertical: 12,
                                    borderBottomWidth: 1,
                                    borderBottomColor: theme.colors.border + '20',
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 12,
                                            backgroundColor: theme.colors.primary + '20',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 8,
                                        }}>
                                            <Ionicons name="storefront" size={13} color={theme.colors.primary} />
                                        </View>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.3 }}>
                                            {toText(biz?.business?.name) || 'Business'}
                                        </Text>
                                    </View>
                                </View>

                                {(Array.isArray(biz?.items) ? biz.items : []).map((item, itemIdx) => (
                                    <View
                                        key={`${item.productId}-${itemIdx}`}
                                        style={{
                                            paddingHorizontal: 18,
                                            paddingVertical: 14,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            borderTopWidth: itemIdx === 0 ? 0 : 1,
                                            borderTopColor: theme.colors.border + '20',
                                        }}
                                    >
                                        {item.imageUrl ? (
                                            <Image
                                                source={{ uri: item.imageUrl }}
                                                style={{
                                                    width: 56,
                                                    height: 56,
                                                    borderRadius: 12,
                                                    marginRight: 14,
                                                }}
                                                contentFit="cover"
                                            />
                                        ) : (
                                            <View style={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: 12,
                                                backgroundColor: theme.colors.primary + '15',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginRight: 14,
                                                borderWidth: 1,
                                                borderColor: theme.colors.primary + '30',
                                            }}>
                                                <Ionicons name="fast-food" size={24} color={theme.colors.primary} />
                                            </View>
                                        )}

                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.3 }} numberOfLines={1}>
                                                {item.name}
                                            </Text>
                                            <Text style={{ fontSize: 13, color: theme.colors.subtext, fontWeight: '600', marginTop: 4 }}>
                                                {item.quantity} × €{formatCurrency(item.unitPrice)}
                                            </Text>

                                            {/* Selected Options */}
                                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                                                <View style={{ marginTop: 6, gap: 2 }}>
                                                    {item.selectedOptions.map((opt: any) => (
                                                        <View key={opt.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Ionicons name="add-circle-outline" size={12} color={theme.colors.subtext} style={{ marginRight: 4 }} />
                                                            <Text style={{ fontSize: 12, color: theme.colors.subtext }}>
                                                                {opt.optionName} {opt.priceAtOrder > 0 ? `(+€${formatCurrency(opt.priceAtOrder)})` : ''}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}

                                            {/* Child Items (Offers) */}
                                            {item.childItems && item.childItems.length > 0 && (
                                                <View style={{ marginTop: 8, gap: 6 }}>
                                                    {item.childItems.map((child: any) => (
                                                        <View key={child.id} style={{ 
                                                            paddingLeft: 12, 
                                                            paddingVertical: 6,
                                                            borderLeftWidth: 1,
                                                            borderLeftColor: theme.colors.border + '50',
                                                            backgroundColor: theme.colors.border + '08',
                                                            borderRadius: 4,
                                                        }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>
                                                                    {child.name}
                                                                </Text>
                                                                {child.unitPrice > 0 && (
                                                                    <Text style={{ fontSize: 12, color: theme.colors.subtext }}>
                                                                        €{formatCurrency(child.unitPrice)}
                                                                    </Text>
                                                                )}
                                                            </View>
                                                            {child.selectedOptions && child.selectedOptions.length > 0 && (
                                                                <View style={{ marginTop: 2, gap: 1 }}>
                                                                    {child.selectedOptions.map((opt: any) => (
                                                                        <Text key={opt.id} style={{ fontSize: 11, color: theme.colors.subtext }}>
                                                                            • {opt.optionName}
                                                                        </Text>
                                                                    ))}
                                                                </View>
                                                            )}
                                                        </View>
                                                    ))}
                                                </View>
                                            )}

                                            {item.notes && (
                                                <View style={{
                                                    marginTop: 10,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 4,
                                                    backgroundColor: theme.colors.primary + '10',
                                                    borderRadius: 6,
                                                    borderLeftWidth: 2,
                                                    borderLeftColor: theme.colors.primary,
                                                }}>
                                                    <Text style={{ fontSize: 11, color: theme.colors.primary, fontStyle: 'italic', fontWeight: '500' }}>
                                                        {item.notes}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 }}>
                                            €{formatCurrency(Number(item.unitPrice) * Number(item.quantity))}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>

                    {/* Price Breakdown */}
                    <View style={{
                        marginHorizontal: 16,
                        marginBottom: 12,
                        backgroundColor: theme.colors.card,
                        borderRadius: 16,
                        padding: 18,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 2,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <Ionicons name="cash-outline" size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
                            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.3 }}>
                                Price Summary
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 24 }}>
                            <Text style={{ fontSize: 14, color: theme.colors.subtext, fontWeight: '500' }}>{t.common.subtotal}</Text>
                            <Text style={{ fontSize: 14, color: theme.colors.text, fontWeight: '600' }}>
                                €{formatCurrency(order.orderPrice)}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 24 }}>
                            <Text style={{ fontSize: 14, color: '#22C55E', fontWeight: '600' }}>{t.common.delivery_fee || 'Delivery fee'}</Text>
                            <Text style={{ fontSize: 14, color: '#22C55E', fontWeight: '700' }}>
                                €{formatCurrency(order.deliveryPrice ?? 0)}
                            </Text>
                        </View>
                        <View style={{
                            borderTopWidth: 1,
                            borderTopColor: theme.colors.border,
                            borderStyle: 'dashed',
                            marginVertical: 6,
                            marginHorizontal: 24,
                        }} />
                        <View style={{
                            paddingTop: 8,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <Text style={{ fontSize: 17, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 }}>
                                {t.common.total}
                            </Text>
                            <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.primary, letterSpacing: -0.5 }}>
                                €{formatCurrency(order.totalPrice)}
                            </Text>
                        </View>
                    </View>

                    {/* Delivery Address */}
                    {dropoffLocation && (
                        <View style={{
                            marginHorizontal: 16,
                            marginBottom: 12,
                            backgroundColor: theme.colors.card,
                            borderRadius: 16,
                            padding: 18,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 8,
                            elevation: 2,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <View style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: theme.colors.primary + '20',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 10,
                                }}>
                                    <Ionicons name="location" size={16} color={theme.colors.primary} />
                                </View>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.3 }}>
                                    {(t.orders.details as any).delivery_address || 'Delivery address'}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 14, color: theme.colors.subtext, lineHeight: 22, fontWeight: '500', paddingLeft: 42 }}>
                                {dropoffLocation.address}
                            </Text>
                        </View>
                    )}

                    {/* Driver Info (if completed) */}
                    {driver && isCompleted && (
                        <View style={{
                            marginHorizontal: 16,
                            marginBottom: 12,
                            backgroundColor: theme.colors.card,
                            borderRadius: 16,
                            padding: 18,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            flexDirection: 'row',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 8,
                            elevation: 2,
                        }}>
                            <View style={{
                                width: 56,
                                height: 56,
                                borderRadius: 28,
                                backgroundColor: theme.colors.primary + '15',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 14,
                                overflow: 'hidden',
                                borderWidth: 2,
                                borderColor: theme.colors.primary + '30',
                            }}>
                                <DriverAvatar driver={driver} imageUrl={driverImageUrl} size={56} textSize={18} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, color: theme.colors.subtext, marginBottom: 4, fontWeight: '600', letterSpacing: 0.5 }}>
                                    {t.orders.details.driver?.toUpperCase() || 'DRIVER'}
                                </Text>
                                <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 }}>
                                    {driverName || 'Driver'}
                                </Text>
                            </View>
                            <View style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: theme.colors.primary + '15',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                            </View>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </SafeAreaView>
            </ScrollView>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // ─── ACTIVE ORDER VIEW (With Map) ─────────────────────────
    // ═════════════════════════════════════════════════════════

    const mapFallback = (
        <View style={{ flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="map-outline" size={48} color="#555" />
            <Text style={{ color: '#555', marginTop: 8, fontSize: 14 }}>Map unavailable</Text>
        </View>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: '#000' }}>

                {/* ═══ Full-screen Map ═══ */}
                {MapLibreGL ? (
                    <MapErrorBoundary fallback={mapFallback}>
                    <MapLibreGL.MapView
                        ref={mapRef}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        styleURL={MAPBOX_STYLE}
                        logoEnabled={false}
                        attributionEnabled={false}
                        scaleBarEnabled={false}
                        compassEnabled={false}
                        scrollEnabled={true}
                        zoomEnabled={true}
                        pitchEnabled={true}
                        rotateEnabled={true}
                        onCameraChanged={handleCameraChanged}
                    >
                        <MapLibreGL.Camera
                            ref={cameraRef}
                            minZoomLevel={13}
                            maxZoomLevel={17}
                            maxBounds={{
                                ne: GJILAN_BOUNDS.ne,
                                sw: GJILAN_BOUNDS.sw,
                            }}
                            defaultSettings={{
                                centerCoordinate: [defaultRegion.longitude, defaultRegion.latitude],
                                zoomLevel: 15.5,
                            }}
                        />

                        {/* Road route for delivery phase (helps anchor movement to streets) */}
                        {isDeliveryPhase && deliveryRouteShape && (
                            <MapLibreGL.ShapeSource id="delivery-route-source" shape={deliveryRouteShape as any}>
                                <MapLibreGL.LineLayer
                                    id="delivery-route-line"
                                    style={{
                                        lineColor: '#A78BFA',
                                        lineWidth: 5,
                                        lineOpacity: 0.55,
                                        lineCap: 'round',
                                        lineJoin: 'round',
                                    }}
                                />
                            </MapLibreGL.ShapeSource>
                        )}

                        {/* Business marker (always visible while order is active) */}
                        {pickupLocation && typeof pickupLocation.latitude === 'number' && typeof pickupLocation.longitude === 'number' && (
                            <MapLibreGL.MarkerView
                                id="pickup-marker"
                                coordinate={[pickupLocation.longitude, pickupLocation.latitude]}
                                anchor={{ x: 0.5, y: 1 }}
                            >
                                <BusinessMarker active={isPreparingAnimationPhase} scale={markerScale} />
                            </MapLibreGL.MarkerView>
                        )}

                        {/* Driver marker (delivery phase) */}
                        {isDeliveryPhase && driverLocation && typeof driverLocation.latitude === 'number' && typeof driverLocation.longitude === 'number' && (
                            <MapLibreGL.MarkerView
                                id="driver-marker"
                                coordinate={[driverLocation.longitude, driverLocation.latitude]}
                                anchor={{ x: 0.5, y: 1 }}
                            >
                                <VehiclePin icon="bicycle" size={32} rotationDeg={driverHeadingDeg} scale={markerScale} />
                            </MapLibreGL.MarkerView>
                        )}

                        {/* User dropoff location (always visible) */}
                        {dropoffLocation && typeof dropoffLocation.latitude === 'number' && typeof dropoffLocation.longitude === 'number' && (
                            <MapLibreGL.MarkerView
                                id="dropoff-marker"
                                coordinate={[dropoffLocation.longitude, dropoffLocation.latitude]}
                                anchor={{ x: 0.5, y: 1 }}
                            >
                                <HomeLocationPin scale={markerScale} />
                            </MapLibreGL.MarkerView>
                        )}
                    </MapLibreGL.MapView>
                    </MapErrorBoundary>
                ) : mapFallback}

                <Modal visible={showDriverInfo} transparent animationType="fade" onRequestClose={handleCloseDriverInfo}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={handleCloseDriverInfo}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}
                        />
                        <View style={{
                            width: '100%',
                            maxWidth: 320,
                            borderRadius: 24,
                            padding: 20,
                            backgroundColor: theme.colors.card,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                <DriverAvatar driver={driver} imageUrl={driverImageUrl} size={56} textSize={18} />
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={{ color: theme.colors.subtext, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 }}>
                                        {t.orders.details.driver?.toUpperCase() || 'DRIVER'}
                                    </Text>
                                    <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800' }}>
                                        {driverName || t.orders.details.finding_driver}
                                    </Text>
                                    {!!driverPhone && (
                                        <Text style={{ color: theme.colors.subtext, fontSize: 13, marginTop: 2 }}>
                                            {driverPhone}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    onPress={handleCallDriver}
                                    style={{
                                        flex: 1,
                                        height: 46,
                                        borderRadius: 14,
                                        backgroundColor: '#22C55E',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'row',
                                    }}
                                >
                                    <Ionicons name="call" size={18} color="#FFFFFF" />
                                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginLeft: 8 }}>
                                        {t.orders.details.call_driver}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleCloseDriverInfo}
                                    style={{
                                        height: 46,
                                        borderRadius: 14,
                                        paddingHorizontal: 18,
                                        borderWidth: 1,
                                        borderColor: theme.colors.border,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '700' }}>
                                        {t.common.close}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* ═══ Back Button (floating) ═══ */}
                <View style={{ position: 'absolute', top: insets.top + 12, left: 16, zIndex: 10 }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{
                            width: 40, height: 40, borderRadius: 20,
                            backgroundColor: 'rgba(0,0,0,0.45)',
                            alignItems: 'center', justifyContent: 'center',
                            borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                        }}
                    >
                        <Ionicons name="chevron-back" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {/* ═══ Bottom Panel (floating overlay) ═══ */}
                <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: theme.colors.card,
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -8 },
                    shadowOpacity: 0.2,
                    shadowRadius: 20,
                    elevation: 20,
                    paddingBottom: insets.bottom + 12,
                    overflow: 'hidden',
                }}>
                    {/* Status-colored accent strip at top */}
                    <View style={{ height: 3, backgroundColor: config.color }} />

                    {/* Handle */}
                    <View style={{
                        width: 36, height: 4, borderRadius: 2,
                        backgroundColor: theme.colors.border,
                        alignSelf: 'center', marginTop: 10, marginBottom: 16,
                    }} />

                    <View style={{ paddingHorizontal: 20 }}>

                        {/* ── Status row: avatar + message + ETA ── */}
                        <Animated.View entering={fadeInEnter} style={{
                            flexDirection: 'row', alignItems: 'center', marginBottom: 16,
                        }}>
                            {/* Avatar (driver or default) */}
                            {hasAssignedDriver ? (
                                <TouchableOpacity
                                    onPress={handleOpenDriverInfo}
                                    activeOpacity={0.85}
                                    style={{
                                        width: 48, height: 48, borderRadius: 24,
                                        backgroundColor: theme.dark ? '#1A1A22' : '#F3F4F6',
                                        alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden', marginRight: 12,
                                        borderWidth: 2, borderColor: theme.dark ? '#27272A' : '#E5E7EB',
                                    }}
                                >
                                    <DriverAvatar driver={driver} imageUrl={driverImageUrl} size={48} textSize={15} />
                                </TouchableOpacity>
                            ) : (
                                <View style={{
                                    width: 48, height: 48, borderRadius: 24,
                                    backgroundColor: theme.dark ? '#1A1A22' : '#F3F4F6',
                                    alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden', marginRight: 12,
                                    borderWidth: 2, borderColor: theme.dark ? '#27272A' : '#E5E7EB',
                                }}>
                                    <Ionicons name="person-outline" size={24} color={theme.colors.subtext} />
                                </View>
                            )}

                            {/* Status text + order id */}
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }} numberOfLines={1}>
                                    {statusMessage}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 }}>
                                    <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>
                                        #{toText(order.displayId) || shortOrderId(order.id)}
                                    </Text>
                                    {elapsedMin !== null && (
                                        <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>
                                            · {elapsedMin} {t.orders.details.min_short}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* ETA badge */}
                            {currentEta !== null && !isCompleted && !isCancelled && !isPendingApproval && (
                                <View style={{
                                    backgroundColor: config.color + '15',
                                    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8,
                                    alignItems: 'center',
                                }}>
                                    <Text style={{ color: config.color, fontSize: 18, fontWeight: '800', lineHeight: 20 }}>
                                        ~{currentEta}
                                    </Text>
                                    <Text style={{ color: config.color, fontSize: 10, fontWeight: '600', marginTop: 1 }}>
                                        {currentEtaLabel} · {t.orders.details.min_short}
                                    </Text>
                                </View>
                            )}
                        </Animated.View>

                        {/* ── Pending approval / timeline (smooth transition) ───────────────── */}
                        <View style={{ marginBottom: 16 }}>
                            {isPendingApproval ? (
                                <Animated.View
                                    key="pending-approval"
                                    entering={fadeInDown320}
                                    exiting={fadeOut220}
                                    style={{
                                        borderRadius: 16,
                                        borderWidth: 1,
                                        borderColor: theme.colors.border,
                                        backgroundColor: theme.dark ? '#ffffff08' : '#00000005',
                                        paddingVertical: 14,
                                        paddingHorizontal: 14,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: '#F59E0B20',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 10,
                                        }}>
                                            <Ionicons name="time-outline" size={16} color="#F59E0B" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '800' }}>
                                                {t.orders.status.pending}
                                            </Text>
                                            <Text style={{ color: theme.colors.subtext, fontSize: 12, marginTop: 2 }}>
                                                {t.orders.status_messages.pending}
                                            </Text>
                                        </View>
                                    </View>
                                </Animated.View>
                            ) : (
                                <Animated.View
                                    key="full-timeline"
                                    entering={fadeInDown320}
                                    exiting={fadeOut220}
                                >
                                    <IconStepper status={customerVisibleStatus} color={config.color} theme={theme} t={t} />
                                </Animated.View>
                            )}
                        </View>

                        {/* ── Driver Card ──────────────────── */}
                        {(isDeliveryPhase || (driver && (status === 'READY' || isCompleted))) && (
                            <Animated.View entering={fadeInDown300Delay50} style={{
                                backgroundColor: theme.dark ? '#ffffff08' : '#00000005',
                                borderRadius: 16, padding: 14, marginBottom: 12,
                                flexDirection: 'row', alignItems: 'center',
                                borderWidth: 1, borderColor: theme.dark ? '#ffffff0A' : '#0000000A',
                            }}>
                                {/* Avatar */}
                                <View style={{
                                    width: 44, height: 44, borderRadius: 14,
                                    backgroundColor: config.color + '15',
                                    alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden', marginRight: 12,
                                }}>
                                    <DriverAvatar driver={driver} imageUrl={driverImageUrl} size={44} textSize={14} />
                                </View>

                                {/* Info */}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '700' }}>
                                        {driverName || t.orders.details.finding_driver}
                                    </Text>
                                    <Text style={{ color: theme.colors.subtext, fontSize: 12, marginTop: 2 }}>{driverPhone}</Text>
                                </View>

                                {/* Call */}
                                <TouchableOpacity onPress={handleCallDriver} style={{
                                    width: 40, height: 40, borderRadius: 13,
                                    backgroundColor: '#22C55E',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Ionicons name="call" size={18} color="white" />
                                </TouchableOpacity>
                            </Animated.View>
                        )}

                        {/* ── Show Order Summary Button ────── */}
                        <TouchableOpacity
                            onPress={handleToggleSummary}
                            activeOpacity={0.7}
                            style={{
                                alignSelf: 'center',
                                marginBottom: 12,
                            }}
                        >
                            <Text style={{ color: theme.colors.subtext, fontSize: 13, fontWeight: '600' }}>
                                {showSummary ? '▲ Hide order summary' : '▼ Show order summary'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleMarkAsDelivered}
                            activeOpacity={0.85}
                            disabled={isMarkingAsDelivered}
                            style={{
                                alignSelf: 'center',
                                marginBottom: 12,
                                backgroundColor:
                                    isMarkingAsDelivered
                                        ? '#9CA3AF'
                                        : '#16A34A',
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 999,
                            }}
                        >
                            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                                {isMarkingAsDelivered ? 'Marking...' : 'Mark as delivered (test)'}
                            </Text>
                        </TouchableOpacity>

                        {/* ── Expanded Order Items ────────── */}
                        {showSummary && (
                            <View style={{
                                borderRadius: 16,
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                                marginBottom: 12,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                            }}>
                                <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                                    {orderBusinesses.map((biz) =>
                                        (Array.isArray(biz?.items) ? biz.items : []).map((item, idx) => (
                                            <View key={`${item.productId}-${idx}`} style={{
                                                flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
                                                borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: theme.colors.border + '15',
                                            }}>
                                                <View style={{
                                                    width: 28, height: 28, borderRadius: 8,
                                                    backgroundColor: config.color + '10',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    marginRight: 10, overflow: 'hidden',
                                                }}>
                                                    {item.imageUrl ? (
                                                        <Image source={{ uri: item.imageUrl }} style={{ width: 28, height: 28, borderRadius: 8 }} />
                                                    ) : (
                                                        <Ionicons name="fast-food-outline" size={13} color={config.color} />
                                                    )}
                                                </View>
                                                <Text style={{ flex: 1, color: theme.colors.text, fontSize: 13 }} numberOfLines={1}>
                                                    {item.quantity}× {item.name}
                                                </Text>
                                                <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600' }}>
                                                    €{formatCurrency(Number(item.price) * Number(item.quantity))}
                                                </Text>
                                            </View>
                                        ))
                                    )}
                                </ScrollView>
                                <View style={{
                                    borderTopWidth: 1, borderTopColor: theme.colors.border + '30',
                                    marginTop: 8, paddingTop: 10,
                                    gap: 6,
                                }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: '#22C55E', fontSize: 12, fontWeight: '600' }}>
                                            {t.common.delivery_fee || 'Delivery fee'}
                                        </Text>
                                        <Text style={{ color: '#22C55E', fontSize: 12, fontWeight: '700' }}>
                                            €{formatCurrency(order.deliveryPrice ?? 0)}
                                        </Text>
                                    </View>
                                    <View
                                        style={{
                                            borderTopWidth: 1,
                                            borderTopColor: theme.colors.border,
                                            borderStyle: 'dashed',
                                            marginVertical: 4,
                                        }}
                                    />
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700' }}>{t.common.total}</Text>
                                        <Text style={{ color: config.color, fontSize: 15, fontWeight: '800' }}>
                                            €{formatCurrency(order.totalPrice)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                    </View>
                </View>
            </View>
        </GestureHandlerRootView>
    );
};

// ─── Safe Wrapper (catches ALL render errors) ───────────────
class OrderDetailsBoundary extends Component<
    { children: ReactNode; onBack: () => void },
    { hasError: boolean; error: string }
> {
    state = { hasError: false, error: '' };
    static getDerivedStateFromError(err: Error) {
        return {
            hasError: true,
            error: err?.message || 'Unknown error',
        };
    }
    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[OrderDetailsBoundary]', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <View style={{ flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 16 }}>
                        Something went wrong
                    </Text>
                    <Text style={{ color: '#888', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                        {this.state.error}
                    </Text>
                    <TouchableOpacity
                        onPress={this.props.onBack}
                        style={{ marginTop: 24, backgroundColor: '#7C3AED', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
                    >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

// ─── Exported Safe Component ────────────────────────────────
export const SafeOrderDetails = ({ order, loading }: OrderDetailsProps) => {
    const router = useRouter();
    return (
        <OrderDetailsBoundary onBack={() => router.back()}>
            <OrderDetails order={order} loading={loading} />
        </OrderDetailsBoundary>
    );
};
