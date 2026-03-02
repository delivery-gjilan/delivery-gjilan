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
import { useQuery } from '@apollo/client/react';
import { GET_ORDER_DRIVER } from '@/graphql/operations/orders';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCartActions } from '@/modules/cart';
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
import { fetchRoute } from '@/utils/route';
import MapView, { Marker, Polyline, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Map Style ──────────────────────────────────────────────
const minimalistMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
    { featureType: 'road.highway', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road.local', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
    { featureType: 'water', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
];

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
    OUT_FOR_DELIVERY: { color: '#8B5CF6', bgColor: '#EDE9FE', textColor: '#5B21B6', icon: 'bicycle' },
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

// ─── Pulsing Marker ─────────────────────────────────────────
const PulsingMarker = ({ color, icon, label }: {
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
    label?: string;
}) => {
    const pulse = useSharedValue(1);

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1, true
        );
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        opacity: 2 - pulse.value,
    }) as any);

    return (
        <View style={{ alignItems: 'center' }}>
            {label && (
                <View style={{
                    backgroundColor: color, borderRadius: 12,
                    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4,
                }}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }} numberOfLines={1}>{label}</Text>
                </View>
            )}
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View style={[pulseStyle, {
                    position: 'absolute', width: 60, height: 60, borderRadius: 30,
                    backgroundColor: color + '25',
                }]} />
                <View style={{
                    width: 44, height: 44, borderRadius: 22, backgroundColor: color,
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: color, shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
                }}>
                    <Ionicons name={icon} size={22} color="white" />
                </View>
            </View>
        </View>
    );
};

// ─── Driver Marker ──────────────────────────────────────────
const DriverMarker = ({ imageUrl }: { imageUrl?: string | null }) => {
    const bob = useSharedValue(0);

    useEffect(() => {
        bob.value = withRepeat(
            withSequence(
                withTiming(-4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) })
            ),
            -1, true
        );
    }, []);

    const bobStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: bob.value }],
    }) as any);

    return (
        <Animated.View style={bobStyle}>
            <View style={{
                width: 48, height: 48, borderRadius: 24, backgroundColor: '#8B5CF6',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 3, borderColor: 'white',
                shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3, shadowRadius: 6, elevation: 8, overflow: 'hidden',
            }}>
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={{ width: 42, height: 42, borderRadius: 21 }} />
                ) : (
                    <Ionicons name="car" size={22} color="white" />
                )}
            </View>
            <View style={{
                width: 0, height: 0,
                borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 8,
                borderLeftColor: 'transparent', borderRightColor: 'transparent',
                borderTopColor: 'white', alignSelf: 'center', marginTop: -1,
            }} />
        </Animated.View>
    );
};

// ─── Dropoff Marker ─────────────────────────────────────────
const DropoffMarker = () => (
    <View style={{
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#EF4444',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: 'white',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
    }}>
        <Ionicons name="location" size={18} color="white" />
    </View>
);

