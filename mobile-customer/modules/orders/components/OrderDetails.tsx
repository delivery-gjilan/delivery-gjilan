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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
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
const formatOrderDate = (value?: string | null, fallback = 'Unknown date') => {
    if (!value) return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
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
const DRIVER_DEAD_RECKONING_MAX_MS = 4_000;
const DRIVER_DEAD_RECKONING_DECAY_MS = 2_500;
const ROUTE_SNAP_MAX_DISTANCE_M = 45;
const ROUTE_SNAP_FALLBACK_DISTANCE_M = 70;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// ─── Cinematic Camera Constants ─────────────────────────
const CAMERA_INTRO_ZOOM = 13.0;        // wide starting zoom — flies into restaurant
const CAMERA_APPROACH_NEAR_M = 400;   // driver ~400m away: reframe
const CAMERA_APPROACH_CLOSE_M = 150;  // driver ~150m away: tighten + mild tilt
const CAMERA_APPROACH_ARRIVAL_M = 80; // driver ~80m away: zoom in 3D on dropoff
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
    PREPARING: { color: '#F97316', bgColor: '#FFEDD5', textColor: '#9A3412', icon: 'restaurant' },
    READY: { color: '#3B82F6', bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'restaurant' },
    OUT_FOR_DELIVERY: { color: '#22C55E', bgColor: '#DCFCE7', textColor: '#166534', icon: 'bicycle' },
    DELIVERED: { color: '#22C55E', bgColor: '#DCFCE7', textColor: '#166534', icon: 'checkmark-done-circle' },
    CANCELLED: { color: '#EF4444', bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'close-circle' },
};

// ─── Status Steps ───────────────────────────────────────────
const STATUS_ORDER_RESTAURANT = ['PENDING', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
const STATUS_ORDER_MARKET = ['PENDING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;

const STATUS_STEP_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    PENDING: 'time',
    PREPARING: 'restaurant',
    READY: 'bag-check',
    OUT_FOR_DELIVERY: 'bicycle',
    DELIVERED: 'checkmark-done-circle',
};

const isMarketType = (businessType?: string | null) =>
    businessType === 'MARKET' || businessType === 'PHARMACY';

const getCustomerVisibleStatus = (status: string, businessType?: string | null) => {
    if (isMarketType(businessType)) return status === 'PREPARING' ? 'READY' : status;
    return status === 'READY' ? 'PREPARING' : status;
};

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

const HomeLocationPin = ({ scale = 1 }: { scale?: number }) => {
    const size = 36 * scale;
    const pointerSize = 10 * scale;
    return (
        <View style={{ alignItems: 'center' }}>
            <View style={{
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 6,
            }}>
                <View style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: '#111111',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2.5,
                    borderColor: '#FFFFFF',
                }}>
                    <Ionicons name="home" size={Math.round(16 * scale)} color="#FFFFFF" />
                </View>
                <View style={{
                    width: pointerSize,
                    height: pointerSize,
                    backgroundColor: '#111111',
                    transform: [{ rotate: '45deg' }],
                    marginTop: -(pointerSize / 2),
                    borderBottomRightRadius: 3 * scale,
                }} />
            </View>
        </View>
    );
};

