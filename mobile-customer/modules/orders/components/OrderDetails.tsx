import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Linking, Dimensions, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { Order } from '@/gql/graphql';
import { Image } from 'expo-image';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import { GET_ORDER_DRIVER } from '@/graphql/operations/orders';
import { ORDER_DRIVER_LIVE_TRACKING } from '@/graphql/operations/orders/subscriptions';
import { UPDATE_ORDER_STATUS } from '@/graphql/operations/orders/mutations';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCartActions } from '@/modules/cart';
import { useSuccessModalStore } from '@/store/useSuccessModalStore';
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
} from 'react-native-reanimated';
import { calculateHaversineDistance } from '@/utils/haversine';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { useLiveActivity } from '@/hooks/useLiveActivity';

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

const LIVE_DRIVER_ETA_TTL_MS = 20_000;
const DRIVER_INTERPOLATION_TICK_MS = 66;
const DRIVER_INTERPOLATION_MIN_MS = 350;
const DRIVER_INTERPOLATION_MAX_MS = 8_000;
const DRIVER_INTERPOLATION_RATIO = 0.9;
const DRIVER_POSITION_EPSILON = 0.00001;
const DRIVER_TELEPORT_GUARD_KM = 0.8;
const DELIVERY_CAMERA_REFIT_MIN_INTERVAL_MS = 3500;
const DELIVERY_CAMERA_REFIT_MIN_MOVE_KM = 0.08;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

// ─── Status Config ──────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
    color: string;
    bgColor: string;
    textColor: string;
    icon: keyof typeof Ionicons.glyphMap;
}> = {
    PENDING: { color: '#F59E0B', bgColor: '#FEF3C7', textColor: '#92400E', icon: 'time' },
    PREPARING: { color: '#3B82F6', bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'restaurant' },
    READY: { color: '#10B981', bgColor: '#D1FAE5', textColor: '#065F46', icon: 'checkmark-circle' },
    OUT_FOR_DELIVERY: { color: '#22C55E', bgColor: '#DCFCE7', textColor: '#166534', icon: 'bicycle' },
    DELIVERED: { color: '#22C55E', bgColor: '#DCFCE7', textColor: '#166534', icon: 'checkmark-done-circle' },
    CANCELLED: { color: '#EF4444', bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'close-circle' },
};

// ─── Status Steps ───────────────────────────────────────────
const STATUS_ORDER = ['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;

const STATUS_STEP_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    PENDING: 'time',
    PREPARING: 'restaurant',
    READY: 'checkmark-circle',
    OUT_FOR_DELIVERY: 'bicycle',
    DELIVERED: 'checkmark-done-circle',
};

// ─── Pin Markers ────────────────────────────────────────────
// Purple pin for business & driver (matches app theme)
const PurplePin = ({ icon, size = 28, rotationDeg = 0 }: { icon: keyof typeof Ionicons.glyphMap; size?: number; rotationDeg?: number }) => (
    <View style={{ alignItems: 'center' }}>
        <View style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: '#7C3AED',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4, shadowRadius: 6, elevation: 5,
        }}>
            <View style={{ transform: [{ rotate: `${rotationDeg}deg` }] }}>
                <Ionicons name={icon} size={size * 0.45} color="white" />
            </View>
        </View>
        <View style={{ width: 2, height: 8, backgroundColor: '#7C3AED', marginTop: -1 }} />
        <View style={{ width: 8, height: 3, borderRadius: 4, backgroundColor: '#00000020', marginTop: 1 }} />
    </View>
);

// Standard location pin for user's dropoff address
const LocationPin = () => (
    <View style={{ alignItems: 'center' }}>
        <View style={{
            width: 24, height: 24, borderRadius: 12,
            backgroundColor: '#EF4444',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
            borderWidth: 2, borderColor: 'white',
        }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'white' }} />
        </View>
        <View style={{ width: 2, height: 8, backgroundColor: '#EF4444', marginTop: -1 }} />
        <View style={{ width: 8, height: 3, borderRadius: 4, backgroundColor: '#00000020', marginTop: 1 }} />
    </View>
);