// ─── Horizontal Status Stepper ──────────────────────────────
const StatusStepper = ({ status, color, t }: {
    status: string;
    color: string;
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
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            {STATUS_ORDER.map((step, index) => {
                const isCompleted = !isCancelled && index < currentIndex;
                const isActive = !isCancelled && index === currentIndex;
                const stepColor = isCompleted ? '#22C55E' : isActive ? color : '#D1D5DB';
                const iconName = STATUS_STEP_ICONS[step];
                const isLast = index === STATUS_ORDER.length - 1;

                return (
                    <View key={step} style={{ flex: 1, alignItems: 'center' }}>
                        {/* Connector + Circle row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                            {/* Left connector line */}
                            {index > 0 && (
                                <View style={{
                                    flex: 1, height: 2,
                                    backgroundColor: isCompleted || isActive ? stepColor : '#E5E7EB',
                                }} />
                            )}
                            {index === 0 && <View style={{ flex: 1 }} />}

                            {/* Circle */}
                            <View style={{
                                width: isActive ? 32 : 26,
                                height: isActive ? 32 : 26,
                                borderRadius: isActive ? 16 : 13,
                                backgroundColor: isCompleted ? '#22C55E' : isActive ? color : '#F3F4F6',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: isActive ? 3 : isCompleted ? 0 : 2,
                                borderColor: isActive ? color + '30' : '#E5E7EB',
                            }}>
                                {isCompleted ? (
                                    <Ionicons name="checkmark" size={14} color="white" />
                                ) : (
                                    <Ionicons
                                        name={iconName}
                                        size={isActive ? 16 : 12}
                                        color={isActive ? 'white' : '#9CA3AF'}
                                    />
                                )}
                            </View>

                            {/* Right connector line */}
                            {!isLast && (
                                <View style={{
                                    flex: 1, height: 2,
                                    backgroundColor: isCompleted ? '#22C55E' : '#E5E7EB',
                                }} />
                            )}
                            {isLast && <View style={{ flex: 1 }} />}
                        </View>

                        {/* Label */}
                        <Text
                            style={{
                                fontSize: 9,
                                fontWeight: isActive ? '700' : '500',
                                color: isActive ? color : isCompleted ? '#22C55E' : '#9CA3AF',
                                marginTop: 4,
                                textAlign: 'center',
                            }}
                            numberOfLines={1}
                        >
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
    const mapRef = useRef<MapView>(null);
    const prevStatusRef = useRef<string | null>(null);
    const { clearCart } = useCartActions();
    const [hasFittedMap, setHasFittedMap] = useState(false);

    // Route polyline from Mapbox Directions API (cached)
    const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
    const [routeDuration, setRouteDuration] = useState<number | null>(null);

    // ─── Driver Data (polled) ───────────────────────────────
    const { data: driverData } = useQuery(GET_ORDER_DRIVER, {
        variables: { id: order?.id ?? '' },
        skip: !order?.id,
        fetchPolicy: 'cache-and-network',
        pollInterval:
            order?.status === 'OUT_FOR_DELIVERY' ? 5000
            : (order?.status === 'PREPARING' || order?.status === 'READY') ? 15000
            : 0,
    });

    const driver = driverData?.order?.driver ?? (order as any)?.driver ?? null;
    const driverName = driver?.firstName ? `${driver.firstName} ${driver?.lastName || ''}`.trim() : null;
    const driverPhone = driver?.phoneNumber || '+383 44 123 456';
    const driverImageUrl = driver?.imageUrl || null;
    const driverLocation = driver?.driverLocation ?? null;

    // ─── Locations ──────────────────────────────────────────
    const pickupLocation = useMemo(() => {
        if (order?.pickupLocations?.length) return order.pickupLocations[0];
        if (order?.businesses?.[0]?.business?.location) return order.businesses[0].business.location;
        return null;
    }, [order?.pickupLocations, order?.businesses]);

    const dropoffLocation = useMemo(() => order?.dropOffLocation ?? null, [order?.dropOffLocation]);

    // ─── Status ─────────────────────────────────────────────
    const status = order?.status ?? 'PENDING';
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
    const statusMessage = (t.orders.status_messages as any)?.[status.toLowerCase()] || '';
    const isDeliveryPhase = status === 'OUT_FOR_DELIVERY';
    const isCompleted = status === 'DELIVERED';
    const isCancelled = status === 'CANCELLED';
    const businessName = order?.businesses?.[0]?.business?.name || '';

    // ─── Fetch Route Polyline ───────────────────────────────
    useEffect(() => {
        const from = isDeliveryPhase && driverLocation ? driverLocation : pickupLocation;
        const to = dropoffLocation;
        if (!from || !to) return;

        let cancelled = false;
        fetchRoute(
            { latitude: from.latitude, longitude: from.longitude },
            { latitude: to.latitude, longitude: to.longitude }
        ).then((result) => {
            if (cancelled || !result) return;
            setRouteCoords(result.coordinates);
            setRouteDuration(result.durationMin);
        });

        return () => { cancelled = true; };
    }, [
        pickupLocation?.latitude, pickupLocation?.longitude,
        dropoffLocation?.latitude, dropoffLocation?.longitude,
        driverLocation?.latitude, driverLocation?.longitude,
        isDeliveryPhase,
    ]);

    // ─── ETA (prefer route-based, fallback to haversine) ────
    const deliveryEta = useMemo(() => {
        // Route-based ETA from Mapbox (road distance)
        if (routeDuration !== null) {
            const prepMin = (status === 'PENDING' || status === 'PREPARING')
                ? (order?.preparationMinutes ?? 0) : 0;
            return Math.max(1, Math.ceil(routeDuration + prepMin));
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
    }, [status, routeDuration, driverLocation, dropoffLocation, pickupLocation, order?.preparationMinutes]);

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

    // ─── Detect Delivered → Redirect ────────────────────────
    useEffect(() => {
        if (order && prevStatusRef.current !== null && prevStatusRef.current !== 'DELIVERED' && order.status === 'DELIVERED') {
            clearCart();
            router.replace('/(tabs)/home');
            setTimeout(() => {
                Alert.alert(
                    t.orders.details.order_delivered,
                    t.orders.details.order_delivered_message,
                    [{ text: t.common.ok }]
                );
            }, 300);
        }
        if (order) prevStatusRef.current = order.status ?? null;
    }, [order?.status]);

    // ─── Map Fitting ────────────────────────────────────────
    const fitMapToMarkers = useCallback(() => {
        if (!mapRef.current) return;
        const coords: { latitude: number; longitude: number }[] = [];

        if (isDeliveryPhase && driverLocation) {
            coords.push({ latitude: driverLocation.latitude, longitude: driverLocation.longitude });
        }
        if (pickupLocation && !isDeliveryPhase) {
            coords.push({ latitude: pickupLocation.latitude, longitude: pickupLocation.longitude });
        }
        if (dropoffLocation) {
            coords.push({ latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude });
        }
        if (coords.length === 0) return;

        if (coords.length === 1) {
            mapRef.current.animateToRegion({ ...coords[0], latitudeDelta: 0.008, longitudeDelta: 0.008 }, 800);
        } else {
            mapRef.current.fitToCoordinates(coords, {
                edgePadding: { top: 100, right: 60, bottom: SCREEN_HEIGHT * 0.48, left: 60 },
                animated: true,
            });
        }
    }, [pickupLocation, dropoffLocation, driverLocation, isDeliveryPhase]);

    // Initial fit
    useEffect(() => {
        if (hasFittedMap) return;
        if (pickupLocation || dropoffLocation) {
            setTimeout(() => { fitMapToMarkers(); setHasFittedMap(true); }, 600);
        }
    }, [pickupLocation, dropoffLocation, hasFittedMap]);

    // Refit when delivery starts
    useEffect(() => {
        if (isDeliveryPhase && driverLocation) fitMapToMarkers();
    }, [isDeliveryPhase]);

    // ─── Handlers ───────────────────────────────────────────
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
    const defaultRegion: Region = {
        latitude: pickupLocation?.latitude ?? dropoffLocation?.latitude ?? 42.4629,
        longitude: pickupLocation?.longitude ?? dropoffLocation?.longitude ?? 21.4694,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
    };

    // ─── Marker label ───────────────────────────────────────
    const getMarkerLabel = (): string | undefined => {
        switch (status) {
            case 'PENDING': return t.orders.details.waiting_restaurant;
            case 'PREPARING': return t.orders.details.preparing_your_order;
            case 'READY': return t.orders.details.ready_for_pickup;
            default: return undefined;
        }
    };

    const totalItems = order.businesses?.reduce((sum, b) => sum + b.items.length, 0) ?? 0;

    // ─── Toggle order summary ───────────────────────────────
    const [showSummary, setShowSummary] = useState(false);
    const handleToggleSummary = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowSummary(prev => !prev);
    };

    // ═════════════════════════════════════════════════════════
    // ─── Render ─────────────────────────────────────────────
    // ═════════════════════════════════════════════════════════

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>

                {/* ═══ Map (fills remaining space above bottom panel) ═══ */}
                <View style={{ flex: 1 }}>
                    <MapView
                        ref={mapRef}
                        style={{ flex: 1 }}
                        provider={PROVIDER_GOOGLE}
                        initialRegion={defaultRegion}
                        customMapStyle={minimalistMapStyle}
                        showsUserLocation={false}
                        showsMyLocationButton={false}
                        showsCompass={false}
                        toolbarEnabled={false}
                        pitchEnabled={false}
                        rotateEnabled={false}
                    >
                        {/* Restaurant marker — prominent when not delivering */}
                        {pickupLocation && !isDeliveryPhase && (
                            <Marker
                                coordinate={{ latitude: pickupLocation.latitude, longitude: pickupLocation.longitude }}
                                anchor={{ x: 0.5, y: 0.85 }}
                            >
                                <PulsingMarker color={config.color} icon={config.icon} label={getMarkerLabel()} />
                            </Marker>
                        )}

                        {/* Restaurant marker — small during delivery */}
                        {pickupLocation && isDeliveryPhase && (
                            <Marker
                                coordinate={{ latitude: pickupLocation.latitude, longitude: pickupLocation.longitude }}
                                anchor={{ x: 0.5, y: 0.5 }}
                            >
                                <View style={{
                                    width: 28, height: 28, borderRadius: 14, backgroundColor: '#3B82F6',
                                    alignItems: 'center', justifyContent: 'center',
                                    borderWidth: 2, borderColor: 'white',
                                }}>
                                    <Ionicons name="restaurant" size={14} color="white" />
                                </View>
                            </Marker>
                        )}

                        {/* Dropoff marker */}
                        {dropoffLocation && (
                            <Marker
                                coordinate={{ latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude }}
                                anchor={{ x: 0.5, y: 0.5 }}
                            >
                                <DropoffMarker />
                            </Marker>
                        )}

                        {/* Driver marker — live position */}
                        {isDeliveryPhase && driverLocation && (
                            <Marker
                                coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }}
                                anchor={{ x: 0.5, y: 0.9 }}
                            >
                                <DriverMarker imageUrl={driverImageUrl} />
                            </Marker>
                        )}

                        {/* Route polyline (road-following from Mapbox) */}
                        {routeCoords.length >= 2 && (
                            <>
                                {/* Casing (white outline) */}
                                <Polyline
                                    coordinates={routeCoords}
                                    strokeColor="white"
                                    strokeWidth={7}
                                    geodesic
                                />
                                {/* Fill */}
                                <Polyline
                                    coordinates={routeCoords}
                                    strokeColor={isDeliveryPhase ? '#8B5CF6' : config.color}
                                    strokeWidth={4}
                                    geodesic
                                />
                            </>
                        )}
                    </MapView>

                    {/* ═══ Top Bar Overlay ═══════════════════ */}
                    <View style={{
                        position: 'absolute', top: insets.top + 8, left: 16, right: 16,
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <TouchableOpacity onPress={() => router.back()} style={topBtnStyle}>
                            <Ionicons name="chevron-back" size={22} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={fitMapToMarkers} style={topBtnStyle}>
                            <Ionicons name="locate" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ═══ Fixed Bottom Panel ══════════════════ */}
                <View style={{
                    backgroundColor: theme.colors.card,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 12,
                    paddingTop: 16,
                    paddingBottom: insets.bottom + 12,
                    paddingHorizontal: 20,
                }}>
                    {/* Handle indicator (visual only) */}
                    <View style={{
                        width: 40, height: 4, borderRadius: 2,
                        backgroundColor: theme.colors.border,
                        alignSelf: 'center', marginBottom: 14,
                    }} />

                    {/* ── Horizontal Status Stepper ────── */}
                    <StatusStepper status={status} color={config.color} t={t} />

                    {/* ── Status Info Row ──────────────── */}
                    <Animated.View entering={FadeIn.duration(300)} style={{ marginTop: 16 }}>
                        {/* Order ID + Status message */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                                {statusMessage}
                            </Text>
                            <Text style={{ color: theme.colors.subtext, fontSize: 12, fontWeight: '600', marginLeft: 8 }}>
                                #{order.displayId || order.id?.slice(0, 8)}
                            </Text>
                        </View>

                        {/* ETA + Elapsed */}
                        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 14 }}>
                            {deliveryEta !== null && !isCompleted && !isCancelled && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="time-outline" size={15} color={config.color} />
                                    <Text style={{ color: theme.colors.subtext, fontSize: 13 }}>
                                        {t.orders.details.arriving_in}{' '}
                                        <Text style={{ fontWeight: '700', color: config.color }}>
                                            ~{deliveryEta} {t.orders.details.min_short}
                                        </Text>
                                    </Text>
                                </View>
                            )}
                            {elapsedMin !== null && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="hourglass-outline" size={13} color={theme.colors.subtext} />
                                    <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>
                                        {t.orders.details.elapsed}: {elapsedMin} {t.orders.details.min_short}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>

                    {/* ── Driver Card ──────────────────── */}
                    {(isDeliveryPhase || (driver && (status === 'READY' || isCompleted))) && (
                        <Animated.View entering={FadeInDown.duration(300).delay(50)} style={{
                            backgroundColor: theme.colors.background,
                            borderRadius: 14, padding: 14, marginBottom: 14,
                            flexDirection: 'row', alignItems: 'center',
                        }}>
                            {/* Avatar */}
                            <View style={{
                                width: 46, height: 46, borderRadius: 23,
                                backgroundColor: config.color + '15',
                                alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden', marginRight: 12,
                            }}>
                                {driverImageUrl ? (
                                    <Image source={{ uri: driverImageUrl }} style={{ width: 46, height: 46, borderRadius: 23 }} />
                                ) : (
                                    <Ionicons name="person" size={22} color={config.color} />
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
                                width: 40, height: 40, borderRadius: 20,
                                backgroundColor: '#22C55E',
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Ionicons name="call" size={18} color="white" />
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* ── Order Summary Toggle ────────── */}
                    <TouchableOpacity
                        onPress={handleToggleSummary}
                        activeOpacity={0.7}
                        style={{
                            backgroundColor: theme.colors.background,
                            borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            borderBottomLeftRadius: showSummary ? 0 : 14,
                            borderBottomRightRadius: showSummary ? 0 : 14,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Ionicons name="receipt-outline" size={18} color={theme.colors.text} />
                            <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>
                                {t.orders.details.order_summary}
                            </Text>
                            <View style={{
                                backgroundColor: config.color + '15',
                                borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
                            }}>
                                <Text style={{ color: config.color, fontSize: 12, fontWeight: '700' }}>
                                    €{order.totalPrice?.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                        <Ionicons
                            name={showSummary ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={theme.colors.subtext}
                        />
                    </TouchableOpacity>

                    {/* ── Expanded Order Items ────────── */}
                    {showSummary && (
                        <View style={{
                            backgroundColor: theme.colors.background,
                            borderBottomLeftRadius: 14,
                            borderBottomRightRadius: 14,
                            paddingHorizontal: 16,
                            paddingBottom: 14,
                        }}>
                            <View style={{ height: 1, backgroundColor: theme.colors.border + '40', marginBottom: 8 }} />
                            <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                                {order.businesses?.map((biz) =>
                                    biz.items.map((item, idx) => (
                                        <View key={`${item.productId}-${idx}`} style={{
                                            flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
                                            borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: theme.colors.border + '25',
                                        }}>
                                            <View style={{
                                                width: 24, height: 24, borderRadius: 6,
                                                backgroundColor: theme.colors.primary + '10',
                                                alignItems: 'center', justifyContent: 'center',
                                                marginRight: 8, overflow: 'hidden',
                                            }}>
                                                {item.imageUrl ? (
                                                    <Image source={{ uri: item.imageUrl }} style={{ width: 24, height: 24, borderRadius: 6 }} />
                                                ) : (
                                                    <Ionicons name="fast-food-outline" size={12} color={theme.colors.primary} />
                                                )}
                                            </View>
                                            <Text style={{ flex: 1, color: theme.colors.text, fontSize: 12 }} numberOfLines={1}>
                                                {item.quantity}x {item.name}
                                            </Text>
                                            <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '600' }}>
                                                €{(item.price * item.quantity).toFixed(2)}
                                            </Text>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                            <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 6, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '700' }}>{t.common.total}</Text>
                                <Text style={{ color: config.color, fontSize: 14, fontWeight: '700' }}>
                                    €{order.totalPrice?.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </GestureHandlerRootView>
    );
};

// ─── Shared Styles ──────────────────────────────────────────
const topBtnStyle = {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#8B5CF6',
    alignItems: 'center' as const, justifyContent: 'center' as const,
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
};