const BusinessMarker = ({ active, scale = 1, imageUrl }: { active: boolean; scale?: number; imageUrl?: string | null }) => {
    const pulseScale = useSharedValue(1);
    const pulseOpacity = useSharedValue(active ? 0.32 : 0);
    const [imgError, setImgError] = useState(false);

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

    const markerSize = 36 * scale;
    const showImage = imageUrl && !imgError;

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
                        backgroundColor: '#7C3AED',
                    },
                    pulseAnimatedStyle,
                ]}
            />
            <View style={{
                width: markerSize,
                height: markerSize,
                borderRadius: markerSize / 2,
                borderWidth: 2.5,
                borderColor: '#7C3AED',
                backgroundColor: '#1a1a2e',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                shadowColor: '#7C3AED',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 6,
                elevation: 6,
            }}>
                {showImage ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={{ width: markerSize, height: markerSize }}
                        contentFit="cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <Ionicons name="restaurant" size={16 * scale} color="#A78BFA" />
                )}
            </View>
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
const IconStepper = ({ status, color, theme: th, t, businessType }: {
    status: string;
    color: string;
    theme: any;
    t: any;
    businessType?: string | null;
}) => {
    const isMarket = isMarketType(businessType);
    const statusOrder = isMarket ? STATUS_ORDER_MARKET : STATUS_ORDER_RESTAURANT;
    const visibleStatus = getCustomerVisibleStatus(status, businessType);
    const currentIndex = statusOrder.indexOf(visibleStatus as any);
    const isCancelled = status === 'CANCELLED';
    const activeScale = useSharedValue(1);
    const activeScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: activeScale.value }] }));

    useEffect(() => {
        activeScale.value = withSequence(withSpring(1.3, { damping: 4, stiffness: 200 }), withSpring(1, { damping: 8, stiffness: 120 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex]);

    const stepLabels: Record<string, string> = {
        PENDING: t.orders.details.placed_at,
        PREPARING: t.orders.details.preparing_at,
        READY: t.orders.details.ready_at,
        OUT_FOR_DELIVERY: t.orders.details.picked_up_at,
        DELIVERED: t.orders.details.delivered_at,
    };

    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            {statusOrder.map((step, index) => {
                const done = !isCancelled && index < currentIndex;
                const active = !isCancelled && index === currentIndex;
                const iconName = STATUS_STEP_ICONS[step];
                const isLast = index === statusOrder.length - 1;

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

                            <Animated.View style={[{
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                backgroundColor: done ? '#22C55E15' : active ? color + '15' : (th.dark ? '#1A1A22' : '#F3F4F6'),
                                alignItems: 'center', justifyContent: 'center',
                                borderWidth: active ? 2 : 0,
                                borderColor: active ? color + '40' : 'transparent',
                            }, active ? activeScaleStyle : undefined]}>
                                {done ? (
                                    <Ionicons name="checkmark" size={14} color="#22C55E" />
                                ) : (
                                    <Ionicons name={iconName} size={14} color={iconColor} />
                                )}
                            </Animated.View>

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
    // ─── Cinematic camera state refs ─────────────────────
    const hasIntroFiredRef = useRef(false);           // first-ever focus fly-in
    const isFirstDeliveryFitRef = useRef(false);       // delivery reveal zoom-out+in
    const approachStageRef = useRef(0);                // 0=none 1=near 2=close 3=arrival
    const lastApproachCheckRef = useRef(0);            // throttle timestamp
    const lastTweenVelocityRef = useRef<{ latPerMs: number; lngPerMs: number } | null>(null);
    const tweenFinishedAtRef = useRef<number | null>(null);
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
    const primaryBusinessType = (order?.businesses as any)?.[0]?.business?.businessType as string | undefined;
    const customerVisibleStatus = getCustomerVisibleStatus(status, primaryBusinessType);
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
            // patchDriverConnection is handled by useGlobalDriverTracking at the
            // app root level — no need to duplicate it here.
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
    const driverPhone = driver?.phoneNumber || null;
    const cancellationPhone = process.env.EXPO_PUBLIC_ORDER_CANCELLATION_PHONE || '+383 45 205 045';
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
                const emaFactor = 0.35;
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
        lastTweenVelocityRef.current = null;
        tweenFinishedAtRef.current = null;
        const tweenVelocityLatPerMs = (target.latitude - start.latitude) / durationMs;
        const tweenVelocityLngPerMs = (target.longitude - start.longitude) / durationMs;
        interpolationTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startedAt;
            const progress = clamp(elapsed / durationMs, 0, 1);

            let nextLat: number;
            let nextLng: number;

            if (progress < 1) {
                // Ease-out cubic tween phase
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                nextLat = start.latitude + (target.latitude - start.latitude) * easedProgress;
                nextLng = start.longitude + (target.longitude - start.longitude) * easedProgress;
            } else {
                // Dead-reckoning phase: extrapolate beyond the tween using the tween's average velocity
                if (!tweenFinishedAtRef.current) {
                    tweenFinishedAtRef.current = Date.now();
                    lastTweenVelocityRef.current = { latPerMs: tweenVelocityLatPerMs, lngPerMs: tweenVelocityLngPerMs };
                }
                const drAge = Date.now() - tweenFinishedAtRef.current;
                if (drAge > DRIVER_DEAD_RECKONING_MAX_MS) {
                    // Stop after max dead-reckoning window
                    return;
                }
                const decay = Math.exp(-drAge / DRIVER_DEAD_RECKONING_DECAY_MS);
                nextLat = target.latitude + tweenVelocityLatPerMs * drAge * decay;
                nextLng = target.longitude + tweenVelocityLngPerMs * drAge * decay;
            }
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
    const isMarket = isMarketType(primaryBusinessType);
    const config = STATUS_CONFIG[customerVisibleStatus] || STATUS_CONFIG.PENDING;
    const statusKey = toText(customerVisibleStatus).toLowerCase();
    const statusMessage = isMarket
        ? ((t.orders.status_messages_market as any)?.[statusKey] || (t.orders.status_messages as any)?.[statusKey] || '')
        : ((t.orders.status_messages as any)?.[statusKey] || '');
    const isCompleted = status === 'DELIVERED';
    const isCancelled = status === 'CANCELLED';
    const isPendingApproval = status === 'PENDING';
    const isPreparingPhase = customerVisibleStatus === 'PREPARING' || customerVisibleStatus === 'READY';
    const businessName = orderBusinesses[0]?.business?.name || '';

    // ─── ETA for PREPARING (restaurant prep only — markets skip this) ────
    const preparationEta = useMemo(() => {
        if (!isPreparingPhase || isMarket) return null;

        const prepTotal = Number(order?.preparationMinutes ?? 0);
        if (!Number.isFinite(prepTotal) || prepTotal <= 0) return null;

        const prepStartRaw = order?.preparingAt || order?.orderDate;
        const prepStartMs = prepStartRaw ? new Date(prepStartRaw).getTime() : 0;
        if (!prepStartMs || Number.isNaN(prepStartMs)) return Math.max(1, Math.round(prepTotal));

        const elapsedMin = Math.max(0, (Date.now() - prepStartMs) / 60000);
        return Math.max(1, Math.ceil(prepTotal - elapsedMin));
    }, [isPreparingPhase, isMarket, order?.preparationMinutes, order?.preparingAt, order?.orderDate]);

    // ─── ETA for OUT_FOR_DELIVERY (delivery only) ────
    const { deliveryEta, deliveryEtaIsLive } = useMemo(() => {
        if (!isDeliveryPhase) return { deliveryEta: null, deliveryEtaIsLive: false };

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
            if (liveEtaSeconds <= 0) return { deliveryEta: 0, deliveryEtaIsLive: true };
            return { deliveryEta: Math.max(1, Math.round(liveEtaSeconds / 60)), deliveryEtaIsLive: true };
        }

        // Fallback: haversine
        if (driverLocation && dropoffLocation) {
            const dist = calculateHaversineDistance(
                driverLocation.latitude, driverLocation.longitude,
                dropoffLocation.latitude, dropoffLocation.longitude
            );
            return { deliveryEta: Math.max(1, Math.ceil(dist * 2.5)), deliveryEtaIsLive: false };
        }
        return { deliveryEta: null, deliveryEtaIsLive: false };
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
        enabled: !!(
            order?.id &&
            !isCompleted &&
            !isCancelled &&
            (status === 'PENDING' || isPreparingPhase || status === 'OUT_FOR_DELIVERY')
        ),
    });

    // Ref to track how long we've been in OFD without a live GPS ETA.
    const ofdFallbackWaitingSinceRef = useRef<number | null>(null);

    // Manage Live Activity: start/update when active, end when done
    useEffect(() => {
        if (isCompleted || isCancelled) {
            endLiveActivity();
            ofdFallbackWaitingSinceRef.current = null;
            return;
        }

        if (status !== 'OUT_FOR_DELIVERY') {
            // Reset gate when leaving OFD
            ofdFallbackWaitingSinceRef.current = null;
        }

        const etaMinutes = (isDeliveryPhase ? deliveryEta : isPreparingPhase ? preparationEta : null) ?? 0;
        const liveStatus = status === 'OUT_FOR_DELIVERY' ? 'out_for_delivery'
            : (status === 'PENDING') ? 'pending'
            : 'preparing'; // covers PREPARING, READY (market)
        const phaseInitialMinutes = status === 'OUT_FOR_DELIVERY'
            ? Math.max(1, Math.round(etaMinutes || 0))
            : Math.max(1, Number(order?.preparationMinutes ?? etaMinutes ?? 0));
        const phaseStartedAt = status === 'OUT_FOR_DELIVERY'
            ? (order?.outForDeliveryAt ? new Date(order.outForDeliveryAt).getTime() : Date.now())
            : (order?.preparingAt ? new Date(order.preparingAt).getTime() : Date.now());
        if (status === 'OUT_FOR_DELIVERY') {
            if (deliveryEtaIsLive) {
                // Real GPS ETA from subscription — start immediately and clear grace timer.
                ofdFallbackWaitingSinceRef.current = null;
            } else {
                // No live ETA yet. Wait up to 15s for the subscription to deliver real data.
                if (ofdFallbackWaitingSinceRef.current === null) {
                    ofdFallbackWaitingSinceRef.current = Date.now();
                }
                const waited = Date.now() - ofdFallbackWaitingSinceRef.current;
                if (waited < 15_000) return;
                // Grace period elapsed — proceed with haversine/null fallback.
            }
            if (deliveryEta === null) return;
            startLiveActivity({
                driverName: driverName || 'Driver',
                estimatedMinutes: etaMinutes,
                phaseInitialMinutes,
                phaseStartedAt,
                status: liveStatus,
            });
        } else if (isPreparingPhase) {
            // Start during preparing/ready as well so updates have an active activity to target.
            startLiveActivity({
                driverName: driverName || 'Driver',
                estimatedMinutes: etaMinutes,
                phaseInitialMinutes,
                phaseStartedAt,
                status: liveStatus,
            });
        }
    }, [status, customerVisibleStatus, isCompleted, isCancelled, deliveryEta, deliveryEtaIsLive, preparationEta, isDeliveryPhase, isPreparingPhase, driverName, order?.preparationMinutes, order?.outForDeliveryAt, order?.preparingAt, startLiveActivity, endLiveActivity]);

    // ─── Map Fitting (status-aware) ────────────────────────
    const fitMapToMarkers = useCallback(() => {
        if (!cameraRef.current) return;

        if (isDeliveryPhase) {
            // OUT_FOR_DELIVERY: fit driver + pickup (business) + dropoff (home)
            const coords: { latitude: number; longitude: number }[] = [];
            if (driverLocation) coords.push({ latitude: driverLocation.latitude, longitude: driverLocation.longitude });
            if (pickupLocation) coords.push({ latitude: pickupLocation.latitude, longitude: pickupLocation.longitude });
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

            isFirstDeliveryFitRef.current = true;
            cameraRef.current.fitBounds(ne, sw, [120, 80, SCREEN_HEIGHT * 0.42, 80], 800);
        } else {
            // PENDING / PREPARING / READY: center on business
            const loc = pickupLocation;
            if (loc && typeof loc.latitude === 'number') {
                if (!hasIntroFiredRef.current) {
                    // ── Cinematic intro: map starts zoomed out and flies into the restaurant
                    hasIntroFiredRef.current = true;
                    cameraRef.current.setCamera({
                        centerCoordinate: [loc.longitude, loc.latitude],
                        zoomLevel: 15.5,
                        animationDuration: 1400,
                        animationMode: 'flyTo',
                        pitch: 0,
                    });
                } else {
                    cameraRef.current.setCamera({
                        centerCoordinate: [loc.longitude, loc.latitude],
                        zoomLevel: 15.5,
                        animationDuration: 800,
                    });
                }
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

    // ─── Reset cinematic stages when order changes ─────────
    useEffect(() => {
        approachStageRef.current = 0;
        isFirstDeliveryFitRef.current = false;
        hasIntroFiredRef.current = false;
    }, [order?.id]);

    // ─── Driver approach: progressive zoom-in as driver nears customer ─────────
    useEffect(() => {
        if (!isDeliveryPhase || !driverLocation || !dropoffLocation || !cameraRef.current) return;

        // Throttle: check at most every 2 seconds (driverLocation updates every 50ms)
        const now = Date.now();
        if (now - lastApproachCheckRef.current < 2000) return;
        lastApproachCheckRef.current = now;

        const distKm = calculateHaversineDistance(
            driverLocation.latitude,
            driverLocation.longitude,
            dropoffLocation.latitude,
            dropoffLocation.longitude,
        );
        const distM = distKm * 1000;

        if (distM <= CAMERA_APPROACH_ARRIVAL_M && approachStageRef.current < 3) {
            // ~80m away: cinematic tilt toward dropoff, very close-up
            approachStageRef.current = 3;
            cameraRef.current.setCamera({
                centerCoordinate: [dropoffLocation.longitude, dropoffLocation.latitude],
                zoomLevel: 17,
                pitch: 45,
                animationDuration: 1200,
                animationMode: 'flyTo',
            });
        } else if (distM <= CAMERA_APPROACH_CLOSE_M && approachStageRef.current < 2) {
            // ~150m away: mid-tilt framing driver + dropoff together
            approachStageRef.current = 2;
            const midLng = (driverLocation.longitude + dropoffLocation.longitude) / 2;
            const midLat = (driverLocation.latitude + dropoffLocation.latitude) / 2;
            cameraRef.current.setCamera({
                centerCoordinate: [midLng, midLat],
                zoomLevel: 16.5,
                pitch: 25,
                animationDuration: 1000,
                animationMode: 'flyTo',
            });
        } else if (distM <= CAMERA_APPROACH_NEAR_M && approachStageRef.current < 1) {
            // ~400m away: reframe to keep both driver and dropoff in view
            approachStageRef.current = 1;
            const lngs = [driverLocation.longitude, dropoffLocation.longitude];
            const lats = [driverLocation.latitude, dropoffLocation.latitude];
            const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
            const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
            cameraRef.current.fitBounds(ne, sw, [120, 80, SCREEN_HEIGHT * 0.42, 80], 1000);
        }
    }, [driverLocation, isDeliveryPhase, dropoffLocation]);

    // ─── Handlers ───────────────────────────────────────────
    const handleCallDriver = useCallback(async () => {
        if (!driverPhone) return;
        try { await Linking.openURL(`tel:${driverPhone}`); }
        catch { Alert.alert(t.orders.details.call_failed, t.orders.details.unable_open_dialer); }
    }, [driverPhone, t.orders.details.call_failed, t.orders.details.unable_open_dialer]);

    const handleCallForCancellation = useCallback(async () => {
        if (!cancellationPhone) return;
        try { await Linking.openURL(`tel:${cancellationPhone}`); }
        catch { Alert.alert(t.orders.details.call_failed, t.orders.details.unable_open_dialer); }
    }, [cancellationPhone, t.orders.details.call_failed, t.orders.details.unable_open_dialer]);

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
                    <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '600' }}>{t.common.go_back}</Text>
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
                            {isCompleted ? t.orders.details.order_delivered : t.orders.details.order_cancelled}
                        </Text>
                        <Text style={{ fontSize: 13, color: config.textColor, opacity: 0.7, textAlign: 'center', fontWeight: '500' }}>
                            {formatOrderDate(order.orderDate, t.orders.details.unknown_date)}
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
                            <Text style={{ fontSize: 11, color: theme.colors.subtext, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                {t.orders.details.order_number}
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
                                        {t.orders.details.order_items}
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                            <Ionicons name="receipt-outline" size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
                            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.3 }}>
                                {t.orders.details.price_summary}
                            </Text>
                        </View>

                        {/* Subtotal row */}
                        {(() => {
                            const origPrice = (order as any).originalPrice;
                            const hasItemDiscount = origPrice != null && origPrice > order.orderPrice;
                            return (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 24, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 14, color: theme.colors.subtext, fontWeight: '500' }}>{t.common.subtotal}</Text>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        {hasItemDiscount && (
                                            <Text style={{ fontSize: 12, color: theme.colors.subtext, textDecorationLine: 'line-through', marginBottom: 1 }}>
                                                €{formatCurrency(origPrice)}
                                            </Text>
                                        )}
                                        <Text style={{ fontSize: 14, color: theme.colors.text, fontWeight: '600' }}>
                                            €{formatCurrency(order.orderPrice)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })()}

                        {/* Delivery fee row */}
                        {(() => {
                            const origDelivery = (order as any).originalDeliveryPrice;
                            const hasDeliveryDiscount = origDelivery != null && origDelivery > (order.deliveryPrice ?? 0);
                            return (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 24, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 14, color: theme.colors.subtext, fontWeight: '500' }}>{t.common.delivery_fee || 'Delivery fee'}</Text>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        {hasDeliveryDiscount && (
                                            <Text style={{ fontSize: 12, color: theme.colors.subtext, textDecorationLine: 'line-through', marginBottom: 1 }}>
                                                €{formatCurrency(origDelivery)}
                                            </Text>
                                        )}
                                        <Text style={{ fontSize: 14, color: order.deliveryPrice === 0 ? '#22C55E' : theme.colors.text, fontWeight: '600' }}>
                                            {order.deliveryPrice === 0 ? 'Free' : `€${formatCurrency(order.deliveryPrice ?? 0)}`}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })()}

                        {/* Promo / coupon rows */}
                        {(() => {
                            const promos: any[] = (order as any).orderPromotions ?? [];
                            if (!promos.length) return null;
                            return (
                                <View style={{ marginBottom: 10, gap: 6 }}>
                                    {promos.map((p: any, i: number) => {
                                        const isFreeDelivery = p.appliesTo === 'DELIVERY' && p.discountAmount > 0;
                                        const label = isFreeDelivery ? 'Free delivery' : 'Discount applied';
                                        return (
                                            <View key={p.id ?? i} style={{
                                                paddingHorizontal: 14,
                                                paddingVertical: 10,
                                                backgroundColor: '#22C55E12',
                                                borderRadius: 10,
                                                borderWidth: 1,
                                                borderColor: '#22C55E30',
                                            }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <Ionicons name="pricetag-outline" size={14} color="#22C55E" />
                                                        <View>
                                                            {p.promoCode ? (
                                                                <Text style={{ fontSize: 12, color: '#22C55E', fontWeight: '800', letterSpacing: 0.5 }}>
                                                                    {p.promoCode}
                                                                </Text>
                                                            ) : null}
                                                            <Text style={{ fontSize: 12, color: '#22C55E', fontWeight: '600', opacity: p.promoCode ? 0.85 : 1 }}>
                                                                {label}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text style={{ fontSize: 14, color: '#22C55E', fontWeight: '800' }}>
                                                        −€{formatCurrency(p.discountAmount)}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            );
                        })()}

                        {/* Divider */}
                        <View style={{
                            borderTopWidth: 1,
                            borderTopColor: theme.colors.border,
                            borderStyle: 'dashed',
                            marginVertical: 6,
                        }} />

                        {/* Total */}
                        <View style={{ paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 17, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 }}>
                                {t.common.total}
                            </Text>
                            <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.primary, letterSpacing: -0.5 }}>
                                €{formatCurrency(order.totalPrice)}
                            </Text>
                        </View>

                        {/* Payment method */}
                        {(order as any).paymentCollection && (
                            <View style={{
                                marginTop: 12,
                                paddingTop: 12,
                                borderTopWidth: 1,
                                borderTopColor: theme.colors.border + '60',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                            }}>
                                <Ionicons
                                    name={(order as any).paymentCollection === 'CASH_TO_DRIVER' ? 'cash-outline' : 'card-outline'}
                                    size={15}
                                    color={theme.colors.subtext}
                                />
                                <Text style={{ fontSize: 13, color: theme.colors.subtext, fontWeight: '500' }}>
                                    {(order as any).paymentCollection === 'CASH_TO_DRIVER' ? 'Cash on delivery' : 'Paid online'}
                                </Text>
                            </View>
                        )}
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
                                    {t.orders.details.delivery_address}
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
            <Text style={{ color: '#555', marginTop: 8, fontSize: 14 }}>{t.orders.details.map_unavailable}</Text>
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
                                zoomLevel: CAMERA_INTRO_ZOOM,
                            }}
                        />



                        {/* Business marker (always visible while order is active) */}
                        {pickupLocation && typeof pickupLocation.latitude === 'number' && typeof pickupLocation.longitude === 'number' && (
                            <MapLibreGL.MarkerView
                                id="pickup-marker"
                                coordinate={[pickupLocation.longitude, pickupLocation.latitude]}
                                anchor={{ x: 0.5, y: 1 }}
                            >
                                <BusinessMarker active={isPreparingAnimationPhase} scale={markerScale} imageUrl={orderBusinesses[0]?.business?.imageUrl} />
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
                        <View style={{
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
                        </View>

                        {/* ── Pending approval / timeline (smooth transition) ───────────────── */}
                        <View style={{ marginBottom: 16 }}>
                            {isPendingApproval ? (
                                <View
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
                                                {isMarket ? t.orders.status_messages_market.pending : t.orders.status_messages.pending}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View>
                                    <IconStepper status={customerVisibleStatus} color={config.color} theme={theme} t={t} businessType={primaryBusinessType} />
                                </View>
                            )}
                        </View>

                        {/* ── Cancellation Notice (phone-only) ──────────────────── */}
                        <View style={{
                            backgroundColor: '#F59E0B14',
                            borderRadius: 16,
                            padding: 14,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: '#F59E0B33',
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                <Ionicons name="information-circle" size={18} color="#B45309" style={{ marginTop: 1, marginRight: 8 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
                                        {t.orders.details.cancel_order_phone_only}
                                    </Text>
                                    <TouchableOpacity onPress={handleCallForCancellation} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="call" size={14} color="#B45309" />
                                        <Text style={{ color: '#B45309', fontSize: 13, fontWeight: '800', marginLeft: 6 }}>
                                            {cancellationPhone}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* ── Driver Card ──────────────────── */}
                        {(isDeliveryPhase || (driver && (status === 'READY' || isCompleted))) && (
                            <View style={{
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
                            </View>
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
                                {showSummary ? `▲ ${t.orders.details.hide_order_summary}` : `▼ ${t.orders.details.show_order_summary}`}
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
                                                    €{formatCurrency(Number(item.unitPrice) * Number(item.quantity))}
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
                                    {/* Promo rows inside active summary */}
                                    {((order as any).orderPromotions ?? []).map((p: any, i: number) => {
                                        const isFreeDelivery = p.appliesTo === 'DELIVERY' && p.discountAmount > 0;
                                        const label = isFreeDelivery ? 'Free delivery' : 'Discount';
                                        return (
                                            <View key={p.id ?? i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <Ionicons name="pricetag-outline" size={11} color="#22C55E" />
                                                    <Text style={{ color: '#22C55E', fontSize: 12, fontWeight: '700' }}>
                                                        {p.promoCode ? `${p.promoCode} · ` : ''}{label}
                                                    </Text>
                                                </View>
                                                <Text style={{ color: '#22C55E', fontSize: 12, fontWeight: '700' }}>−€{formatCurrency(p.discountAmount)}</Text>
                                            </View>
                                        );
                                    })}
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