const PreparingBusinessMarker = ({ active }: { active: boolean }) => {
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
                        width: 62,
                        height: 62,
                        borderRadius: 31,
                        backgroundColor: '#7C3AED',
                    },
                    pulseAnimatedStyle,
                ]}
            />
            <PurplePin icon="restaurant" size={28} />
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
    const currentIndex = STATUS_ORDER.indexOf(status as typeof STATUS_ORDER[number]);
    const isCancelled = status === 'CANCELLED';

    const stepLabels: Record<string, string> = {
        PENDING: t.orders.details.placed_at,
        PREPARING: t.orders.details.preparing_at,
        READY: t.orders.details.ready_at,
        OUT_FOR_DELIVERY: t.orders.details.picked_up_at,
        DELIVERED: t.orders.details.delivered_at,
    };

    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            {STATUS_ORDER.map((step, index) => {
                const done = !isCancelled && index < currentIndex;
                const active = !isCancelled && index === currentIndex;
                const upcoming = !done && !active;
                const iconName = STATUS_STEP_ICONS[step];
                const isLast = index === STATUS_ORDER.length - 1;

                const iconColor = done ? '#22C55E' : active ? color : (th.dark ? '#3f3f46' : '#D1D5DB');
                const lineColor = done ? '#22C55E' : (th.dark ? '#27272A' : '#E5E7EB');

                return (
                    <View key={step} style={{ flex: 1, alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                            {index > 0 && (
                                <View style={{ flex: 1, height: 2, backgroundColor: lineColor }} />
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
                                <View style={{ flex: 1, height: 2, backgroundColor: done ? '#22C55E' : lineColor }} />
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
    const prevStatusRef = useRef<string | null>(null);
    const { clearCart } = useCartActions();
    const { showSuccess } = useSuccessModalStore();
    const [hasFittedMap, setHasFittedMap] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const token = useAuthStore((state) => state.token);
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
    const lastDeliveryCameraFitAtRef = useRef<number>(0);
    const lastDeliveryCameraFitDriverRef = useRef<{ latitude: number; longitude: number } | null>(null);

    const [liveDriverTracking, setLiveDriverTracking] = useState<{
        orderId: string;
        driverId: string;
        latitude: number;
        longitude: number;
        navigationPhase?: string | null;
        remainingEtaSeconds?: number | null;
        etaUpdatedAt: string;
    } | null>(null);

    // ─── Driver Data (initial/fallback query; live movement comes from subscription) ───────────────────────────────
    const { data: driverData } = useQuery(GET_ORDER_DRIVER, {
        variables: { id: order?.id ?? '' },
        skip: !order?.id,
        fetchPolicy: 'cache-and-network',
    });

    const status = order?.status ?? 'PENDING';
    const isDeliveryPhase = status === 'OUT_FOR_DELIVERY';
    const isPreparingAnimationPhase = status === 'PENDING' || status === 'PREPARING';

    const stopDriverInterpolation = useCallback(() => {
        if (interpolationTimerRef.current) {
            clearInterval(interpolationTimerRef.current);
            interpolationTimerRef.current = null;
        }
    }, []);

    useSubscription(ORDER_DRIVER_LIVE_TRACKING, {
        variables: { orderId: order?.id ?? '', input: { token: token || '' } },
        skip: !order?.id || !token || !isDeliveryPhase,
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
    const driverName = driver?.firstName ? `${driver.firstName} ${driver?.lastName || ''}`.trim() : null;
    const driverPhone = driver?.phoneNumber || '+383 44 123 456';
    const driverImageUrl = driver?.imageUrl || null;
    const queriedDriverLocation = driver?.driverLocation ?? null;
    const liveDriverRawLocation =
        liveDriverTracking?.orderId === order?.id
            ? {
                  latitude: liveDriverTracking.latitude,
                  longitude: liveDriverTracking.longitude,
                  address: queriedDriverLocation?.address ?? '',
              }
            : null;

    useEffect(() => {
        if (!isDeliveryPhase || !liveDriverRawLocation) return;

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

        const target = liveDriverRawLocation;
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
        liveDriverRawLocation?.latitude,
        liveDriverRawLocation?.longitude,
        liveDriverRawLocation?.address,
        interpolatedDriverLocation,
        queriedDriverLocation,
        stopDriverInterpolation,
    ]);

    const driverLocation =
        liveDriverRawLocation
            ? interpolatedDriverLocation ?? liveDriverRawLocation
            : queriedDriverLocation;
    const liveDriverConnection =
        liveDriverTracking?.orderId === order?.id
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
        if (order?.businesses?.[0]?.business?.location) return order.businesses[0].business.location;
        return null;
    }, [order?.pickupLocations, order?.businesses]);

    const dropoffLocation = useMemo(() => order?.dropOffLocation ?? null, [order?.dropOffLocation]);

    // ─── Status ─────────────────────────────────────────────
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
    const statusMessage = (t.orders.status_messages as any)?.[status.toLowerCase()] || '';
    const isCompleted = status === 'DELIVERED';
    const isCancelled = status === 'CANCELLED';
    const businessName = order?.businesses?.[0]?.business?.name || '';

    // ─── ETA (prefer live heartbeat ETA, fallback to haversine) ────
    const deliveryEta = useMemo(() => {
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
        if (isDeliveryPhase && driverLocation && dropoffLocation) {
            const dist = calculateHaversineDistance(
                driverLocation.latitude, driverLocation.longitude,
                dropoffLocation.latitude, dropoffLocation.longitude
            );
            return Math.max(1, Math.ceil(dist * 2.5));
        }
        if (pickupLocation && dropoffLocation) {
            const dist = calculateHaversineDistance(
                pickupLocation.latitude, pickupLocation.longitude,
                dropoffLocation.latitude, dropoffLocation.longitude
            );
            const driveMin = Math.max(3, Math.ceil(dist * 2.5));
            const prepMin = order?.preparationMinutes ?? 0;
            if (status === 'PENDING' || status === 'PREPARING') return driveMin + prepMin;
            return driveMin;
        }
        return null;
    }, [
        liveDriverConnection?.activeOrderId,
        liveDriverConnection?.etaUpdatedAt,
        liveDriverConnection?.remainingEtaSeconds,
        order?.id,
        status,
        driverLocation,
        dropoffLocation,
        pickupLocation,
        order?.preparationMinutes,
    ]);

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
    const { startLiveActivity, updateLiveActivity, endLiveActivity } = useLiveActivity({
        orderId: order?.id ?? '',
        orderDisplayId: order?.displayId ?? '',
        businessName: businessName,
        enabled: !!(order?.id && (status === 'OUT_FOR_DELIVERY' || status === 'PREPARING' || status === 'READY')),
    });

    // Start Live Activity when order goes OUT_FOR_DELIVERY
    useEffect(() => {
        if (status === 'OUT_FOR_DELIVERY' && driverName && deliveryEta !== null) {
            console.log('[OrderDetails] Starting Live Activity for OUT_FOR_DELIVERY');
            startLiveActivity({
                driverName: driverName,
                estimatedMinutes: deliveryEta,
                status: 'out_for_delivery',
            });
        }
    }, [status, driverName, deliveryEta, startLiveActivity]);

    // Update Live Activity when ETA or driver changes
    useEffect(() => {
        if ((status === 'OUT_FOR_DELIVERY' || status === 'PREPARING' || status === 'READY') && driverName && deliveryEta !== null) {
            const liveStatus = status === 'OUT_FOR_DELIVERY' ? 'out_for_delivery' 
                : status === 'READY' ? 'ready' 
                : 'preparing';
            
            updateLiveActivity({
                driverName: driverName,
                estimatedMinutes: deliveryEta,
                status: liveStatus,
            });
        }
    }, [deliveryEta, driverName, status, updateLiveActivity]);

    // End Live Activity when delivered or cancelled
    useEffect(() => {
        if (isCompleted || isCancelled) {
            console.log('[OrderDetails] Ending Live Activity (order completed/cancelled)');
            endLiveActivity();
        }
    }, [isCompleted, isCancelled, endLiveActivity]);

    // ─── Detect Delivered → Show Success Modal ────────────────────────
    useEffect(() => {
        if (order && prevStatusRef.current !== null && prevStatusRef.current !== 'DELIVERED' && order.status === 'DELIVERED') {
            const orderId = order.id;
            console.log('[OrderDetails] Order delivered, showing success modal:', orderId);
            
            // Clear cart and show success modal
            clearCart();
            showSuccess(orderId, 'order_delivered');
            
            // Navigate home after a brief delay
            setTimeout(() => {
                console.log('[OrderDetails] Navigating to home');
                router.replace('/(tabs)/home');
            }, 100);
        }
        if (order) prevStatusRef.current = order.status ?? null;
    }, [order?.status, clearCart, router, showSuccess]);

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

    useEffect(() => {
        if (!pickupLocation && !dropoffLocation) return;
        if (isDeliveryPhase && !driverLocation && !dropoffLocation) return;

        const timeout = setTimeout(() => {
            fitMapToMarkers();
        }, 180);

        return () => clearTimeout(timeout);
    }, [isDeliveryPhase, status, fitMapToMarkers, pickupLocation, dropoffLocation]);

    // Initial fit
    useEffect(() => {
        if (hasFittedMap) return;
        if (pickupLocation || dropoffLocation) {
            setTimeout(() => { fitMapToMarkers(); setHasFittedMap(true); }, 300);
        }
    }, [pickupLocation, dropoffLocation, hasFittedMap, fitMapToMarkers]);

    // Refit when delivery starts or driver moves
    useEffect(() => {
        if (!isDeliveryPhase || !driverLocation) return;

        const now = Date.now();
        const elapsed = now - lastDeliveryCameraFitAtRef.current;
        const lastDriverAtFit = lastDeliveryCameraFitDriverRef.current;
        const movedKm = lastDriverAtFit
            ? calculateHaversineDistance(
                  lastDriverAtFit.latitude,
                  lastDriverAtFit.longitude,
                  driverLocation.latitude,
                  driverLocation.longitude,
              )
            : Number.POSITIVE_INFINITY;

        const shouldRefit =
            lastDeliveryCameraFitAtRef.current === 0 ||
            elapsed >= DELIVERY_CAMERA_REFIT_MIN_INTERVAL_MS ||
            movedKm >= DELIVERY_CAMERA_REFIT_MIN_MOVE_KM;

        if (!shouldRefit) return;

        fitMapToMarkers();
        lastDeliveryCameraFitAtRef.current = now;
        lastDeliveryCameraFitDriverRef.current = {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
        };
    }, [isDeliveryPhase, driverLocation?.latitude, driverLocation?.longitude]);

    // ─── Handlers ───────────────────────────────────────────
    const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS);

    const handleMarkAsDelivered = async () => {
        Alert.alert(
            'Test: Mark as Delivered',
            'This will mark the order as delivered. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark Delivered',
                    onPress: async () => {
                        try {
                            await updateOrderStatus({
                                variables: { id: order.id, status: 'DELIVERED' as any },
                            });
                            Alert.alert('Success', 'Order marked as delivered!');
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'Failed to update order');
                        }
                    },
                },
            ]
        );
    };

    const handleCallDriver = async () => {
        if (!driverPhone) return;
        try { await Linking.openURL(`tel:${driverPhone}`); }
        catch { Alert.alert(t.orders.details.call_failed, t.orders.details.unable_open_dialer); }
    };

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

    const totalItems = order.businesses?.reduce((sum, b) => sum + b.items.length, 0) ?? 0;

    // ─── Toggle order summary ───────────────────────────────
    const handleToggleSummary = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowSummary(prev => !prev);
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
                            #{order.displayId || order.id?.slice(-8).toUpperCase() || 'N/A'}
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

                        {order.businesses?.map((biz, bizIdx) => (
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
                                            {biz.business.name}
                                        </Text>
                                    </View>
                                </View>

                                {biz.items.map((item, itemIdx) => (
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
                                                {item.quantity} × €{item.price.toFixed(2)}
                                            </Text>
                                            {item.notes && (
                                                <View style={{
                                                    marginTop: 6,
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
                                            €{(item.price * item.quantity).toFixed(2)}
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
                                €{order.orderPrice?.toFixed(2)}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, paddingLeft: 24 }}>
                            <Text style={{ fontSize: 14, color: theme.colors.subtext, fontWeight: '500' }}>{t.common.delivery}</Text>
                            <Text style={{ fontSize: 14, color: theme.colors.text, fontWeight: '600' }}>
                                €{order.deliveryPrice?.toFixed(2)}
                            </Text>
                        </View>
                        <View style={{
                            paddingTop: 14,
                            borderTopWidth: 2,
                            borderTopColor: theme.colors.border,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <Text style={{ fontSize: 17, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 }}>
                                {t.common.total}
                            </Text>
                            <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.primary, letterSpacing: -0.5 }}>
                                €{order.totalPrice?.toFixed(2)}
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
                                {driverImageUrl ? (
                                    <Image source={{ uri: driverImageUrl }} style={{ width: 56, height: 56 }} />
                                ) : (
                                    <Ionicons name="person" size={26} color={theme.colors.primary} />
                                )}
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
                        scrollEnabled={false}
                        zoomEnabled={false}
                        pitchEnabled={false}
                        rotateEnabled={false}
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

                        {/* Business marker (pending / preparing / ready) */}
                        {!isDeliveryPhase && pickupLocation && typeof pickupLocation.latitude === 'number' && typeof pickupLocation.longitude === 'number' && (
                            <MapLibreGL.PointAnnotation
                                id="pickup-marker"
                                coordinate={[pickupLocation.longitude, pickupLocation.latitude]}
                            >
                                <PreparingBusinessMarker active={isPreparingAnimationPhase} />
                            </MapLibreGL.PointAnnotation>
                        )}

                        {/* Driver marker (delivery phase) */}
                        {isDeliveryPhase && driverLocation && typeof driverLocation.latitude === 'number' && typeof driverLocation.longitude === 'number' && (
                            <MapLibreGL.PointAnnotation
                                id="driver-marker"
                                coordinate={[driverLocation.longitude, driverLocation.latitude]}
                            >
                                <PurplePin icon="car" size={32} rotationDeg={driverHeadingDeg} />
                            </MapLibreGL.PointAnnotation>
                        )}

                        {/* User dropoff location */}
                        {isDeliveryPhase && dropoffLocation && typeof dropoffLocation.latitude === 'number' && typeof dropoffLocation.longitude === 'number' && (
                            <MapLibreGL.PointAnnotation
                                id="dropoff-marker"
                                coordinate={[dropoffLocation.longitude, dropoffLocation.latitude]}
                            >
                                <LocationPin />
                            </MapLibreGL.PointAnnotation>
                        )}
                    </MapLibreGL.MapView>
                    </MapErrorBoundary>
                ) : mapFallback}

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
                        <Animated.View entering={FadeIn.duration(400)} style={{
                            flexDirection: 'row', alignItems: 'center', marginBottom: 16,
                        }}>
                            {/* Avatar (driver or default) */}
                            <View style={{
                                width: 48, height: 48, borderRadius: 24,
                                backgroundColor: theme.dark ? '#1A1A22' : '#F3F4F6',
                                alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden', marginRight: 12,
                                borderWidth: 2, borderColor: theme.dark ? '#27272A' : '#E5E7EB',
                            }}>
                                {driverImageUrl ? (
                                    <Image source={{ uri: driverImageUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                                ) : (
                                    <Ionicons name="person-outline" size={24} color={theme.colors.subtext} />
                                )}
                            </View>

                            {/* Status text + order id */}
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }} numberOfLines={1}>
                                    {statusMessage}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 }}>
                                    <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>
                                        #{order.displayId || order.id?.slice(0, 8)}
                                    </Text>
                                    {elapsedMin !== null && (
                                        <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>
                                            · {elapsedMin} {t.orders.details.min_short}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* ETA badge */}
                            {deliveryEta !== null && !isCompleted && !isCancelled && (
                                <View style={{
                                    backgroundColor: config.color + '15',
                                    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8,
                                    alignItems: 'center',
                                }}>
                                    <Text style={{ color: config.color, fontSize: 18, fontWeight: '800', lineHeight: 20 }}>
                                        ~{deliveryEta}
                                    </Text>
                                    <Text style={{ color: config.color, fontSize: 10, fontWeight: '600', marginTop: 1 }}>
                                        {t.orders.details.min_short}
                                    </Text>
                                </View>
                            )}
                        </Animated.View>

                        {/* ── Icon stepper ───────────────── */}
                        <View style={{ marginBottom: 16 }}>
                            <IconStepper status={status} color={config.color} theme={theme} t={t} />
                        </View>

                        {/* ── Driver Card ──────────────────── */}
                        {(isDeliveryPhase || (driver && (status === 'READY' || isCompleted))) && (
                            <Animated.View entering={FadeInDown.duration(300).delay(50)} style={{
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
                                    {driverImageUrl ? (
                                        <Image source={{ uri: driverImageUrl }} style={{ width: 44, height: 44, borderRadius: 14 }} />
                                    ) : (
                                        <Ionicons name="person" size={20} color={config.color} />
                                    )}
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

                        {/* ── TEST: Mark as Delivered Button ────── */}
                        {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                            <TouchableOpacity
                                onPress={handleMarkAsDelivered}
                                activeOpacity={0.8}
                                style={{
                                    alignSelf: 'center',
                                    marginBottom: 12,
                                    backgroundColor: '#10b981',
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                }}
                            >
                                <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>
                                    🧪 TEST: Mark as Delivered
                                </Text>
                            </TouchableOpacity>
                        )}

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
                                    {order.businesses?.map((biz) =>
                                        biz.items.map((item, idx) => (
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
                                                    €{(item.price * item.quantity).toFixed(2)}
                                                </Text>
                                            </View>
                                        ))
                                    )}
                                </ScrollView>
                                <View style={{
                                    borderTopWidth: 1, borderTopColor: theme.colors.border + '30',
                                    marginTop: 8, paddingTop: 10,
                                    flexDirection: 'row', justifyContent: 'space-between',
                                }}>
                                    <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700' }}>{t.common.total}</Text>
                                    <Text style={{ color: config.color, fontSize: 15, fontWeight: '800' }}>
                                        €{order.totalPrice?.toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        )}

                    </View>
                </View>
            </View>
        </GestureHandlerRootView>
    );
};

// ─── Shared Styles ──────────────────────────────────────────

// ─── Safe Wrapper (catches ALL render errors) ───────────────
class OrderDetailsBoundary extends Component<
    { children: ReactNode; onBack: () => void },
    { hasError: boolean; error: string }
> {
    state = { hasError: false, error: '' };
    static getDerivedStateFromError(err: Error) {
        return { hasError: true, error: err?.message || 'Unknown error' };
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
